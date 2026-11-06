import { api } from "@/services/api";
import type { AnoLetivo, AnoLetivoDetalhe, AnoLetivoListagem } from "@/types/entidades";

/** Datas no formato AAAA-MM-DD */
export type DadosAnoLetivo = { ano: number; dataInicio: string; dataFim: string };

/** GET /anos-letivos — do mais recente para o mais antigo */
export function listarAnosLetivos(): Promise<AnoLetivoListagem[]> {
  return api.get<AnoLetivoListagem[]>("/anos-letivos");
}

/** GET /anos-letivos/:id — inclui as turmas */
export function buscarAnoLetivo(id: number): Promise<AnoLetivoDetalhe> {
  return api.get<AnoLetivoDetalhe>(`/anos-letivos/${id}`);
}

/** POST /anos-letivos — o ano nasce inativo */
export function criarAnoLetivo(dados: DadosAnoLetivo): Promise<AnoLetivo> {
  return api.post<AnoLetivo>("/anos-letivos", dados);
}

/** PUT /anos-letivos/:id — envie só os campos alterados (ao menos um) */
export function atualizarAnoLetivo(id: number, dados: Partial<DadosAnoLetivo>): Promise<AnoLetivo> {
  return api.put<AnoLetivo>(`/anos-letivos/${id}`, dados);
}

/** PATCH /anos-letivos/:id/ativar — ativa este e desativa todos os outros */
export function ativarAnoLetivo(id: number): Promise<AnoLetivo> {
  return api.patch<AnoLetivo>(`/anos-letivos/${id}/ativar`);
}

/** DELETE /anos-letivos/:id — 409 se for o ativo ou se tiver turmas */
export function excluirAnoLetivo(id: number): Promise<void> {
  return api.delete(`/anos-letivos/${id}`);
}