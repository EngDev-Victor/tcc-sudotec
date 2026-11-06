import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { BTN_PRIMARIO } from "@/components/estilos";
import type { AlunoReativado } from "@/types/entidades";

/** Mostra o resultado da reativação quando alguma matrícula continuou suspensa. */
export function ResultadoReativacaoModal({
  resultado,
  nomesTurmas,
  aoFechar,
}: {
  resultado: AlunoReativado | null;
  nomesTurmas: Map<number, string>;
  aoFechar: () => void;
}) {
  const restauradas = resultado?.matriculasRestauradas.length ?? 0;

  return (
    <Modal
      aberto={resultado !== null}
      aoFechar={aoFechar}
      titulo={`${resultado?.nome ?? ""} foi reativado`}
      descricao="Algumas matrículas não puderam voltar a ficar ativas."
      rodape={
        <button className={BTN_PRIMARIO} onClick={aoFechar}>
          Entendi
        </button>
      }
    >
      {resultado && (
        <div className="space-y-3">
          {restauradas > 0 && (
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-800 font-medium">
                {restauradas} {restauradas === 1 ? "matrícula voltou" : "matrículas voltaram"} a ficar ativa.
              </p>
            </div>
          )}
          <div className="border border-amber-200 rounded-xl divide-y divide-amber-100">
            {resultado.matriculasMantidasSuspensas.map((m) => (
              <div key={m.matriculaId} className="flex items-start gap-2.5 p-3 bg-amber-50/50">
                <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Matrícula #{m.matriculaId} • turma {nomesTurmas.get(m.turmaId) ?? `#${m.turmaId}`}
                  </p>
                  <p className="text-xs text-amber-800 font-medium mt-0.5">Continua suspensa: {m.motivo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}