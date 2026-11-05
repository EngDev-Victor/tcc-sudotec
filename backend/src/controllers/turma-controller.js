import { prisma } from '../lib/prisma.js';
import { ErroHttp } from '../lib/erro-http.js';
import { lerBooleano } from '../lib/consulta.js';
import { criarCrudController, lerId } from './crud-controller.js';

const crudBase = criarCrudController('turma', {
  campos: ['nome', 'anoLetivoId', 'turno', 'sala'],
  include: { anoLetivo: true },
  filtros: ['anoLetivoId'],
  referencias: { anoLetivoId: ['anoLetivo', 'Ano letivo não encontrado.'] },
  exclusaoBloqueadaPor: [
    {
      modelo: 'matricula',
      campo: 'turmaId',
      mensagem: 'Não é possível excluir a turma: ela possui matrículas (o histórico é preservado).',
    },
    {
      modelo: 'alocacaoProfessorTurma',
      campo: 'turmaId',
      mensagem: 'Não é possível excluir a turma: ela possui professores alocados. Remova as alocações antes.',
    },
  ],
});

export const turmaController = {
  ...crudBase,

  // Trocar o ano letivo de uma turma com matrículas permitiria burlar a regra de
  // "uma matrícula ativa por aluno no mesmo ano letivo" (e misturaria o histórico)
  async atualizar(req, res) {
    if (req.body.anoLetivoId !== undefined) {
      const turma = await prisma.turma.findUniqueOrThrow({
        where: { id: lerId(req.params.id) },
        select: { anoLetivoId: true, _count: { select: { matriculas: true } } },
      });

      if (turma.anoLetivoId !== req.body.anoLetivoId && turma._count.matriculas > 0) {
        throw new ErroHttp(
          409,
          'Não é possível trocar o ano letivo de uma turma que já possui matrículas. Crie uma nova turma no outro ano.',
        );
      }
    }

    return crudBase.atualizar(req, res);
  },

  // Detalhe da turma: ano letivo, alunos com matrícula ativa e professores por disciplina.
  // Professores inativos só aparecem com ?incluirInativos=true (consulta histórica).
  async buscarPorId(req, res) {
    const incluirInativos = lerBooleano(req.query.incluirInativos, 'incluirInativos') === true;

    const turma = await prisma.turma.findUniqueOrThrow({
      where: { id: lerId(req.params.id) },
      include: {
        anoLetivo: true,
        matriculas: {
          where: { status: 'ATIVA' },
          include: {
            aluno: { select: { id: true, nome: true, email: true, matricula: true } },
          },
          orderBy: { aluno: { nome: 'asc' } },
        },
        alocacoes: {
          where: incluirInativos ? {} : { professor: { ativo: true } },
          include: {
            professor: { select: { id: true, nome: true, email: true, especialidade: true, ativo: true } },
            disciplina: true,
          },
        },
      },
    });

    const { matriculas, alocacoes, ...dados } = turma;

    return res.json({
      ...dados,
      alunos: matriculas.map((m) => ({ matriculaId: m.id, ...m.aluno })),
      professores: alocacoes.map((a) => ({
        alocacaoId: a.id,
        professor: a.professor,
        disciplina: a.disciplina,
      })),
      totais: {
        alunosAtivos: matriculas.length,
        alocacoes: alocacoes.length,
      },
    });
  },
};