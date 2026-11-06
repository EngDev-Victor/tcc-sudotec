import { api } from "@/services/api";
import type { Usuario } from "@/types/entidades";
import type { Papel } from "@/types/enums";

export type DadosUsuario = { nome: string; email: string; senha: string; papel: Papel };

/** GET /usuarios — lista simples por id (nunca inclui a senha) */
export function listarUsuarios(): Promise<Usuario[]> {
  return api.get<Usuario[]>("/usuarios");
}

/** POST /usuarios — senha de 8 a 72 caracteres */
export function criarUsuario(dados: DadosUsuario): Promise<Usuario> {
  return api.post<Usuario>("/usuarios", dados);
}

/** PATCH /usuarios/:id/ativo — desativar derruba o acesso na hora */
export function alterarAtivoUsuario(id: number, ativo: boolean): Promise<Usuario> {
  return api.patch<Usuario>(`/usuarios/${id}/ativo`, { ativo });
}