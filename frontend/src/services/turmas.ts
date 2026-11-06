import { api } from "@/services/api";
import type { Turma } from "@/types/entidades";

/** GET /turmas — lista simples por id (inclui anoLetivo); filtro opcional por ano letivo */
export function listarTurmas(anoLetivoId?: number): Promise<Turma[]> {
  return api.get<Turma[]>("/turmas", { query: { anoLetivoId } });
}