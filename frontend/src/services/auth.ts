import { api } from "@/services/api";
import type { LoginResposta, Me } from "@/types/entidades";

/** POST /auth/login (rota pública: não envia token) */
export function login(email: string, senha: string): Promise<LoginResposta> {
  return api.post<LoginResposta>("/auth/login", { email, senha }, { autenticar: false });
}

/** GET /auth/me — valida o token e devolve o usuário atual */
export function buscarUsuarioAtual(): Promise<Me> {
  return api.get<Me>("/auth/me");
}