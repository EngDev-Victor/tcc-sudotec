import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";
import { SelectField } from "@/components/SelectField";
import { BTN_PRIMARIO, BTN_SECUNDARIO } from "@/components/estilos";
import { atualizarAlocacao, criarAlocacao, type DadosAlocacao } from "@/services/alocacoes";
import type { Alocacao, Disciplina, Professor, Turma } from "@/types/entidades";
import { errosPorCampo, mensagemDeErro } from "@/utils/erros";

type Form = { turmaId: string; professorId: string; disciplinaId: string };

/** Criação (alocacao = null) ou edição de alocação professor × turma × disciplina. */
export function AlocacaoFormModal({
  aberto,
  alocacao,
  turmas,
  professores,
  disciplinas,
  turmaPadraoId,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  alocacao: Alocacao | null;
  /** Turmas do ano letivo selecionado */
  turmas: Turma[];
  /** Professores ativos */
  professores: Professor[];
  /** Disciplinas ativas */
  disciplinas: Disciplina[];
  turmaPadraoId: number | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const editando = alocacao !== null;
  const [form, setForm] = useState<Form>({ turmaId: "", professorId: "", disciplinaId: "" });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setErros({});
    setForm(
      alocacao
        ? {
            turmaId: String(alocacao.turmaId),
            professorId: String(alocacao.professorId),
            disciplinaId: String(alocacao.disciplinaId),
          }
        : { turmaId: turmaPadraoId ? String(turmaPadraoId) : "", professorId: "", disciplinaId: "" },
    );
  }, [aberto, alocacao, turmaPadraoId]);

  const set = (campo: keyof Form, valor: string) => {
    setForm((f) => {
      const novo = { ...f, [campo]: valor };
      // Ao escolher o professor numa alocação nova, sugere a disciplina principal dele
      if (campo === "professorId" && !editando && !f.disciplinaId) {
        const p = professores.find((x) => String(x.id) === valor);
        if (p?.disciplinaPrincipalId && disciplinas.some((d) => d.id === p.disciplinaPrincipalId))
          novo.disciplinaId = String(p.disciplinaPrincipalId);
      }
      return novo;
    });
    setErros((e) => ({ ...e, [campo]: "" }));
  };

  // Na edição, mantém na lista o professor/disciplina atuais mesmo se estiverem inativos
  // (a API vai recusar com 409 se eles continuarem selecionados)
  const opcoesProfessor = [
    ...(alocacao && !professores.some((p) => p.id === alocacao.professorId)
      ? [{ value: String(alocacao.professorId), label: `${alocacao.professor.nome} (inativo)` }]
      : []),
    ...professores.map((p) => ({ value: String(p.id), label: `${p.nome} — ${p.especialidade}` })),
  ];
  const opcoesDisciplina = [
    ...(alocacao && !disciplinas.some((d) => d.id === alocacao.disciplinaId)
      ? [{ value: String(alocacao.disciplinaId), label: `${alocacao.disciplina.nome} (inativa)` }]
      : []),
    ...disciplinas.map((d) => ({ value: String(d.id), label: `${d.nome} (${d.cargaHoraria}h)` })),
  ];
  const opcoesTurma = [
    ...(alocacao && !turmas.some((t) => t.id === alocacao.turmaId)
      ? [{ value: String(alocacao.turmaId), label: alocacao.turma.nome }]
      : []),
    ...turmas.map((t) => ({ value: String(t.id), label: t.nome })),
  ];

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!form.turmaId) e.turmaId = "Campo obrigatório.";
    if (!form.professorId) e.professorId = "Campo obrigatório.";
    if (!form.disciplinaId) e.disciplinaId = "Campo obrigatório.";
    if (Object.keys(e).length) {
      setErros(e);
      return;
    }
    const dados: DadosAlocacao = {
      turmaId: Number(form.turmaId),
      professorId: Number(form.professorId),
      disciplinaId: Number(form.disciplinaId),
    };

    setSalvando(true);
    try {
      if (alocacao) {
        const alterados: Partial<DadosAlocacao> = {};
        if (dados.turmaId !== alocacao.turmaId) alterados.turmaId = dados.turmaId;
        if (dados.professorId !== alocacao.professorId) alterados.professorId = dados.professorId;
        if (dados.disciplinaId !== alocacao.disciplinaId) alterados.disciplinaId = dados.disciplinaId;
        if (Object.keys(alterados).length === 0) {
          aoFechar();
          return;
        }
        await atualizarAlocacao(alocacao.id, alterados);
        toast.success("Alocação atualizada.");
      } else {
        await criarAlocacao(dados);
        toast.success("Professor alocado.");
      }
      aoSalvar();
    } catch (erro) {
      const msg = mensagemDeErro(erro);
      const porCampo = errosPorCampo(erro);
      if (Object.keys(porCampo).length === 3) {
        // 409 de combinação repetida marca os três campos: mostra uma vez só
        setErros({ professorId: msg });
      } else if (Object.keys(porCampo).length > 0) {
        setErros(porCampo);
      } else if (/professor/i.test(msg)) {
        setErros({ professorId: msg });
      } else if (/disciplina/i.test(msg)) {
        setErros({ disciplinaId: msg });
      } else if (/turma/i.test(msg)) {
        setErros({ turmaId: msg });
      } else {
        toast.error(msg);
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={() => !salvando && aoFechar()}
      titulo={editando ? "Editar alocação" : "Alocar professor"}
      descricao="Define qual professor leciona qual disciplina na turma. Só professores e disciplinas ativos podem ser escolhidos."
    >
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <SelectField
          label="Turma"
          value={form.turmaId}
          onChange={(v) => set("turmaId", v)}
          options={opcoesTurma}
          erro={erros.turmaId}
          disabled={salvando}
        />
        <SelectField
          label="Professor"
          value={form.professorId}
          onChange={(v) => set("professorId", v)}
          options={opcoesProfessor}
          erro={erros.professorId}
          disabled={salvando}
        />
        <SelectField
          label="Disciplina"
          value={form.disciplinaId}
          onChange={(v) => set("disciplinaId", v)}
          options={opcoesDisciplina}
          erro={erros.disciplinaId}
          disabled={salvando}
        />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={BTN_SECUNDARIO} onClick={aoFechar} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" className={BTN_PRIMARIO} disabled={salvando}>
            {salvando && <Loader2 size={14} className="animate-spin" />}
            {editando ? "Salvar alterações" : "Alocar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}