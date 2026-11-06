import { useCallback, useEffect, useState } from "react";
import { Plus, Edit, Trash2, BookMarked, Clock, Power, Loader2, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FiltroSituacao, situacaoParaAtivo, type Situacao } from "@/components/FiltroSituacao";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { BTN_PRIMARIO } from "@/components/estilos";
import {
  alterarAtivoDisciplina,
  excluirDisciplina,
  listarDisciplinas,
} from "@/services/disciplinas";
import type { Disciplina } from "@/types/entidades";
import { mensagemDeErro } from "@/utils/erros";
import { normalizar } from "@/utils/texto";
import { DisciplinaFormModal } from "@/pages/Disciplinas/DisciplinaFormModal";

export function DisciplinasPage() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [situacao, setSituacao] = useState<Situacao>("ativas");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Disciplina | null>(null);
  const [paraInativar, setParaInativar] = useState<Disciplina | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Disciplina | null>(null);
  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDisciplinas(await listarDisciplinas(situacaoParaAtivo(situacao)));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, [situacao]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // A lista não é paginada: a busca por nome é feita aqui, ignorando acentos
  const termo = normalizar(busca.trim());
  const filtradas = termo
    ? disciplinas.filter((d) => normalizar(d.nome).includes(termo))
    : disciplinas;

  async function reativar(d: Disciplina) {
    try {
      await alterarAtivoDisciplina(d.id, true);
      toast.success(`Disciplina "${d.nome}" reativada.`);
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e));
    }
  }

  async function confirmarInativacao() {
    if (!paraInativar) return;
    setProcessando(true);
    try {
      await alterarAtivoDisciplina(paraInativar.id, false);
      toast.success(`Disciplina "${paraInativar.nome}" inativada.`);
      setParaInativar(null);
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e));
    } finally {
      setProcessando(false);
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    setProcessando(true);
    try {
      await excluirDisciplina(paraExcluir.id);
      toast.success(`Disciplina "${paraExcluir.nome}" excluída.`);
      setParaExcluir(null);
      await carregar();
    } catch (e) {
      // 409: alocada em turmas ou disciplina principal de professores
      toast.error(mensagemDeErro(e));
      setParaExcluir(null);
    } finally {
      setProcessando(false);
    }
  }

  const textoQtd = `${disciplinas.length} disciplina${disciplinas.length !== 1 ? "s" : ""}`;

  return (
    <div className="p-8">
      <PageHeader
        title="Disciplinas"
        subtitle={
          carregando
            ? "Carregando..."
            : situacao === "todas"
              ? `${textoQtd} cadastrada${disciplinas.length !== 1 ? "s" : ""}`
              : `${textoQtd} ${situacao === "ativas" ? "ativa" : "inativa"}${disciplinas.length !== 1 ? "s" : ""}`
        }
        actions={
          <button
            className={BTN_PRIMARIO}
            onClick={() => {
              setEditando(null);
              setFormAberto(true);
            }}
          >
            <Plus size={14} />
            Nova Disciplina
          </button>
        }
      />

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <SearchInput value={busca} onChange={setBusca} placeholder="Buscar disciplina pelo nome..." />
        <FiltroSituacao valor={situacao} onChange={setSituacao} />
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium flex-1">{erro}</p>
          <button onClick={carregar} className="text-xs font-bold text-red-700 hover:underline">
            Tentar novamente
          </button>
        </div>
      )}

      {carregando && disciplinas.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Carregando disciplinas...
        </div>
      )}

      {!carregando && !erro && filtradas.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {busca ? "Nenhuma disciplina encontrada para essa busca." : "Nenhuma disciplina nesta lista."}
        </Card>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 ${carregando ? "opacity-60" : ""}`}>
        {filtradas.map((d) => (
          <Card key={d.id} className={`p-6 hover:shadow-md transition-shadow ${d.ativo ? "" : "bg-[#FAFBFC]"}`}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#0D2C3A]/8 flex items-center justify-center flex-shrink-0">
                  <BookMarked size={20} className={d.ativo ? "text-[#0D2C3A]" : "text-muted-foreground"} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-foreground leading-tight break-words">{d.nome}</h3>
                  <p className="text-xs text-muted-foreground font-semibold mt-0.5">Código #{d.id}</p>
                </div>
              </div>
              <Badge tom={d.ativo ? "verde" : "vermelho"}>{d.ativo ? "Ativa" : "Inativa"}</Badge>
            </div>

            <div className="bg-[#F4F6F8] rounded-xl p-3 mb-4 flex items-center gap-2.5">
              <Clock size={15} className="text-muted-foreground" />
              <p className="text-sm font-black text-foreground">{d.cargaHoraria}h</p>
              <p className="text-xs text-muted-foreground font-semibold">de carga horária</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditando(d);
                  setFormAberto(true);
                }}
                className="flex-1 py-2 text-xs font-bold rounded-xl border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
              >
                <Edit size={12} />
                Editar
              </button>
              {d.ativo ? (
                <button
                  onClick={() => setParaInativar(d)}
                  className="flex-1 py-2 text-xs font-bold rounded-xl border border-border hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Power size={12} />
                  Inativar
                </button>
              ) : (
                <button
                  onClick={() => reativar(d)}
                  className="flex-1 py-2 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Power size={12} />
                  Reativar
                </button>
              )}
              <button
                title="Excluir"
                onClick={() => setParaExcluir(d)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-border hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl p-4 mt-6">
        <Info size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-sky-800 font-medium leading-relaxed">
          Disciplinas inativas não recebem novas alocações nem podem ser escolhidas como disciplina principal de
          professor, mas as alocações existentes continuam no histórico. Só é possível excluir uma disciplina que
          não esteja alocada em turmas nem seja disciplina principal de algum professor.
        </p>
      </div>

      <DisciplinaFormModal
        aberto={formAberto}
        disciplina={editando}
        aoFechar={() => setFormAberto(false)}
        aoSalvar={() => {
          setFormAberto(false);
          carregar();
        }}
      />

      <ConfirmDialog
        aberto={paraInativar !== null}
        titulo={`Inativar "${paraInativar?.nome ?? ""}"?`}
        mensagem="Ela não poderá receber novas alocações nem ser disciplina principal de professores. As alocações atuais continuam no histórico. Você pode reativá-la depois."
        textoConfirmar="Inativar"
        carregando={processando}
        aoConfirmar={confirmarInativacao}
        aoCancelar={() => setParaInativar(null)}
      />

      <ConfirmDialog
        aberto={paraExcluir !== null}
        titulo={`Excluir "${paraExcluir?.nome ?? ""}"?`}
        mensagem="Esta ação não pode ser desfeita. Se a disciplina tiver vínculos, prefira inativá-la."
        textoConfirmar="Excluir"
        perigo
        carregando={processando}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setParaExcluir(null)}
      />
    </div>
  );
}