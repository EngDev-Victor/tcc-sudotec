import { prisma } from '../lib/prisma.js';
import { ErroHttp } from '../lib/erro-http.js';
import { lerId } from './crud-controller.js';

const LIMITE_LISTA = 20;
const STATUS = ['ATIVA', 'TRANSFERIDA', 'CANCELADA', 'CONCLUIDA'];

// Usa o ano informado em ?anoLetivoId= ou, se não vier, o ano ativo
async function resolverAno(anoLetivoId) {
  if (anoLetivoId) {
    const ano = await prisma.anoLetivo.findUnique({ where: { id: lerId(anoLetivoId) } });
    if (!ano) throw new ErroHttp(404, 'Ano letivo não encontrado.');
    return ano;
  }
  return prisma.anoLetivo.findFirst({ where: { ativo: true } });
}

export const dashboardController = {
  async gestor(req, res) {
    const ano = await resolverAno(req.query.anoLetivoId);

    const [alunos, professores, disciplinas] = await Promise.all([
      prisma.aluno.count(),
      prisma.professor.count(),
      prisma.disciplina.count(),
    ]);

    // Sem ano letivo ativo não há recorte para os demais indicadores
    if (!ano) {
      return res.json({
        anoLetivo: null,
        aviso: 'Nenhum ano letivo ativo. Ative um ano letivo ou informe ?anoLetivoId=.',
        totais: { alunos, professores, disciplinas, turmas: 0 },
      });
    }

    const filtroAno = { anoLetivoId: ano.id };
    const alunosSemMatricula = {
      matriculas: { none: { status: 'ATIVA', turma: filtroAno } },
    };

    const [turmas, porStatus, semMatriculaTotal, semMatriculaItens] = await Promise.all([
      prisma.turma.findMany({
        where: filtroAno,
        select: {
          id: true,
          nome: true,
          _count: {
            select: {
              matriculas: { where: { status: 'ATIVA' } },
              alocacoes: true,
            },
          },
        },
        orderBy: { nome: 'asc' },
      }),
      prisma.matricula.groupBy({
        by: ['status'],
        where: { turma: filtroAno },
        _count: { _all: true },
      }),
      prisma.aluno.count({ where: alunosSemMatricula }),
      prisma.aluno.findMany({
        where: alunosSemMatricula,
        select: { id: true, nome: true, matricula: true },
        orderBy: { nome: 'asc' },
        take: LIMITE_LISTA,
      }),
    ]);

    const matriculas = Object.fromEntries(STATUS.map((s) => [s, 0]));
    for (const linha of porStatus) {
      matriculas[linha.status] = linha._count._all;
    }

    const ocupacaoPorTurma = turmas.map((t) => ({
      turmaId: t.id,
      nome: t.nome,
      alunosAtivos: t._count.matriculas,
      alocacoes: t._count.alocacoes,
    }));

    return res.json({
      anoLetivo: {
        id: ano.id,
        ano: ano.ano,
        ativo: ano.ativo,
        dataInicio: ano.dataInicio,
        dataFim: ano.dataFim,
      },
      totais: { alunos, professores, disciplinas, turmas: turmas.length },
      matriculas,
      ocupacaoPorTurma,
      pendencias: {
        turmasSemProfessor: ocupacaoPorTurma
          .filter((t) => t.alocacoes === 0)
          .map((t) => ({ id: t.turmaId, nome: t.nome })),
        turmasSemAlunos: ocupacaoPorTurma
          .filter((t) => t.alunosAtivos === 0)
          .map((t) => ({ id: t.turmaId, nome: t.nome })),
        alunosSemMatriculaAtiva: {
          total: semMatriculaTotal,
          itens: semMatriculaItens,
        },
      },
    });
  },
};