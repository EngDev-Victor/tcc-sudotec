import { api } from "@/services/api";
import type { Dashboard } from "@/types/entidades";

/** GET /dashboard/gestor — sem anoLetivoId, usa o ano letivo ativo */
export function buscarDashboard(anoLetivoId?: number): Promise<Dashboard> {
  return api.get<Dashboard>("/dashboard/gestor", { query: { anoLetivoId } });
}