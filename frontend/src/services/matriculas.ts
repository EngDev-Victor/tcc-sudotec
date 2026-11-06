import { api } from "@/services/api";
import type { Paginado, ParametrosPaginacao } from "@/types/api";
import type { Matricula } from "@/types/entidades";
import type { StatusMatricula } from "@/types/enums";

export type FiltrosMatriculas = ParametrosPaginacao & {
  alunoId?: number;
  turmaId?: number;
  status?: StatusMatricula;
  anoLetivoId?: number;
};

/** GET /matriculas — paginado, por id */
export function listarMatriculas(filtros: FiltrosMatriculas = {}): Promise<Paginado<Matricula>> {
  return api.get<Paginado<Matricula>>("/matriculas", { query: filtros });
}

/**
 * POST /matriculas — nasce ATIVA. Só em turma do ano letivo ativo ou de ano futuro;
 * uma matrícula ATIVA por aluno em cada ano letivo.
 */
export function criarMatricula(alunoId: number, turmaId: number): Promise<Matricula> {
  return api.post<Matricula>("/matriculas", { alunoId, turmaId });
}

/** POST /matriculas/:id/transferir — a atual vira TRANSFERIDA; devolve a NOVA matrícula */
export function transferirMatricula(id: number, turmaDestinoId: number): Promise<Matricula> {
  return api.post<Matricula>(`/matriculas/${id}/transferir`, { turmaDestinoId });
}

/** PATCH /matriculas/:id/cancelar — aceita ATIVA ou SUSPENSA */
export function cancelarMatricula(id: number): Promise<Matricula> {
  return api.patch<Matricula>(`/matriculas/${id}/cancelar`);
}