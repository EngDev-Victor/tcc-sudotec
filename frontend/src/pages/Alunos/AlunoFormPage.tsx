import { useEffect, useState } from "react";
import { Save, Loader2, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { PageHeader } from "@/components/PageHeader";
import { BTN_PRIMARIO, BTN_SECUNDARIO } from "@/components/estilos";
import { atualizarAluno, buscarAluno, criarAluno, type DadosAluno } from "@/services/alunos";
import type { Aluno } from "@/types/entidades";
import { errosPorCampo, mensagemDeErro } from "@/utils/erros";
import { dataParaInput, formatarCPF, formatarTelefone, somenteDigitos } from "@/utils/formatacao";

type Form = Record<keyof DadosAluno, string>;

const FORM_VAZIO: Form = {
  nome: "",
  email: "",
  matricula: "",
  cpf: "",
  dataNascimento: "",
  nomeResponsavel: "",
  telefone: "",
};

function formDoAluno(a: Aluno): Form {
  return {
    nome: a.nome,
    email: a.email,
    matricula: a.matricula,
    cpf: formatarCPF(a.cpf),
    dataNascimento: dataParaInput(a.dataNascimento),
    nomeResponsavel: a.nomeResponsavel,
    telefone: formatarTelefone(a.telefone),
  };
}

/** Valores enviados à API: textos sem espaços nas pontas, CPF e telefone só com dígitos */
function paraApi(f: Form): DadosAluno {
  return {
    nome: f.nome.trim(),
    email: f.email.trim().toLowerCase(),
    matricula: f.matricula.trim(),
    cpf: somenteDigitos(f.cpf),
    dataNascimento: f.dataNascimento,
    nomeResponsavel: f.nomeResponsavel.trim(),
    telefone: somenteDigitos(f.telefone),
  };
}

// Conferência básica no navegador; a validação completa (dígitos do CPF, DDD...) é da API
function validar(d: DadosAluno): Record<string, string> {
  const e: Record<string, string> = {};
  (Object.keys(d) as (keyof DadosAluno)[]).forEach((c) => {
    if (!d[c]) e[c] = "Campo obrigatório.";
  });
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email = "E-mail inválido.";
  if (d.cpf && d.cpf.length !== 11) e.cpf = "O CPF deve ter 11 dígitos.";
  if (d.telefone && (d.telefone.length < 10 || d.telefone.length > 11))
    e.telefone = "Informe DDD + número (10 ou 11 dígitos).";
  if (d.dataNascimento && d.dataNascimento > new Date().toISOString().slice(0, 10))
    e.dataNascimento = "A data de nascimento não pode estar no futuro.";
  return e;
}

export function AlunoFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const alunoId = id ? Number(id) : null;
  const editando = alunoId !== null;
  const voltar = () => navigate("/alunos");

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(editando);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (alunoId === null) return;
    setCarregando(true);
    buscarAluno(alunoId)
      .then((a) => {
        setAluno(a);
        setForm(formDoAluno(a));
      })
      .catch((e) => setErroCarga(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }, [alunoId]);

  const set = (campo: keyof Form, valor: string) => {
    if (campo === "cpf") valor = formatarCPF(valor);
    if (campo === "telefone") valor = formatarTelefone(valor);
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: "" }));
  };

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const dados = paraApi(form);
    const e = validar(dados);
    if (Object.keys(e).length) {
      setErros(e);
      return;
    }

    setSalvando(true);
    try {
      if (aluno) {
        // PUT: só o que mudou
        const original = paraApi(formDoAluno(aluno));
        const alterados: Partial<DadosAluno> = {};
        (Object.keys(dados) as (keyof DadosAluno)[]).forEach((c) => {
          if (dados[c] !== original[c]) alterados[c] = dados[c];
        });
        if (Object.keys(alterados).length === 0) {
          toast.info("Nenhuma alteração para salvar.");
          return;
        }
        await atualizarAluno(aluno.id, alterados);
        toast.success(`Cadastro de ${dados.nome} atualizado.`);
      } else {
        await criarAluno(dados);
        toast.success(`${dados.nome} foi cadastrado.`);
      }
      voltar();
    } catch (erro) {
      const porCampo = errosPorCampo(erro);
      setErros(porCampo);
      if (Object.keys(porCampo).length === 0) toast.error(mensagemDeErro(erro));
      else toast.error("Confira os campos destacados.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        Carregando cadastro...
      </div>
    );
  }

  if (erroCarga) {
    return (
      <div className="p-8">
        <PageHeader title="Editar cadastro" onBack={voltar} />
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 max-w-2xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{erroCarga}</p>
        </div>
      </div>
    );
  }

  const campo = (nome: keyof Form, label: string, extra: Partial<Parameters<typeof InputField>[0]> = {}) => (
    <InputField
      label={label}
      value={form[nome]}
      onChange={(v) => set(nome, v)}
      erro={erros[nome]}
      disabled={salvando}
      {...extra}
    />
  );

  return (
    <div className="p-8">
      <PageHeader
        title={editando ? "Editar cadastro" : "Cadastro de Aluno"}
        subtitle={
          editando
            ? `Atualize os dados de ${aluno?.nome ?? "aluno"}`
            : "Preencha os dados do aluno. A matrícula em turma é feita depois, na tela de Matrículas."
        }
        onBack={voltar}
        actions={aluno && <Badge tom={aluno.ativo ? "verde" : "vermelho"}>{aluno.ativo ? "Ativo" : "Inativo"}</Badge>}
      />
      <Card className="max-w-2xl">
        <form onSubmit={salvar} noValidate>
          <div className="p-6 grid grid-cols-2 gap-4">
            <div className="col-span-2">{campo("nome", "Nome completo", { placeholder: "Nome completo do aluno" })}</div>
            {campo("email", "E-mail", { type: "email", placeholder: "email@escola.com" })}
            {campo("matricula", "Nº de matrícula", { placeholder: "Ex.: 2026-001" })}
            {campo("cpf", "CPF", { placeholder: "000.000.000-00" })}
            {campo("dataNascimento", "Data de nascimento", {
              type: "date",
              max: new Date().toISOString().slice(0, 10),
            })}
            {campo("nomeResponsavel", "Nome do responsável", { placeholder: "Nome completo" })}
            {campo("telefone", "Telefone de contato", { placeholder: "(46) 99999-9999" })}
          </div>
          <div className="px-6 py-4 border-t border-border bg-[#F8FAFB] flex justify-end gap-3">
            <button type="button" onClick={voltar} className={BTN_SECUNDARIO} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className={BTN_PRIMARIO} disabled={salvando}>
              {salvando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {editando ? "Salvar alterações" : "Salvar Aluno"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}