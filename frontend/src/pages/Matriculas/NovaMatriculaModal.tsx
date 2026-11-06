import { useEffect, useState } from "react";
import { Loader2, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AvatarIcon } from "@/components/AvatarIcon";
import { BuscaAluno } from "@/components/BuscaAluno";
import { Modal } from "@/components/Modal";
import { SelectField } from "@/components/SelectField";
import { BTN_PRIMARIO, BTN_SECUNDARIO } from "@/components/estilos";
import { listarAnosLetivos } from "@/services/anosLetivos";
import { criarMatricula } from "@/services/matriculas";
import { listarTurmas } from "@/services/turmas";
import type { Aluno, Turma } from "@/types/entidades";
import { mensagemDeErro } from "@/utils/erros";

type AlunoEscolhido = Pick<Aluno, "id" | "nome" | "matricula">;

/**
 * Nova matrícula. Só aparecem turmas do ano letivo ativo ou de anos futuros
 * (rematrícula antecipada), que são as únicas aceitas pela API (contrato 6.4 e 6.10).
 */
export function NovaMatriculaModal({
  aberto,
  alunoPadrao = null,
  turmaPadraoId = null,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  alunoPadrao?: AlunoEscolhido | null;
  turmaPadraoId?: number | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [aluno, setAluno] = useState<AlunoEscolhido | null>(null);

  const [turmas, setTurmas] = useState<(Turma & { ano: number })[]>([]);
  const [semAnoAtivo, setSemAnoAtivo] = useState(false);
  const [turmaId, setTurmaId] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  // Ao abrir: limpa o formulário e carrega as turmas que aceitam matrícula
  useEffect(() => {
    if (!aberto) return;
    setAluno(alunoPadrao);
    setErros({});
    setTurmaId(turmaPadraoId ? String(turmaPadraoId) : "");
    Promise.all([listarAnosLetivos(), listarTurmas()])
      .then(([anos, todas]) => {
        const ativo = anos.find((a) => a.ativo);
        setSemAnoAtivo(!ativo);
        if (!ativo) {
          setTurmas([]);
          return;
        }
        const anoDe = new Map(anos.map((a) => [a.id, a.ano]));
        setTurmas(
          todas
            .map((t) => ({ ...t, ano: anoDe.get(t.anoLetivoId) ?? 0 }))
            .filter((t) => t.ano >= ativo.ano)
            .sort((a, b) => a.ano - b.ano || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })),
        );
      })
      .catch((e) => toast.error(mensagemDeErro(e)));
  }, [aberto, alunoPadrao, turmaPadraoId]);

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!aluno) e.aluno = "Escolha o aluno.";
    if (!turmaId) e.turmaId = "Escolha a turma.";
    if (Object.keys(e).length) {
      setErros(e);
      return;
    }
    setSalvando(true);
    try {
      const m = await criarMatricula(aluno!.id, Number(turmaId));
      toast.success(`${aluno!.nome} foi matriculado na turma ${m.turma.nome}.`);
      aoSalvar();
    } catch (erro) {
      const msg = mensagemDeErro(erro);
      // 409: aluno inativo / já tem matrícula ativa no ano → campo aluno; ano letivo → campo turma
      if (/aluno/i.test(msg)) setErros({ aluno: msg });
      else if (/turma|ano letivo/i.test(msg)) setErros({ turmaId: msg });
      else toast.error(msg);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={() => !salvando && aoFechar()}
      titulo="Nova matrícula"
      descricao="Cada aluno pode ter uma matrícula ativa por ano letivo. Turmas de anos futuros aceitam rematrícula antecipada."
    >
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Aluno</label>
          {aluno ? (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-[#F8FAFB]">
              <AvatarIcon name={aluno.nome} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">{aluno.nome}</p>
                <p className="text-xs text-muted-foreground">Matrícula {aluno.matricula}</p>
              </div>
              {!alunoPadrao && (
                <button
                  type="button"
                  title="Trocar aluno"
                  onClick={() => setAluno(null)}
                  className="p-1 rounded-lg hover:bg-muted transition-colors"
                  disabled={salvando}
                >
                  <X size={14} className="text-muted-foreground" />
                </button>
              )}
            </div>
          ) : (
            <BuscaAluno
              somenteAtivos
              placeholder="Digite ao menos 2 letras do nome..."
              erro={erros.aluno}
              disabled={salvando}
              onEscolher={(a) => {
                setAluno(a);
                setErros((x) => ({ ...x, aluno: "" }));
              }}
            />
          )}
          {erros.aluno && <p className="text-xs text-red-600 font-medium mt-1">{erros.aluno}</p>}
        </div>

        {semAnoAtivo ? (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium">
              Nenhum ano letivo está ativo. Ative um ano letivo antes de matricular.
            </p>
          </div>
        ) : (
          <SelectField
            label="Turma"
            value={turmaId}
            onChange={(v) => {
              setTurmaId(v);
              setErros((x) => ({ ...x, turmaId: "" }));
            }}
            options={turmas.map((t) => ({ value: String(t.id), label: `${t.nome} • ${t.ano}` }))}
            erro={erros.turmaId}
            disabled={salvando}
          />
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={BTN_SECUNDARIO} onClick={aoFechar} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" className={BTN_PRIMARIO} disabled={salvando || semAnoAtivo}>
            {salvando && <Loader2 size={14} className="animate-spin" />}
            Matricular
          </button>
        </div>
      </form>
    </Modal>
  );
}