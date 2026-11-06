// Cliente HTTP da API SKOLLA.
// - Envia o token JWT em "Authorization: Bearer <token>"
// - Converte respostas de erro em ApiError (status + mensagem + detalhes/campos)
// - Avisa a aplicação quando recebe 401 com token (sessão expirada ou usuário desativado)

import type { CorpoErro, DetalheErro } from "@/types/api";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api").replace(/\/+$/, "");

// ─── Token ───────────────────────────────────────────────────────────────────

const CHAVE_TOKEN = "skolla.token";

export function obterToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

export function salvarToken(token: string): void {
  try {
    localStorage.setItem(CHAVE_TOKEN, token);
  } catch {
    // armazenamento indisponível (ex.: navegação privada): a sessão dura só até recarregar
  }
}

export function removerToken(): void {
  try {
    localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // ignora
  }
}

// ─── Erros ───────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  /** 0 = sem resposta do servidor (rede/servidor fora do ar) */
  readonly status: number;
  readonly detalhes: DetalheErro[];
  readonly campos: string[];

  constructor(status: number, mensagem: string, detalhes: DetalheErro[] = [], campos: string[] = []) {
    super(mensagem);
    this.name = "ApiError";
    this.status = status;
    this.detalhes = detalhes;
    this.campos = campos;
  }
}

const MENSAGEM_PADRAO: Record<number, string> = {
  400: "Dados inválidos.",
  401: "Sessão expirada. Faça login novamente.",
  403: "Você não tem permissão para acessar este recurso.",
  404: "Registro não encontrado.",
  409: "Operação não permitida.",
  429: "Muitas tentativas. Tente novamente mais tarde.",
  500: "Erro interno do servidor.",
};

// ─── Sessão expirada ─────────────────────────────────────────────────────────

let aoNaoAutorizado: (() => void) | null = null;

/** Registra a ação executada quando uma requisição autenticada recebe 401. */
export function definirAoNaoAutorizado(fn: (() => void) | null): void {
  aoNaoAutorizado = fn;
}

// ─── Requisição ──────────────────────────────────────────────────────────────

type ValorQuery = string | number | boolean | null | undefined;

export type OpcoesRequisicao = {
  /** Parâmetros de query string. Valores null, undefined e "" são ignorados. */
  query?: Record<string, ValorQuery>;
  body?: unknown;
  /** false = não envia o token (usado no login) */
  autenticar?: boolean;
};

function montarUrl(caminho: string, query?: OpcoesRequisicao["query"]): string {
  const url = BASE_URL + (caminho.startsWith("/") ? caminho : "/" + caminho);
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(query)) {
    if (valor === null || valor === undefined || valor === "") continue;
    params.append(chave, String(valor));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function requisicao<T>(metodo: string, caminho: string, opcoes: OpcoesRequisicao = {}): Promise<T> {
  const { query, body, autenticar = true } = opcoes;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = autenticar ? obterToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let resposta: Response;
  try {
    resposta = await fetch(montarUrl(caminho, query), {
      method: metodo,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Não foi possível conectar ao servidor. Verifique se a API está em execução.");
  }

  if (resposta.status === 204) return undefined as T;

  let dados: unknown = null;
  const texto = await resposta.text();
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = null;
    }
  }

  if (!resposta.ok) {
    const corpo = (dados ?? {}) as Partial<CorpoErro>;
    const erro = new ApiError(
      resposta.status,
      corpo.error ?? MENSAGEM_PADRAO[resposta.status] ?? `Erro ${resposta.status}.`,
      corpo.detalhes ?? [],
      corpo.campos ?? [],
    );
    if (resposta.status === 401 && token && aoNaoAutorizado) aoNaoAutorizado();
    throw erro;
  }

  return dados as T;
}

export const api = {
  get: <T>(caminho: string, opcoes?: Omit<OpcoesRequisicao, "body">) => requisicao<T>("GET", caminho, opcoes),
  post: <T>(caminho: string, body?: unknown, opcoes?: OpcoesRequisicao) =>
    requisicao<T>("POST", caminho, { ...opcoes, body }),
  put: <T>(caminho: string, body: unknown, opcoes?: OpcoesRequisicao) =>
    requisicao<T>("PUT", caminho, { ...opcoes, body }),
  patch: <T>(caminho: string, body?: unknown, opcoes?: OpcoesRequisicao) =>
    requisicao<T>("PATCH", caminho, { ...opcoes, body }),
  delete: <T = void>(caminho: string, opcoes?: Omit<OpcoesRequisicao, "body">) =>
    requisicao<T>("DELETE", caminho, opcoes),
};