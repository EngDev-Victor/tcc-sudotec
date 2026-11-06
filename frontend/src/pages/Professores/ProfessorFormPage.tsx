import { useEffect, useState } from "react";
import { Save, Loader2, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { PageHeader } from "@/components/PageHeader";
import { SelectField } from "@/components/SelectField";
import { BTN_PRIMARIO, BTN_SECUNDARIO } from "@/components/estilos";
import { listarDisciplinas } from "@/services/disciplinas";
import {
  atualizarProfessor,
  buscarProfessor,
  criarProfessor,
  type DadosProfessor,
} from "@/services/professores";
import type { Disciplina, Professor } from "@/types/entidades";
import { ROTULO_TITULACAO, TITULACOES, type Titulacao } from "@/types/enums";
import { errosPorCampo, mensagemDeErro } from "@/utils/erros";
import { formatarTelefone, somenteDigitos } from "@/utils/formatacao";

type Form = {
  nome: string;
  email: string;
  especialidade: string;
  telefone: string;
  titulacao: string;
  disciplinaPrincipalId: string;
};

const FORM_VAZIO: Form = {
  nome: "",
  email: "",
  especialidade: "",
  telefone: "",
  titulacao: "",
  disciplinaPrincipalId: "",
};

function formDoProfessor(p: Professor): Form {
  return {
    nome: p.nome,
    email: p.email,
    especialidade: p.especialidade,
    telefone: formatarTelefone(p.telefone),
    titulacao: p.titulacao,
    disciplinaPrincipalId: p.disciplinaPrincipalId ? String(p.disciplinaPrincipalId) : "",
  };
}

function paraApi(f: Form): DadosProfessor {
  return {
    nome: f.nome.trim(),
    email: f.email.trim().toLowerCase(),
    especialidade: f.especialidade.trim(),
    telefone: somenteDigitos(f.telefone),
    titulacao: f.titulacao as Titulacao,
    disciplinaPrincipalId: f.disciplinaPrincipalId ? Number(f.disciplinaPrincipalId) : null,
  };
}

function validar(d: DadosProfessor): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.nome) e.nome = "Campo obrigatório.";
  if (!d.email) e.email = "Campo obrigatório.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email = "E-mail inválido.";
  if (!d.especialidade) e.especialidade = "Campo obrigatório.";
  if (!d.telefone) e.telefone = "Campo obrigatório.";
  else if (d.telefone.length < 10 || d.telefone.length > 11) e.telefone = "Informe DDD + número (10 ou 11 dígitos).";
  if (!d.titulacao) e.titulacao = "Campo obrigatório.";
  return e;
}

export function ProfessorFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const professorId = id ? Number(id) : null;
  const editando = professorId !== null;
  const voltar = () => navigate("/professores");

  const [professor, setProfessor] = useState<Professor | null>(null);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setCarregando(true);
    Promise.all([listarDisciplinas(), professorId !== null ? buscarProfessor(professorId) : Promise.resolve(null)])
      .then(([lista, p]) => {
        setDisciplinas([...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
        if (p) {
          setProfessor(p);
          setForm(formDoProfessor(p));
        }
      })
      .catch((e) => setErroCarga(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }, [professorId]);

  const set = (campo: keyof Form, valor: string) => {
    if (campo === "telefone") valor = formatarTelefone(valor);
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: "" }));
  };

  // Só disciplinas ativas podem virar disciplina principal.
  // A atual continua na lista mesmo se tiver sido inativada (reenviá-la é aceito pela API).
  const opcoesDisciplina = disciplinas
    .filter((d) => d.ativo || d.id === professor?.disciplinaPrincipalId)
    .map((d) => ({ value: String(d.id), label: d.ativo ? d.nome : `${d.nome} (inativa)` }));

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
      if (professor) {
        const original = paraApi(formDoProfessor(professor));
        const alterados: Partial<DadosProfessor> = {};
        (Object.keys(dados) as (keyof DadosProfessor)[]).forEach((c) => {
          if (dados[c] !== original[c]) (alterados as Record<string, unknown>)[c] = dados[c];
        });
        if (Object.keys(alterados).length === 0) {
          toast.info("Nenhuma alteração para salvar.");
          return;
        }
        await atualizarProfessor(professor.id, alterados);
        toast.success(`Cadastro de ${dados.nome} atualizado.`);
      } else {
        await criarProfessor(dados);
        toast.success(`${dados.nome} foi cadastrado.`);
      }
      voltar();
    } catch (erro) {
      const porCampo = errosPorCampo(erro);
      setErros(porCampo);
      // 404/409 da disciplina principal (inexistente ou inativa) vêm sem campo: mostra no select
      if (Object.keys(porCampo).length === 0) {
        const msg = mensagemDeErro(erro);
        if (/disciplina/i.test(msg)) setErros({ disciplinaPrincipalId: msg });
        toast.error(msg);
      } else {
        toast.error("Confira os campos destacados.");
      }
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        Carregando...
      </div>
    );
  }

  if (erroCarga) {
    return (
      <div className="p-8">
        <PageHeader title={editando ? "Editar professor" : "Cadastro de Professor"} onBack={voltar} />
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
        title={editando ? "Editar professor" : "Cadastro de Professor"}
        subtitle={editando ? `Atualize os dados de ${professor?.nome ?? "professor"}` : "Preencha os dados do novo docente"}
        onBack={voltar}
        actions={
          professor && <Badge tom={professor.ativo ? "verde" : "vermelho"}>{professor.ativo ? "Ativo" : "Inativo"}</Badge>
        }
      />
      <Card className="max-w-2xl">
        <form onSubmit={salvar} noValidate>
          <div className="p-6 grid grid-cols-2 gap-4">
            <div className="col-span-2">{campo("nome", "Nome completo", { placeholder: "Nome completo do professor" })}</div>
            {campo("email", "E-mail institucional", { type: "email", placeholder: "professor@escola.com" })}
            {campo("telefone", "Telefone", { placeholder: "(46) 99999-9999" })}
            {campo("especialidade", "Especialidade", { placeholder: "Ex.: Matemática" })}
            <SelectField
              label="Titulação"
              value={form.titulacao}
              onChange={(v) => set("titulacao", v)}
              options={TITULACOES.map((t) => ({ value: t, label: ROTULO_TITULACAO[t] }))}
              erro={erros.titulacao}
              disabled={salvando}
            />
            <div className="col-span-2">
              <SelectField
                label="Disciplina principal (opcional)"
                value={form.disciplinaPrincipalId}
                onChange={(v) => set("disciplinaPrincipalId", v)}
                options={opcoesDisciplina}
                placeholder="Nenhuma"
                erro={erros.disciplinaPrincipalId}
                disabled={salvando}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Só disciplinas ativas podem ser escolhidas. As turmas em que o professor leciona são definidas em Alocações.
              </p>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border bg-[#F8FAFB] flex justify-end gap-3">
            <button type="button" onClick={voltar} className={BTN_SECUNDARIO} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className={BTN_PRIMARIO} disabled={salvando}>
              {salvando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {editando ? "Salvar alterações" : "Salvar Professor"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}