import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InputField } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import { SelectField } from "@/components/SelectField";
import { BTN_PRIMARIO, BTN_SECUNDARIO } from "@/components/estilos";
import { criarUsuario } from "@/services/usuarios";
import { PAPEIS, ROTULO_PAPEL, type Papel } from "@/types/enums";
import { errosPorCampo, mensagemDeErro } from "@/utils/erros";

type Form = { nome: string; email: string; senha: string; confirmacao: string; papel: string };
const VAZIO: Form = { nome: "", email: "", senha: "", confirmacao: "", papel: "GESTOR" };

export function NovoUsuarioModal({
  aberto,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [form, setForm] = useState<Form>(VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setForm(VAZIO);
      setErros({});
    }
  }, [aberto]);

  const set = (campo: keyof Form, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: "" }));
  };

  function validar(): Record<string, string> {
    const e: Record<string, string> = {};
    const nome = form.nome.trim();
    const email = form.email.trim();
    if (!nome) e.nome = "Campo obrigatório.";
    else if (nome.length > 120) e.nome = "Máximo de 120 caracteres.";
    if (!email) e.email = "Campo obrigatório.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "E-mail inválido.";
    if (!form.senha) e.senha = "Campo obrigatório.";
    else if (form.senha.length < 8) e.senha = "A senha deve ter no mínimo 8 caracteres.";
    else if (form.senha.length > 72) e.senha = "A senha deve ter no máximo 72 caracteres.";
    if (form.senha && form.confirmacao !== form.senha) e.confirmacao = "As senhas não conferem.";
    if (!form.papel) e.papel = "Campo obrigatório.";
    return e;
  }

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validar();
    if (Object.keys(e).length) {
      setErros(e);
      return;
    }
    setSalvando(true);
    try {
      const u = await criarUsuario({
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        senha: form.senha,
        papel: form.papel as Papel,
      });
      toast.success(`Conta de ${u.nome} criada.`);
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
      titulo="Nova conta de acesso"
      descricao="A conta é independente dos cadastros de alunos e professores. Neste MVP, só contas de Gestor acessam o sistema."
    >
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <InputField label="Nome" value={form.nome} onChange={(v) => set("nome", v)} erro={erros.nome} disabled={salvando} />
        <InputField
          label="E-mail"
          type="email"
          value={form.email}
          onChange={(v) => set("email", v)}
          placeholder="usuario@escola.com"
          erro={erros.email}
          disabled={salvando}
        />
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Senha"
            type="password"
            value={form.senha}
            onChange={(v) => set("senha", v)}
            placeholder="Mínimo de 8 caracteres"
            erro={erros.senha}
            disabled={salvando}
          />
          <InputField
            label="Confirmar senha"
            type="password"
            value={form.confirmacao}
            onChange={(v) => set("confirmacao", v)}
            erro={erros.confirmacao}
            disabled={salvando}
          />
        </div>
        <SelectField
          label="Papel"
          value={form.papel}
          onChange={(v) => set("papel", v)}
          options={PAPEIS.map((p) => ({ value: p, label: ROTULO_PAPEL[p] }))}
          erro={erros.papel}
          disabled={salvando}
        />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={BTN_SECUNDARIO} onClick={aoFechar} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" className={BTN_PRIMARIO} disabled={salvando}>
            {salvando && <Loader2 size={14} className="animate-spin" />}
            Criar conta
          </button>
        </div>
      </form>
    </Modal>
  );
}