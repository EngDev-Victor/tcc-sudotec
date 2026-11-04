import { prisma } from '../lib/prisma.js';
import { ErroHttp } from '../lib/erro-http.js';
import { lerId } from './crud-controller.js';
import { lerPaginacao, montarResposta } from '../lib/paginacao.js';
import { lerIdQuery } from '../lib/consulta.js';

const STATUS_VALIDOS = ['ATIVA', 'TRANSFERIDA', 'CANCELADA', 'CONCLUIDA'];

const include = { aluno: true, turma: true };

// Garante que o aluno não tenha outra matrícula ATIVA no mesmo ano letivo
async function exigirSemMatriculaAtivaNoAno(tx, alunoId, anoLetivoId) {
  const existente = await tx.matricula.findFirst({
    where: { alunoId, status: 'ATIVA', turma: { anoLetivoId } },
    select: { id: true },
  });
  if (existente) {
    throw new ErroHttp(409, 'O aluno já possui matrícula ativa neste ano letivo.');
  }
}

export const matriculaController = {
  async listar(req, res) {
    const paginacao = lerPaginacao(req.query);

    const { status } = req.query;
    if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
      throw new ErroHttp(400, `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}.`);
    }
    const anoLetivoId = lerIdQuery(req.query.anoLetivoId, 'anoLetivoId');

    const where = {
      alunoId: lerIdQuery(req.query.alunoId, 'alunoId'),
      turmaId: lerIdQuery(req.query.turmaId, 'turmaId'),
      status,
      turma: anoLetivoId !== undefined ? { anoLetivoId } : undefined,
    };

    const [total, matriculas] = await Promise.all([
      prisma.matricula.count({ where }),
      prisma.matricula.findMany({
        where,
        include,
        orderBy: { id: 'asc' },
        skip: paginacao.pular,
        take: paginacao.limite,
      }),
    ]);

    return res.json(montarResposta(matriculas, paginacao, total));
  },

  // Valida e grava na mesma transação
  async criar(req, res) {
    const { alunoId, turmaId } = req.body;

    const matricula = await prisma.$transaction(async (tx) => {
      const aluno = await tx.aluno.findUnique({
        where: { id: alunoId },
        select: { id: true, ativo: true },
      });
      if (!aluno) throw new ErroHttp(404, 'Aluno não encontrado.');
      if (!aluno.ativo) throw new ErroHttp(409, 'Aluno inativo não pode ser matriculado.');

      const turma = await tx.turma.findUnique({
        where: { id: turmaId },
        select: { id: true, anoLetivoId: true },
      });
      if (!turma) throw new ErroHttp(404, 'Turma não encontrada.');

      await exigirSemMatriculaAtivaNoAno(tx, alunoId, turma.anoLetivoId);

      return tx.matricula.create({ data: { alunoId, turmaId }, include });
    });

    return res.status(201).json(matricula);
  },

  // Encerra a matrícula atual (TRANSFERIDA) e cria uma nova na turma destino,
  // sempre dentro do mesmo ano letivo
  async transferir(req, res) {
    const id = lerId(req.params.id);
    const { turmaDestinoId } = req.body;

    const nova = await prisma.$transaction(async (tx) => {
      const atual = await tx.matricula.findUnique({
        where: { id },
        include: { turma: { select: { anoLetivoId: true } } },
      });
      if (!atual) throw new ErroHttp(404, 'Matrícula não encontrada.');
      if (atual.status !== 'ATIVA') {
        throw new ErroHttp(409, 'Só é possível transferir matrículas ativas.');
      }
      if (atual.turmaId === turmaDestinoId) {
        throw new ErroHttp(400, 'A turma de destino é a mesma da matrícula atual.');
      }

      const destino = await tx.turma.findUnique({
        where: { id: turmaDestinoId },
        select: { id: true, anoLetivoId: true },
      });
      if (!destino) throw new ErroHttp(404, 'Turma de destino não encontrada.');
      if (destino.anoLetivoId !== atual.turma.anoLetivoId) {
        throw new ErroHttp(
          409,
          'A turma de destino pertence a outro ano letivo. A transferência só é permitida dentro do mesmo ano letivo.'
        );
      }

      // Só encerra se ainda estiver ativa (protege contra duas transferências simultâneas)
      const encerradas = await tx.matricula.updateMany({
        where: { id, status: 'ATIVA' },
        data: { status: 'TRANSFERIDA' },
      });
      if (encerradas.count === 0) {
        throw new ErroHttp(409, 'A matrícula não está mais ativa.');
      }

      return tx.matricula.create({
        data: { alunoId: atual.alunoId, turmaId: turmaDestinoId },
        include,
      });
    });

    return res.status(201).json(nova);
  },

  // Só matrículas ativas podem ser canceladas
  async cancelar(req, res) {
    const id = lerId(req.params.id);

    const resultado = await prisma.matricula.updateMany({
      where: { id, status: 'ATIVA' },
      data: { status: 'CANCELADA' },
    });

    if (resultado.count === 0) {
      const existente = await prisma.matricula.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!existente) throw new ErroHttp(404, 'Matrícula não encontrada.');
      throw new ErroHttp(
        409,
        `Só é possível cancelar matrículas ativas (status atual: ${existente.status}).`
      );
    }

    const matricula = await prisma.matricula.findUniqueOrThrow({ where: { id }, include });
    return res.json(matricula);
  },
};