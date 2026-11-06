import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";
import { SelectField } from "@/components/SelectField";
import { BTN_PRIMARIO, BTN_SECUNDARIO } from "@/components/estilos";
import { transferirMatricula } from "@/services/matriculas";
import { listarTurmas } from "@/services/turmas";
import type { Turma } from "@/types/entidades";
import { ROTULO_TURNO } from "@/types/enums";
import { mensagemDeErro } from "@/utils/erros";

export type MatriculaParaTransferir = {
  matriculaId: number;
  alunoNome: string;
  turma: { id: number; nome: string; anoLetivoId: number };
};

/**
 * Transferência para outra turma do MESMO ano letivo (contrato 6.10).
 * A matrícula atual vira TRANSFERIDA e uma nova ATIVA é criada no destino.
 */
export function TransferirModal({
  matricula,
  aoFechar,
  aoTransferir,
}: {
  matricula: MatriculaParaTransferir | null;
  aoFechar: () => void;
  aoTransferir: () => void;
}) {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [destino, setDestino] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!matricula) return;
    setDestino("");
    setErro("");
    setCarregando(true);
    listarTurmas(matricula.turma.anoLetivoId)
      .then((l) =>
        setTurmas(
          l
            .filter((t) => t.id !== matricula.turma.id)
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })),
        ),
      )
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }, [matricula]);

  async function confirmar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!matricula) return;
    if (!destino) {
      setErro("Escolha a turma de destino.");
      return;
    }
    setSalvando(true);
    try {
      const nova = await transferirMatricula(matricula.matriculaId, Number(destino));
      toast.success(`${matricula.alunoNome} foi transferido para ${nova.turma.nome}.`);
      aoTransferir();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      aberto={matricula !== null}
      aoFechar={() => !salvando && aoFechar()}
      titulo={`Transferir ${matricula?.alunoNome ?? ""}`}
      descricao="Só é possível transferir para outra turma do mesmo ano letivo. A matrícula atual fica no histórico como TRANSFERIDA."
    >
      <form onSubmit={confirmar} className="space-y-4" noValidate>
        <div className="flex items-center gap-3 bg-[#F4F6F8] rounded-xl p-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Turma atual</p>
            <p className="text-sm font-bold text-foreground truncate">{matricula?.turma.nome}</p>
          </div>
          <ArrowRight size={16} className="text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Destino</p>
            <p className="text-sm font-bold text-foreground truncate">
              {turmas.find((t) => String(t.id) === destino)?.nome ?? "—"}
            </p>
          </div>
        </div>
        <SelectField
          label="Turma de destino"
          value={destino}
          onChange={(v) => {
            setDestino(v);
            setErro("");
          }}
          options={turmas.map((t) => ({ value: String(t.id), label: `${t.nome} • ${ROTULO_TURNO[t.turno]} • ${t.sala}` }))}
          placeholder={carregando ? "Carregando turmas..." : turmas.length ? "Selecione..." : "Nenhuma outra turma neste ano"}
          erro={erro}
          disabled={salvando || carregando}
        />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={BTN_SECUNDARIO} onClick={aoFechar} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" className={BTN_PRIMARIO} disabled={salvando || carregando || turmas.length === 0}>
            {salvando && <Loader2 size={14} className="animate-spin" />}
            Transferir
          </button>
        </div>
      </form>
    </Modal>
  );
}