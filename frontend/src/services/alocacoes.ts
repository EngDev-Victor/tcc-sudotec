import { api } from "@/services/api";
import type { Alocacao } from "@/types/entidades";

export type DadosAlocacao = { professorId: number; turmaId: number; disciplinaId: number };

export type FiltrosAlocacoes = {
  turmaId?: number;
  professorId?: number;
  disciplinaId?: number;
  /** true inclui alocações de professores inativos (histórico) */
  incluirInativos?: boolean;
};

/** GET /alocacoes — lista simples por id */
export function listarAlocacoes(filtros: FiltrosAlocacoes = {}): Promise<Alocacao[]> {
  return api.get<Alocacao[]>("/alocacoes", {
    query: { ...filtros, incluirInativos: filtros.incluirInativos || undefined },
  });
}

/** POST /alocacoes — professor e disciplina precisam estar ativos */
export function criarAlocacao(dados: DadosAlocacao): Promise<Alocacao> {
  return api.post<Alocacao>("/alocacoes", dados);
}

/** PUT /alocacoes/:id — envie só os campos alterados (ao menos um) */
export function atualizarAlocacao(id: number, dados: Partial<DadosAlocacao>): Promise<Alocacao> {
  return api.put<Alocacao>(`/alocacoes/${id}`, dados);
}

/** DELETE /alocacoes/:id — para desfazer um engano */
export function excluirAlocacao(id: number): Promise<void> {
  return api.delete(`/alocacoes/${id}`);
}