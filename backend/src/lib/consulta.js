import { ErroHttp } from './erro-http.js';
import { montarResposta } from './paginacao.js';

const colador = new Intl.Collator('pt-BR');

// Minúsculas e sem acentos, para comparar "José" com "jose"
export function normalizarTexto(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function lerBusca(valor) {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string') {
    throw new ErroHttp(400, 'Parâmetro "busca" inválido.');
  }
  const texto = normalizarTexto(valor);
  if (!texto) return undefined;
  if (texto.length > 100) {
    throw new ErroHttp(400, 'Parâmetro "busca" deve ter no máximo 100 caracteres.');
  }
  return texto;
}

export function lerBooleano(valor, campo) {
  if (valor === undefined) return undefined;
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  throw new ErroHttp(400, `Parâmetro "${campo}" inválido. Use true ou false.`);
}

export function lerIdQuery(valor, campo) {
  if (valor === undefined) return undefined;
  const id = Number(valor);
  if (typeof valor !== 'string' || !Number.isInteger(id) || id <= 0) {
    throw new ErroHttp(400, `Parâmetro "${campo}" inválido. Use um número inteiro maior que zero.`);
  }
  return id;
}

// Busca por nome sem distinção de acento ou maiúsculas, ordem alfabética (pt-BR) e paginação.
// Carrega só id e nome dos registros que passaram nos demais filtros.
export async function listarPaginado({ delegate, where = {}, include, busca, paginacao }) {
  const candidatos = await delegate.findMany({ where, select: { id: true, nome: true } });

  const filtrados = busca
    ? candidatos.filter((c) => normalizarTexto(c.nome).includes(busca))
    : candidatos;

  filtrados.sort((a, b) => colador.compare(a.nome, b.nome) || a.id - b.id);

  const ids = filtrados
    .slice(paginacao.pular, paginacao.pular + paginacao.limite)
    .map((c) => c.id);

  const itens = ids.length
    ? await delegate.findMany({ where: { id: { in: ids } }, include })
    : [];
  const porId = new Map(itens.map((item) => [item.id, item]));

  return montarResposta(
    ids.map((id) => porId.get(id)),
    paginacao,
    filtrados.length
  );
}