import { prisma } from '../lib/prisma.js';
import { lerId } from './crud-controller.js';

export const inativacaoController = {
  // Inativar cancela as matrículas ativas (o histórico fica); reativar não recria matrícula
  async aluno(req, res) {
    const id = lerId(req.params.id);
    const { ativo } = req.body;

    await prisma.aluno.findUniqueOrThrow({ where: { id }, select: { id: true } });

    const operacoes = [];
    if (!ativo) {
      operacoes.push(
        prisma.matricula.updateMany({
          where: { alunoId: id, status: 'ATIVA' },
          data: { status: 'CANCELADA' },
        })
      );
    }
    operacoes.push(prisma.aluno.update({ where: { id }, data: { ativo } }));

    const resultados = await prisma.$transaction(operacoes);
    const aluno = resultados[resultados.length - 1];
    const matriculasCanceladas = ativo ? 0 : resultados[0].count;

    return res.json({ ...aluno, matriculasCanceladas });
  },

  // Inativar mantém as alocações existentes
  async professor(req, res) {
    const professor = await prisma.professor.update({
      where: { id: lerId(req.params.id) },
      data: { ativo: req.body.ativo },
    });
    return res.json(professor);
  },
};