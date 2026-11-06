import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InputField } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import { BTN_PRIMARIO, BTN_SECUNDARIO } from "@/components/estilos";
import { atualizarAnoLetivo, criarAnoLetivo, type DadosAnoLetivo } from "@/services/anosLetivos";
import type { AnoLetivo } from "@/types/entidades";
import { errosPorCampo, mensagemDeErro } from "@/utils/erros";
import { dataParaInput } from "@/utils/formatacao";

type Form = { ano: string; dataInicio: string; dataFim: string };

/** Criação (anoLetivo = null) ou edição de ano letivo. */
export function AnoLetivoFormModal({
  aberto,
  anoLetivo,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  anoLetivo: AnoLetivo | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const editando = anoLetivo !== null;
  const [form, setForm] = useState<Form>({ ano: "", dataInicio: "", dataFim: "" });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setErros({});
    setForm(
      anoLetivo
        ? {
            ano: String(anoLetivo.ano),
            dataInicio: dataParaInput(anoLetivo.dataInicio),
            dataFim: dataParaInput(anoLetivo.dataFim),
          }
        : { ano: String(new Date().getFullYear() + 1), dataInicio: "", dataFim: "" },
    );
  }, [aberto, anoLetivo]);

  const set = (campo: keyof Form, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: "" }));
  };

  // Validação básica no navegador; as regras completas são da API
  function validar(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!form.ano) e.ano = "Campo obrigatório.";
    if (!form.dataInicio) e.dataInicio = "Campo obrigatório.";
    if (!form.dataFim) e.dataFim = "Campo obrigatório.";
    if (form.dataInicio && form.dataFim && form.dataFim <= form.dataInicio)
      e.dataFim = "A data de término deve ser posterior à data de início.";
    // Mesma regra da API: início e término no próprio ano
    const ano = Number(form.ano);
    if (ano && form.dataInicio && Number(form.dataInicio.slice(0, 4)) !== ano)
      e.dataInicio = `A data de início deve estar no ano ${ano}.`;
    if (ano && form.dataFim && !e.dataFim && Number(form.dataFim.slice(0, 4)) !== ano)
      e.dataFim = `A data de término deve estar no ano ${ano}.`;
    return e;
  }

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validar();
    if (Object.keys(e).length) {
      setErros(e);
      return;
    }
    const dados: DadosAnoLetivo = { ano: Number(form.ano), dataInicio: form.dataInicio, dataFim: form.dataFim };

    setSalvando(true);
    try {
      if (anoLetivo) {
        const mudou =
          dados.ano !== anoLetivo.ano ||
          dados.dataInicio !== dataParaInput(anoLetivo.dataInicio) ||
          dados.dataFim !== dataParaInput(anoLetivo.dataFim);
        if (!mudou) {
          aoFechar();
          return;
        }
        // Envia ano e datas juntos: a API confere se o período pertence ao ano
        // e devolve o erro no campo certo (dataInicio / dataFim)
        await atualizarAnoLetivo(anoLetivo.id, dados);
        toast.success(`Ano letivo ${dados.ano} atualizado.`);
      } else {
        await criarAnoLetivo(dados);
        toast.success(`Ano letivo ${dados.ano} cadastrado. Ele começa inativo.`);
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
      titulo={editando ? `Editar ano letivo ${anoLetivo.ano}` : "Novo ano letivo"}
      descricao={editando ? undefined : "O ano é cadastrado inativo. Use \"Ativar\" quando ele começar."}
    >
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <InputField
          label="Ano"
          type="number"
          min={2000}
          max={2100}
          value={form.ano}
          onChange={(v) => set("ano", v)}
          erro={erros.ano}
          disabled={salvando}
        />
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Data de início"
            type="date"
            value={form.dataInicio}
            onChange={(v) => set("dataInicio", v)}
            erro={erros.dataInicio}
            disabled={salvando}
          />
          <InputField
            label="Data de término"
            type="date"
            value={form.dataFim}
            onChange={(v) => set("dataFim", v)}
            erro={erros.dataFim}
            disabled={salvando}
          />
        </div>
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