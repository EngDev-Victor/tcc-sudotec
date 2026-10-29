import { prisma } from '../lib/prisma.js';
import { ErroHttp } from '../lib/erro-http.js';
import { lerId } from './crud-controller.js';

const include = { aluno: true, turma: true };

// Garante que o aluno não tenha outra matrícula ATIVA no mesmo ano letivo
async function validarMatriculaAtiva(alunoId, turma) {
  const existente = await prisma.matricula.findFirst({
    where: { alunoId, status: 'ATIVA', turma: { anoLetivo: turma.anoLetivo } },
  });
  if (existente) {
    throw new ErroHttp(409, 'O aluno já possui matrícula ativa neste ano letivo.');
  }
}

export const matriculaController = {
  async listar(req, res) {
    const { alunoId, turmaId, status } = req.query;
    const matriculas = await prisma.matricula.findMany({
      where: {
        alunoId: alunoId ? lerId(alunoId) : undefined,
        turmaId: turmaId ? lerId(turmaId) : undefined,
        status: status || undefined,
      },
      include,
      orderBy: { id: 'asc' },
    });
    return res.json(matriculas);
  },

  async criar(req, res) {
    const { alunoId, turmaId } = req.body;
    if (!alunoId || !turmaId) {
      throw new ErroHttp(400, 'Campos obrigatórios: alunoId, turmaId.');
    }

    await prisma.aluno.findUniqueOrThrow({ where: { id: alunoId } });
    const turma = await prisma.turma.findUniqueOrThrow({ where: { id: turmaId } });
    await validarMatriculaAtiva(alunoId, turma);

    const matricula = await prisma.matricula.create({
      data: { alunoId, turmaId },
      include,
    });
    return res.status(201).json(matricula);
  },

  // Encerra a matrícula atual (TRANSFERIDA) e cria uma nova na turma destino
  async transferir(req, res) {
    const id = lerId(req.params.id);
    const { turmaDestinoId } = req.body;
    if (!turmaDestinoId) {
      throw new ErroHttp(400, 'Campo obrigatório: turmaDestinoId.');
    }

    const atual = await prisma.matricula.findUniqueOrThrow({ where: { id } });
    if (atual.status !== 'ATIVA') {
      throw new ErroHttp(409, 'Só é possível transferir matrículas ativas.');
    }
    if (atual.turmaId === turmaDestinoId) {
      throw new ErroHttp(400, 'A turma de destino é a mesma da matrícula atual.');
    }
    await prisma.turma.findUniqueOrThrow({ where: { id: turmaDestinoId } });

    const [, nova] = await prisma.$transaction([
      prisma.matricula.update({ where: { id }, data: { status: 'TRANSFERIDA' } }),
      prisma.matricula.create({
        data: { alunoId: atual.alunoId, turmaId: turmaDestinoId },
        include,
      }),
    ]);
    return res.status(201).json(nova);
  },

  async cancelar(req, res) {
    const matricula = await prisma.matricula.update({
      where: { id: lerId(req.params.id) },
      data: { status: 'CANCELADA' },
      include,
    });
    return res.json(matricula);
  },
};