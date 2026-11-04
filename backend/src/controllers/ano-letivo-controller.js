import { prisma } from '../lib/prisma.js';
import { ErroHttp } from '../lib/erro-http.js';
import { lerId } from './crud-controller.js';

function lerData(valor, campo) {
  const data = new Date(valor);
  if (!valor || Number.isNaN(data.getTime())) {
    throw new ErroHttp(400, `Data inválida em ${campo}. Use o formato AAAA-MM-DD.`);
  }
  return data;
}

function lerAno(valor) {
  const ano = Number(valor);
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    throw new ErroHttp(400, 'Ano inválido.');
  }
  return ano;
}

function validarPeriodo(inicio, fim) {
  if (fim <= inicio) {
    throw new ErroHttp(400, 'A data de fim deve ser posterior à data de início.');
  }
}

export const anoLetivoController = {
  async listar(req, res) {
    const anos = await prisma.anoLetivo.findMany({
      include: { _count: { select: { turmas: true } } },
      orderBy: { ano: 'desc' },
    });
    return res.json(anos);
  },

  async buscarPorId(req, res) {
    const ano = await prisma.anoLetivo.findUniqueOrThrow({
      where: { id: lerId(req.params.id) },
      include: { turmas: true },
    });
    return res.json(ano);
  },

  async criar(req, res) {
    const { ano, dataInicio, dataFim } = req.body;
    if (ano === undefined || !dataInicio || !dataFim) {
      throw new ErroHttp(400, 'Campos obrigatórios: ano, dataInicio, dataFim.');
    }

    const inicio = lerData(dataInicio, 'dataInicio');
    const fim = lerData(dataFim, 'dataFim');
    validarPeriodo(inicio, fim);

    const criado = await prisma.anoLetivo.create({
      data: { ano: lerAno(ano), dataInicio: inicio, dataFim: fim },
    });
    return res.status(201).json(criado);
  },

  async atualizar(req, res) {
    const id = lerId(req.params.id);
    const atual = await prisma.anoLetivo.findUniqueOrThrow({ where: { id } });
    const { ano, dataInicio, dataFim } = req.body;

    const data = {};
    if (ano !== undefined) data.ano = lerAno(ano);
    if (dataInicio !== undefined) data.dataInicio = lerData(dataInicio, 'dataInicio');
    if (dataFim !== undefined) data.dataFim = lerData(dataFim, 'dataFim');

    validarPeriodo(data.dataInicio ?? atual.dataInicio, data.dataFim ?? atual.dataFim);

    const atualizado = await prisma.anoLetivo.update({ where: { id }, data });
    return res.json(atualizado);
  },

  async remover(req, res) {
    const id = lerId(req.params.id);
    const ano = await prisma.anoLetivo.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { turmas: true } } },
    });

    if (ano.ativo) {
      throw new ErroHttp(409, 'Não é possível excluir o ano letivo ativo. Ative outro ano antes.');
    }
    if (ano._count.turmas > 0) {
      throw new ErroHttp(409, 'Não é possível excluir o ano letivo: ele possui turmas.');
    }

    await prisma.anoLetivo.delete({ where: { id } });
    return res.status(204).send();
  },

  // Só um ano letivo fica ativo por vez
  async ativar(req, res) {
    const id = lerId(req.params.id);
    await prisma.anoLetivo.findUniqueOrThrow({ where: { id } });

    const [, ativado] = await prisma.$transaction([
      prisma.anoLetivo.updateMany({ data: { ativo: false } }),
      prisma.anoLetivo.update({ where: { id }, data: { ativo: true } }),
    ]);
    return res.json(ativado);
  },
};