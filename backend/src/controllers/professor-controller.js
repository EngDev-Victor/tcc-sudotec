import { prisma } from '../lib/prisma.js';
import { lerPaginacao } from '../lib/paginacao.js';
import { lerBusca, lerBooleano, lerIdQuery, listarPaginado } from '../lib/consulta.js';
import { criarCrudController } from './crud-controller.js';

const include = { disciplinaPrincipal: true };

const base = criarCrudController('professor', {
  campos: ['nome', 'email', 'especialidade', 'telefone', 'titulacao'],
  opcionais: ['disciplinaPrincipalId'],
  include,
  referencias: { disciplinaPrincipalId: ['disciplina', 'Disciplina não encontrada.'] },
});

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
};