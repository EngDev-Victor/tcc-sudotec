import { prisma } from '../lib/prisma.js';
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

  // Detalhe da turma: ano letivo, alunos com matrícula ativa e professores por disciplina
  async buscarPorId(req, res) {
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
          include: {
            professor: { select: { id: true, nome: true, email: true, especialidade: true } },
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