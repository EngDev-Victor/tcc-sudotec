import { prisma } from '../lib/prisma.js';
import { lerPaginacao } from '../lib/paginacao.js';
import { lerBusca, lerBooleano, lerIdQuery, listarPaginado } from '../lib/consulta.js';
import { criarCrudController } from './crud-controller.js';

const base = criarCrudController('aluno', {
  campos: ['nome', 'email', 'matricula', 'cpf', 'dataNascimento', 'nomeResponsavel', 'telefone'],
});

export const alunoController = {
  ...base,

  // GET /alunos?busca=&ativo=&turmaId=&pagina=&limite=
  async listar(req, res) {
    const paginacao = lerPaginacao(req.query);
    const busca = lerBusca(req.query.busca);
    const ativo = lerBooleano(req.query.ativo, 'ativo');
    const turmaId = lerIdQuery(req.query.turmaId, 'turmaId');

    const where = {};
    if (ativo !== undefined) where.ativo = ativo;
    if (turmaId !== undefined) {
      where.matriculas = { some: { turmaId, status: 'ATIVA' } };
    }

    const resposta = await listarPaginado({ delegate: prisma.aluno, where, busca, paginacao });
    return res.json(resposta);
  },
};