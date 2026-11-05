import { prisma } from '../lib/prisma.js';
import { lerId } from './crud-controller.js';

const MOTIVO_ANO_INATIVO = 'O ano letivo da turma não está ativo.';
const MOTIVO_CONFLITO = 'O aluno já possui matrícula ativa neste ano letivo.';

// Reativar: tenta devolver cada matrícula SUSPENSA para ATIVA, da mais recente para a mais antiga.
// Só restaura se o ano letivo da turma estiver ativo e o aluno não tiver outra ATIVA no mesmo ano.
// As que não puderem voltar continuam SUSPENSA, com o motivo na resposta.
async function restaurarSuspensas(tx, alunoId) {
  const ativas = await tx.matricula.findMany({
    where: { alunoId, status: 'ATIVA' },
    select: { turma: { select: { anoLetivoId: true } } },
  });
  const anosOcupados = new Set(ativas.map((m) => m.turma.anoLetivoId));

  const suspensas = await tx.matricula.findMany({
    where: { alunoId, status: 'SUSPENSA' },
    include: { turma: { select: { anoLetivoId: true, anoLetivo: { select: { ativo: true } } } } },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  });

  const restauradas = [];
  const mantidas = [];

  for (const m of suspensas) {
    const { anoLetivoId, anoLetivo } = m.turma;
    if (!anoLetivo.ativo) {
      mantidas.push({ matriculaId: m.id, turmaId: m.turmaId, motivo: MOTIVO_ANO_INATIVO });
      continue;
    }
    if (anosOcupados.has(anoLetivoId)) {
      mantidas.push({ matriculaId: m.id, turmaId: m.turmaId, motivo: MOTIVO_CONFLITO });
      continue;
    }
    const alterada = await tx.matricula.updateMany({
      where: { id: m.id, status: 'SUSPENSA' },
      data: { status: 'ATIVA' },
    });
    if (alterada.count === 1) {
      restauradas.push(m.id);
      anosOcupados.add(anoLetivoId);
    }
  }

  return { restauradas, mantidas };
}

export const inativacaoController = {
  // Inativar suspende as matrículas ativas (SUSPENSA, não CANCELADA): o histórico fica
  // e a matrícula pode voltar na reativação
  async aluno(req, res) {
    const id = lerId(req.params.id);
    const { ativo } = req.body;

    await prisma.aluno.findUniqueOrThrow({ where: { id }, select: { id: true } });

    const resultado = await prisma.$transaction(async (tx) => {
      if (!ativo) {
        const suspensas = await tx.matricula.updateMany({
          where: { alunoId: id, status: 'ATIVA' },
          data: { status: 'SUSPENSA' },
        });
        const aluno = await tx.aluno.update({ where: { id }, data: { ativo: false } });
        return { ...aluno, matriculasSuspensas: suspensas.count };
      }

      const aluno = await tx.aluno.update({ where: { id }, data: { ativo: true } });
      const { restauradas, mantidas } = await restaurarSuspensas(tx, id);
      return {
        ...aluno,
        matriculasRestauradas: restauradas,
        matriculasMantidasSuspensas: mantidas,
      };
    });

    return res.json(resultado);
  },

  // Inativar mantém as alocações existentes (elas saem das consultas normais)
  async professor(req, res) {
    const professor = await prisma.professor.update({
      where: { id: lerId(req.params.id) },
      data: { ativo: req.body.ativo },
    });
    return res.json(professor);
  },
};