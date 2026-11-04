import { ErroHttp } from './erro-http.js';

const LIMITE_PADRAO = 20;
const LIMITE_MAXIMO = 100;

// Lê ?pagina= e ?limite= com validação
export function lerPaginacao(query) {
  const pagina = query.pagina === undefined ? 1 : Number(query.pagina);
  const limite = query.limite === undefined ? LIMITE_PADRAO : Number(query.limite);

  if (!Number.isInteger(pagina) || pagina < 1) {
    throw new ErroHttp(400, 'Parâmetro "pagina" inválido. Use um inteiro maior ou igual a 1.');
  }
  if (!Number.isInteger(limite) || limite < 1 || limite > LIMITE_MAXIMO) {
    throw new ErroHttp(400, `Parâmetro "limite" inválido. Use um inteiro entre 1 e ${LIMITE_MAXIMO}.`);
  }

  return { pagina, limite, pular: (pagina - 1) * limite };
}

export function montarResposta(dados, { pagina, limite }, total) {
  return {
    dados,
    paginacao: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) },
  };
}