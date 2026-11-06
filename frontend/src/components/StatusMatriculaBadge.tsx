import { Badge, type TomBadge } from "@/components/Badge";
import { ROTULO_STATUS_MATRICULA, type StatusMatricula } from "@/types/enums";

const TOM: Record<StatusMatricula, TomBadge> = {
  ATIVA: "verde",
  SUSPENSA: "ambar",
  TRANSFERIDA: "azul",
  CANCELADA: "vermelho",
  CONCLUIDA: "cinza",
};

export function StatusMatriculaBadge({ status }: { status: StatusMatricula }) {
  return <Badge tom={TOM[status]}>{ROTULO_STATUS_MATRICULA[status]}</Badge>;
}