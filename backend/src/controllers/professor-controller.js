import { prisma } from '../lib/prisma.js';
import { ErroHttp } from '../lib/erro-http.js';
import { lerPaginacao } from '../lib/paginacao.js';
import { lerBusca, lerBooleano, lerIdQuery, listarPaginado } from '../lib/consulta.js';
import { criarCrudController, lerId } from './crud-controller.js';

const include = { disciplinaPrincipal: true };

const base = criarCrudController('professor', {
  campos: ['nome', 'email', 'especialidade', 'telefone', 'titulacao'],
  opcionais: ['disciplinaPrincipalId'],
  include,
  referencias: { disciplinaPrincipalId: ['disciplina', 'Disciplina não encontrada.'] },
});

// Disciplina inativa não pode ser definida como disciplina principal
// (null remove a disciplina principal e é sempre aceito)
async function exigirDisciplinaPrincipalAtiva(disciplinaPrincipalId) {
  if (disciplinaPrincipalId === undefined || disciplinaPrincipalId === null) return;
  const disciplina = await prisma.disciplina.findUnique({
    where: { id: disciplinaPrincipalId },
    select: { ativo: true },
  });
  if (!disciplina) throw new ErroHttp(404, 'Disciplina não encontrada.');
  if (!disciplina.ativo) {
    throw new ErroHttp(409, 'Disciplina inativa não pode ser definida como disciplina principal.');
  }
}

export const professorController = {
  ...base,

  // GET /professores?busca=&ativo=&turmaId=&disciplinaId=&disciplinaPrincipalId=&pagina=&limite=
  async listar(req, res) {
    const paginacao = lerPaginacao(req.query);
    const busca = lerBusca(req.query.busca);
    const ativo = lerBooleano(req.query.ativo, 'ativo');
    const turmaId = lerIdQuery(req.query.turmaId, 'turmaId');
    const disciplinaId = lerIdQuery(req.query.disciplinaId, 'disciplinaId');
    const disciplinaPrincipalId = lerIdQuery(req.query.disciplinaPrincipalId, 'disciplinaPrincipalId');

    const where = {};
    if (ativo !== undefined) where.ativo = ativo;
    if (disciplinaPrincipalId !== undefined) where.disciplinaPrincipalId = disciplinaPrincipalId;

    // turmaId e disciplinaId juntos valem para a mesma alocação (professor daquela disciplina naquela turma)
    const alocacao = {};
    if (turmaId !== undefined) alocacao.turmaId = turmaId;
    if (disciplinaId !== undefined) alocacao.disciplinaId = disciplinaId;
    if (Object.keys(alocacao).length > 0) where.alocacoes = { some: alocacao };

    const resposta = await listarPaginado({
      delegate: prisma.professor,
      where,
      include,
      busca,
      paginacao,
    });
    return res.json(resposta);
  },

  async criar(req, res) {
    await exigirDisciplinaPrincipalAtiva(req.body.disciplinaPrincipalId);
    return base.criar(req, res);
  },

  // Só confere quando a disciplina principal muda: reenviar a atual (mesmo que tenha sido
  // inativada depois) não bloqueia a edição dos outros campos
  async atualizar(req, res) {
    const nova = req.body.disciplinaPrincipalId;
    if (nova !== undefined && nova !== null) {
      const atual = await prisma.professor.findUniqueOrThrow({
        where: { id: lerId(req.params.id) },
        select: { disciplinaPrincipalId: true },
      });
      if (atual.disciplinaPrincipalId !== nova) await exigirDisciplinaPrincipalAtiva(nova);
    }
    return base.atualizar(req, res);
  },
};