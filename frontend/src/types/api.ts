// Formatos gerais de resposta da API (seções 2.4 e 3 do contrato).

/** Resposta de GET /alunos, /professores e /matriculas */
export type Paginado<T> = {
  dados: T[];
  paginacao: { pagina: number; limite: number; total: number; totalPaginas: number };
};

export type ParametrosPaginacao = { pagina?: number; limite?: number };

export type DetalheErro = { campo: string; mensagem: string };

/** Corpo de qualquer resposta de erro */
export type CorpoErro = {
  error: string;
  /** Erros 400 de validação: um item por campo */
  detalhes?: DetalheErro[];
  /** Erros 409 de duplicidade: campos com valor repetido */
  campos?: string[];
};