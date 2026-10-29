import { prisma } from '../lib/prisma.js';
import { ErroHttp } from '../lib/erro-http.js';

function lerId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ErroHttp(400, 'ID inválido.');
  }
  return id;
}

export function criarCrudController(modelo, { campos, include }) {
  const delegate = prisma[modelo];

  const filtrar = (body) =>
    Object.fromEntries(
      campos.filter((c) => body[c] !== undefined).map((c) => [c, body[c]])
    );

  return {
    async listar(req, res) {
      const itens = await delegate.findMany({ include, orderBy: { id: 'asc' } });
      return res.json(itens);
    },

    async buscarPorId(req, res) {
      const item = await delegate.findUniqueOrThrow({
        where: { id: lerId(req.params.id) },
        include,
      });
      return res.json(item);
    },

    async criar(req, res) {
      const faltando = campos.filter((c) => req.body[c] === undefined || req.body[c] === '');
      if (faltando.length) {
        throw new ErroHttp(400, `Campos obrigatórios: ${faltando.join(', ')}.`);
      }
      const item = await delegate.create({ data: filtrar(req.body) });
      return res.status(201).json(item);
    },

    async atualizar(req, res) {
      const item = await delegate.update({
        where: { id: lerId(req.params.id) },
        data: filtrar(req.body),
      });
      return res.json(item);
    },

    async remover(req, res) {
      await delegate.delete({ where: { id: lerId(req.params.id) } });
      return res.status(204).send();
    },
  };
}

export { lerId };