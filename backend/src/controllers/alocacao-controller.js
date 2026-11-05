import { prisma } from '../lib/prisma.js';
import { ErroHttp } from '../lib/erro-http.js';
import { lerBooleano, lerIdQuery } from '../lib/consulta.js';
import { criarCrudController, lerId } from './crud-controller.js';

const include = { professor: true, turma: true, disciplina: true };

const base = criarCrudController('alocacaoProfessorTurma', {
  campos: ['professorId', 'turmaId', 'disciplinaId'],
  include,
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

  // GET /alocacoes?turmaId=&professorId=&disciplinaId=&incluirInativos=
  // Alocações de professores inativos ficam no banco (histórico), mas só aparecem
  // com ?incluirInativos=true. O detalhe por id (GET /alocacoes/:id) continua acessível.
  async listar(req, res) {
    const where = {};
    for (const campo of ['turmaId', 'professorId', 'disciplinaId']) {
      const valor = lerIdQuery(req.query[campo], campo);
      if (valor !== undefined) where[campo] = valor;
    }
    if (!lerBooleano(req.query.incluirInativos, 'incluirInativos')) {
      where.professor = { ativo: true };
    }

    const itens = await prisma.alocacaoProfessorTurma.findMany({
      where,
      include,
      orderBy: { id: 'asc' },
    });
    return res.json(itens);
  },

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