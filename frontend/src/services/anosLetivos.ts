import { api } from "@/services/api";
import type { AnoLetivoListagem } from "@/types/entidades";

/** GET /anos-letivos — do mais recente para o mais antigo */
export function listarAnosLetivos(): Promise<AnoLetivoListagem[]> {
  return api.get<AnoLetivoListagem[]>("/anos-letivos");
}