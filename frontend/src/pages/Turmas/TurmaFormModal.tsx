import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InputField } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import { SelectField } from "@/components/SelectField";
import { BTN_PRIMARIO, BTN_SECUNDARIO } from "@/components/estilos";
import { atualizarTurma, criarTurma, type DadosTurma } from "@/services/turmas";
import type { AnoLetivo, Turma } from "@/types/entidades";
import { ROTULO_TURNO, TURNOS, type Turno } from "@/types/enums";
import { errosPorCampo, mensagemDeErro } from "@/utils/erros";

type Form = { nome: string; anoLetivoId: string; turno: string; sala: string };

/** Criação (turma = null) ou edição de turma. */
export function TurmaFormModal({
  aberto,
  turma,
  anos,
  anoPadraoId,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  turma: Turma | null;
  anos: AnoLetivo[];
  /** Ano já selecionado na tela, usado ao criar */
  anoPadraoId: number | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const editando = turma !== null;
  const [form, setForm] = useState<Form>({ nome: "", anoLetivoId: "", turno: "", sala: "" });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setErros({});
    setForm(
      turma
        ? { nome: turma.nome, anoLetivoId: String(turma.anoLetivoId), turno: turma.turno, sala: turma.sala }
        : { nome: "", anoLetivoId: anoPadraoId ? String(anoPadraoId) : "", turno: "", sala: "" },
    );
  }, [aberto, turma, anoPadraoId]);

  const set = (campo: keyof Form, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: "" }));
  };

  function validar(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = "Campo obrigatório.";
    else if (form.nome.trim().length > 40) e.nome = "Máximo de 40 caracteres.";
    if (!form.anoLetivoId) e.anoLetivoId = "Campo obrigatório.";
    if (!form.turno) e.turno = "Campo obrigatório.";
    if (!form.sala.trim()) e.sala = "Campo obrigatório.";
    else if (form.sala.trim().length > 30) e.sala = "Máximo de 30 caracteres.";
    return e;
  }

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validar();
    if (Object.keys(e).length) {
      setErros(e);
      return;
    }
    const dados: DadosTurma = {
      nome: form.nome.trim(),
      anoLetivoId: Number(form.anoLetivoId),
      turno: form.turno as Turno,
      sala: form.sala.trim(),
    };

    setSalvando(true);
    try {
      if (turma) {
        const alterados: Partial<DadosTurma> = {};
        if (dados.nome !== turma.nome) alterados.nome = dados.nome;
        if (dados.anoLetivoId !== turma.anoLetivoId) alterados.anoLetivoId = dados.anoLetivoId;
        if (dados.turno !== turma.turno) alterados.turno = dados.turno;
        if (dados.sala !== turma.sala) alterados.sala = dados.sala;
        if (Object.keys(alterados).length === 0) {
          aoFechar();
          return;
        }
        await atualizarTurma(turma.id, alterados);
        toast.success(`Turma ${dados.nome} atualizada.`);
      } else {
        await criarTurma(dados);
        toast.success(`Turma ${dados.nome} cadastrada.`);
      }
      aoSalvar();
    } catch (erro) {
      const porCampo = errosPorCampo(erro);
      // 409 de nome repetido marca nome e anoLetivoId: o aviso fica só no nome
      if (porCampo.nome && porCampo.anoLetivoId === porCampo.nome) delete porCampo.anoLetivoId;
      setErros(porCampo);
      if (Object.keys(porCampo).length === 0) {
        const msg = mensagemDeErro(erro);
        // 409 ao trocar o ano de turma com matrículas; 404 de ano inexistente
        if (/ano letivo/i.test(msg)) setErros({ anoLetivoId: msg });
        else toast.error(msg);
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={() => !salvando && aoFechar()}
      titulo={editando ? `Editar turma ${turma.nome}` : "Nova turma"}
    >
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Nome"
            value={form.nome}
            onChange={(v) => set("nome", v)}
            placeholder="Ex.: 6º A"
            erro={erros.nome}
            disabled={salvando}
          />
          <InputField
            label="Sala"
            value={form.sala}
            onChange={(v) => set("sala", v)}
            placeholder="Ex.: Sala 1"
            erro={erros.sala}
            disabled={salvando}
          />
          <SelectField
            label="Ano letivo"
            value={form.anoLetivoId}
            onChange={(v) => set("anoLetivoId", v)}
            options={anos.map((a) => ({ value: String(a.id), label: `${a.ano}${a.ativo ? " (ativo)" : ""}` }))}
            erro={erros.anoLetivoId}
            disabled={salvando}
          />
          <SelectField
            label="Turno"
            value={form.turno}
            onChange={(v) => set("turno", v)}
            options={TURNOS.map((t) => ({ value: t, label: ROTULO_TURNO[t] }))}
            erro={erros.turno}
            disabled={salvando}
          />
        </div>
        {editando && (
          <p className="text-xs text-muted-foreground">
            O ano letivo só pode ser trocado enquanto a turma não tiver matrículas.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={BTN_SECUNDARIO} onClick={aoFechar} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" className={BTN_PRIMARIO} disabled={salvando}>
            {salvando && <Loader2 size={14} className="animate-spin" />}
            {editando ? "Salvar alterações" : "Cadastrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}