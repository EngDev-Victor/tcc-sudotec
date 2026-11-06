import { api } from "@/services/api";
import type { Disciplina } from "@/types/entidades";

export type DadosDisciplina = { nome: string; cargaHoraria: number };

/** GET /disciplinas — lista simples por id; filtro opcional por situação */
export function listarDisciplinas(ativo?: boolean): Promise<Disciplina[]> {
  return api.get<Disciplina[]>("/disciplinas", { query: { ativo } });
}

/** POST /disciplinas — nasce ativa */
export function criarDisciplina(dados: DadosDisciplina): Promise<Disciplina> {
  return api.post<Disciplina>("/disciplinas", dados);
}

/** PUT /disciplinas/:id — envie só os campos alterados (ao menos um) */
export function atualizarDisciplina(id: number, dados: Partial<DadosDisciplina>): Promise<Disciplina> {
  return api.put<Disciplina>(`/disciplinas/${id}`, dados);
}

/** PATCH /disciplinas/:id/ativo */
export function alterarAtivoDisciplina(id: number, ativo: boolean): Promise<Disciplina> {
  return api.patch<Disciplina>(`/disciplinas/${id}/ativo`, { ativo });
}

/** DELETE /disciplinas/:id — 409 se estiver alocada ou for disciplina principal de professor */
export function excluirDisciplina(id: number): Promise<void> {
  return api.delete(`/disciplinas/${id}`);
}