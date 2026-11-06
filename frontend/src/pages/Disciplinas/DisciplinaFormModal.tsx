import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InputField } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import { BTN_PRIMARIO, BTN_SECUNDARIO } from "@/components/estilos";
import { atualizarDisciplina, criarDisciplina, type DadosDisciplina } from "@/services/disciplinas";
import type { Disciplina } from "@/types/entidades";
import { errosPorCampo, mensagemDeErro } from "@/utils/erros";

type Form = { nome: string; cargaHoraria: string };

/** Criação (disciplina = null) ou edição de disciplina. */
export function DisciplinaFormModal({
  aberto,
  disciplina,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  disciplina: Disciplina | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const editando = disciplina !== null;
  const [form, setForm] = useState<Form>({ nome: "", cargaHoraria: "" });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setErros({});
    setForm(
      disciplina
        ? { nome: disciplina.nome, cargaHoraria: String(disciplina.cargaHoraria) }
        : { nome: "", cargaHoraria: "" },
    );
  }, [aberto, disciplina]);

  const set = (campo: keyof Form, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: "" }));
  };

  function validar(): Record<string, string> {
    const e: Record<string, string> = {};
    const nome = form.nome.trim();
    if (!nome) e.nome = "Campo obrigatório.";
    else if (nome.length > 80) e.nome = "Máximo de 80 caracteres.";
    const carga = Number(form.cargaHoraria);
    if (!form.cargaHoraria) e.cargaHoraria = "Campo obrigatório.";
    else if (!Number.isInteger(carga) || carga < 1) e.cargaHoraria = "Informe um número inteiro maior que zero.";
    else if (carga > 2000) e.cargaHoraria = "Máximo de 2000 horas.";
    return e;
  }

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validar();
    if (Object.keys(e).length) {
      setErros(e);
      return;
    }
    const dados: DadosDisciplina = { nome: form.nome.trim(), cargaHoraria: Number(form.cargaHoraria) };

    setSalvando(true);
    try {
      if (disciplina) {
        const alterados: Partial<DadosDisciplina> = {};
        if (dados.nome !== disciplina.nome) alterados.nome = dados.nome;
        if (dados.cargaHoraria !== disciplina.cargaHoraria) alterados.cargaHoraria = dados.cargaHoraria;
        if (Object.keys(alterados).length === 0) {
          aoFechar();
          return;
        }
        await atualizarDisciplina(disciplina.id, alterados);
        toast.success(`Disciplina "${dados.nome}" atualizada.`);
      } else {
        await criarDisciplina(dados);
        toast.success(`Disciplina "${dados.nome}" cadastrada.`);
      }
      aoSalvar();
    } catch (erro) {
      const porCampo = errosPorCampo(erro);
      setErros(porCampo);
      if (Object.keys(porCampo).length === 0) toast.error(mensagemDeErro(erro));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={() => !salvando && aoFechar()}
      titulo={editando ? "Editar disciplina" : "Nova disciplina"}
      descricao={editando ? undefined : "A disciplina é cadastrada como ativa."}
    >
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <InputField
          label="Nome"
          value={form.nome}
          onChange={(v) => set("nome", v)}
          placeholder="Ex.: Matemática"
          erro={erros.nome}
          disabled={salvando}
        />
        <InputField
          label="Carga horária (horas)"
          type="number"
          min={1}
          max={2000}
          value={form.cargaHoraria}
          onChange={(v) => set("cargaHoraria", v)}
          placeholder="Ex.: 160"
          erro={erros.cargaHoraria}
          disabled={salvando}
        />
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