import { prisma } from '../lib/prisma.js';
import { ErroHttp } from '../lib/erro-http.js';
import { criarCrudController, lerId } from './crud-controller.js';

const base = criarCrudController('alocacaoProfessorTurma', {
  campos: ['professorId', 'turmaId', 'disciplinaId'],
  include: { professor: true, turma: true, disciplina: true },
  filtros: ['turmaId', 'professorId', 'disciplinaId'],
  referencias: {
    professorId: ['professor', 'Professor não encontrado.'],
    turmaId: ['turma', 'Turma não encontrada.'],
    disciplinaId: ['disciplina', 'Disciplina não encontrada.'],
  },
});

async function exigirProfessorAtivo(professorId) {
  const professor = await prisma.professor.findUnique({
    where: { id: professorId },
    select: { ativo: true },
  });
  if (!professor) throw new ErroHttp(404, 'Professor não encontrado.');
  if (!professor.ativo) {
    throw new ErroHttp(409, 'Professor inativo não pode receber novas alocações.');
  }
}

export const alocacaoController = {
  ...base,

  async criar(req, res) {
    await exigirProfessorAtivo(req.body.professorId);
    return base.criar(req, res);
  },

  // Editar uma alocação também conta como alocar: vale o professor informado
  // ou, se não vier, o professor atual da alocação
  async atualizar(req, res) {
    const atual = await prisma.alocacaoProfessorTurma.findUniqueOrThrow({
      where: { id: lerId(req.params.id) },
      select: { professorId: true },
    });
    await exigirProfessorAtivo(req.body.professorId ?? atual.professorId);
    return base.atualizar(req, res);
  },
};