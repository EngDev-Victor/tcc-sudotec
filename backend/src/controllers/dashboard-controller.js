import { prisma } from '../lib/prisma.js';
import { ErroHttp } from '../lib/erro-http.js';
import { lerId } from './crud-controller.js';

const LIMITE_LISTA = 20;
const STATUS = ['ATIVA', 'SUSPENSA', 'TRANSFERIDA', 'CANCELADA', 'CONCLUIDA'];

// Usa o ano informado em ?anoLetivoId= ou, se não vier, o ano ativo
async function resolverAno(anoLetivoId) {
  if (anoLetivoId) {
    const ano = await prisma.anoLetivo.findUnique({ where: { id: lerId(anoLetivoId) } });
    if (!ano) throw new ErroHttp(404, 'Ano letivo não encontrado.');
    return ano;
  }
  return prisma.anoLetivo.findFirst({ where: { ativo: true } });
}

const resumo = (total, ativos) => ({ total, ativos, inativos: total - ativos });

export const dashboardController = {
  async gestor(req, res) {
    const ano = await resolverAno(req.query.anoLetivoId);

    const [alunosTotal, alunosAtivos, professoresTotal, professoresAtivos, disciplinas] =
      await Promise.all([
        prisma.aluno.count(),
        prisma.aluno.count({ where: { ativo: true } }),
        prisma.professor.count(),
        prisma.professor.count({ where: { ativo: true } }),
        prisma.disciplina.count(),
      ]);

    const alunos = resumo(alunosTotal, alunosAtivos);
    const professores = resumo(professoresTotal, professoresAtivos);

    // Sem ano letivo ativo não há recorte para os demais indicadores
    if (!ano) {
      return res.json({
        anoLetivo: null,
        aviso: 'Nenhum ano letivo ativo. Ative um ano letivo ou informe ?anoLetivoId=.',
        totais: { alunos: alunosTotal, professores: professoresTotal, disciplinas, turmas: 0 },
        alunos,
        professores,
      });
    }

    const filtroAno = { anoLetivoId: ano.id };

    // Só alunos ativos entram como pendência
    const alunosSemMatricula = {
      ativo: true,
      matriculas: { none: { status: 'ATIVA', turma: filtroAno } },
    };

    const [
      turmas,
      porStatus,
      alocacoes,
      matriculadosNoAno,
      professoresAlocados,
      semMatriculaTotal,
      semMatriculaItens,
    ] = await Promise.all([
      prisma.turma.findMany({
        where: filtroAno,
        select: {
          id: true,
          nome: true,
          turno: true,
          sala: true,
          _count: { select: { matriculas: { where: { status: 'ATIVA' } } } },
        },
        orderBy: { nome: 'asc' },
      }),
      prisma.matricula.groupBy({
        by: ['status'],
        where: { turma: filtroAno },
        _count: { _all: true },
      }),
      // Alocações de professores inativos ficam no histórico, mas não contam nos indicadores
      prisma.alocacaoProfessorTurma.findMany({
        where: { turma: filtroAno, professor: { ativo: true } },
        select: { turmaId: true, professorId: true },
      }),
      prisma.aluno.count({
        where: { matriculas: { some: { status: 'ATIVA', turma: filtroAno } } },
      }),
      prisma.professor.count({
        where: { ativo: true, alocacoes: { some: { turma: filtroAno } } },
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

    // Uma alocação é um par professor + disciplina; aqui contamos também os professores distintos
    // (só professores ativos: os inativos já foram filtrados na consulta)
    const porTurma = new Map();
    for (const a of alocacoes) {
      const atual = porTurma.get(a.turmaId) ?? { alocacoes: 0, professores: new Set() };
      atual.alocacoes += 1;
      atual.professores.add(a.professorId);
      porTurma.set(a.turmaId, atual);
    }

    const ocupacaoPorTurma = turmas.map((t) => {
      const dados = porTurma.get(t.id);
      return {
        turmaId: t.id,
        nome: t.nome,
        turno: t.turno,
        sala: t.sala,
        alunosAtivos: t._count.matriculas,
        professores: dados ? dados.professores.size : 0,
        alocacoes: dados ? dados.alocacoes : 0,
      };
    });

    return res.json({
      anoLetivo: {
        id: ano.id,
        ano: ano.ano,
        ativo: ano.ativo,
        dataInicio: ano.dataInicio,
        dataFim: ano.dataFim,
      },
      totais: {
        alunos: alunosTotal,
        professores: professoresTotal,
        disciplinas,
        turmas: turmas.length,
      },
      alunos: { ...alunos, matriculadosNoAno },
      professores: { ...professores, alocadosNoAno: professoresAlocados },
      matriculas,
      ocupacaoPorTurma,
      pendencias: {
        turmasSemProfessor: ocupacaoPorTurma
          .filter((t) => t.professores === 0)
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