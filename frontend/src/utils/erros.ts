// Helpers para exibir erros da API nas telas e formulários.

import { ApiError } from "@/services/api";

/** Mensagem principal para toast/alerta. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ApiError) return erro.message;
  if (erro instanceof Error && erro.message) return erro.message;
  return "Ocorreu um erro inesperado.";
}

/**
 * Erros por campo para exibir ao lado dos inputs:
 * - 400: cada item de `detalhes` vira { campo: mensagem }
 * - 409 de duplicidade: cada item de `campos` recebe a mensagem geral
 */
export function errosPorCampo(erro: unknown): Record<string, string> {
  if (!(erro instanceof ApiError)) return {};
  const resultado: Record<string, string> = {};
  for (const d of erro.detalhes) {
    if (!resultado[d.campo]) resultado[d.campo] = d.mensagem;
  }
  for (const campo of erro.campos) {
    if (!resultado[campo]) resultado[campo] = erro.message;
  }
  return resultado;
}