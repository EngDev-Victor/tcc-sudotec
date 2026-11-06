import { api } from "@/services/api";
import type { Turma, TurmaDetalhe } from "@/types/entidades";
import type { Turno } from "@/types/enums";

export type DadosTurma = { nome: string; anoLetivoId: number; turno: Turno; sala: string };

/** GET /turmas — lista simples por id (inclui anoLetivo); filtro opcional por ano letivo */
export function listarTurmas(anoLetivoId?: number): Promise<Turma[]> {
  return api.get<Turma[]>("/turmas", { query: { anoLetivoId } });
}

/** GET /turmas/:id — alunos com matrícula ATIVA e professores alocados */
export function buscarTurma(id: number, incluirInativos = false): Promise<TurmaDetalhe> {
  return api.get<TurmaDetalhe>(`/turmas/${id}`, { query: { incluirInativos: incluirInativos || undefined } });
}

export function criarTurma(dados: DadosTurma): Promise<Turma> {
  return api.post<Turma>("/turmas", dados);
}

/** PUT /turmas/:id — trocar o ano letivo de turma com matrículas gera 409 */
export function atualizarTurma(id: number, dados: Partial<DadosTurma>): Promise<Turma> {
  return api.put<Turma>(`/turmas/${id}`, dados);
}

/** DELETE /turmas/:id — 409 se tiver matrículas ou alocações */
export function excluirTurma(id: number): Promise<void> {
  return api.delete(`/turmas/${id}`);
}