import { prisma } from '../lib/prisma.js';
import { ErroHttp } from '../lib/erro-http.js';
import { exigirExistencia } from '../lib/existe.js';

function lerId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ErroHttp(400, 'ID inválido.');
  }
  return id;
}

export function criarCrudController(
  modelo,
  { campos, include, filtros = [], referencias = {} }
) {
  const delegate = prisma[modelo];

  const filtrar = (body) =>
    Object.fromEntries(
      campos.filter((c) => body[c] !== undefined).map((c) => [c, body[c]])
    );

  // referencias: { campo: ['modeloPrisma', 'Mensagem se não existir.'] }
  async function validarReferencias(body) {
    for (const [campo, [modeloRef, mensagem]] of Object.entries(referencias)) {
      if (body[campo] !== undefined) {
        await exigirExistencia(modeloRef, body[campo], mensagem);
      }
    }
  }

  return {
    async listar(req, res) {
      // Filtros opcionais por query string (ex.: ?turmaId=1), só para campos liberados
      const where = {};
      for (const campo of filtros) {
        if (req.query[campo] !== undefined) {
          where[campo] = lerId(req.query[campo]);
        }
      }
      const itens = await delegate.findMany({ where, include, orderBy: { id: 'asc' } });
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
      await validarReferencias(req.body);
      const item = await delegate.create({ data: filtrar(req.body) });
      return res.status(201).json(item);
    },

    async atualizar(req, res) {
      await validarReferencias(req.body);
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