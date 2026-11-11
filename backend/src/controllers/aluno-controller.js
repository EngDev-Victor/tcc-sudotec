import { prisma } from '../lib/prisma.js';
import { lerPaginacao } from '../lib/paginacao.js';
import { lerBusca, lerBooleano, lerIdQuery, listarPaginado } from '../lib/consulta.js';
import { criarCrudController } from './crud-controller.js';

const base = criarCrudController('aluno', {
  campos: ['nome', 'email', 'matricula', 'cpf', 'dataNascimento', 'nomeResponsavel', 'telefone'],
});

export const alunoController = {
  ...base,

  // GET /alunos?busca=&ativo=&turmaId=&anoLetivoId=&pagina=&limite=
  async listar(req, res) {
    const paginacao = lerPaginacao(req.query);
    const busca = lerBusca(req.query.busca);
    const ativo = lerBooleano(req.query.ativo, 'ativo');
    const turmaId = lerIdQuery(req.query.turmaId, 'turmaId');
    const anoLetivoId = lerIdQuery(req.query.anoLetivoId, 'anoLetivoId');

    const where = {};
    if (ativo !== undefined) where.ativo = ativo;
    // turmaId e anoLetivoId valem para a mesma matrícula ATIVA
    if (turmaId !== undefined || anoLetivoId !== undefined) {
      const matricula = { status: 'ATIVA' };
      if (turmaId !== undefined) matricula.turmaId = turmaId;
      if (anoLetivoId !== undefined) matricula.turma = { anoLetivoId };
      where.matriculas = { some: matricula };
    }

    const resposta = await listarPaginado({ delegate: prisma.aluno, where, busca, paginacao });
    return res.json(resposta);
  },
};