import { useCallback, useEffect, useState } from "react";
import { Users, GraduationCap, Plus, Edit, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Card } from "@/components/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { BTN_PRIMARIO } from "@/components/estilos";
import { listarAnosLetivos } from "@/services/anosLetivos";
import { buscarDashboard } from "@/services/dashboard";
import { excluirTurma, listarTurmas } from "@/services/turmas";
import type { AnoLetivoListagem, OcupacaoTurma, Turma } from "@/types/entidades";
import { ROTULO_TURNO } from "@/types/enums";
import { mensagemDeErro } from "@/utils/erros";
import { normalizar } from "@/utils/texto";
import { TurmaFormModal } from "@/pages/Turmas/TurmaFormModal";

export function TurmasPage() {
  const navigate = useNavigate();
  const abrirDetalhe = (id: number, aba: "alunos" | "professores") =>
    navigate(`/turmas/${id}${aba === "professores" ? "?aba=professores" : ""}`);

  const [anos, setAnos] = useState<AnoLetivoListagem[]>([]);
  const [anoId, setAnoId] = useState<number | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  // Contagens de alunos/professores por turma vêm do dashboard do mesmo ano
  const [ocupacao, setOcupacao] = useState<Map<number, OcupacaoTurma>>(new Map());
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Turma | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Turma | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Anos letivos: começa no ano ativo (ou no mais recente)
  useEffect(() => {
    listarAnosLetivos()
      .then((lista) => {
        setAnos(lista);
        setAnoId((atual) => atual ?? (lista.find((a) => a.ativo) ?? lista[0])?.id ?? null);
        if (lista.length === 0) setCarregando(false);
      })
      .catch((e) => {
        setErro(mensagemDeErro(e));
        setCarregando(false);
      });
  }, []);

  const carregar = useCallback(async () => {
    if (anoId === null) return;
    setCarregando(true);
    setErro(null);
    try {
      const [lista, painel] = await Promise.all([
        listarTurmas(anoId),
        buscarDashboard(anoId).catch(() => null), // sem as contagens a tela continua funcionando
      ]);
      setTurmas([...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })));
      setOcupacao(
        new Map(painel && painel.anoLetivo ? painel.ocupacaoPorTurma.map((o) => [o.turmaId, o]) : []),
      );
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, [anoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const termo = normalizar(busca.trim());
  const filtradas = termo ? turmas.filter((t) => normalizar(t.nome).includes(termo)) : turmas;
  const anoSelecionado = anos.find((a) => a.id === anoId);

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    setExcluindo(true);
    try {
      await excluirTurma(paraExcluir.id);
      toast.success(`Turma ${paraExcluir.nome} excluída.`);
      setParaExcluir(null);
      await carregar();
    } catch (e) {
      // 409: turma com matrículas ou com professores alocados
      toast.error(mensagemDeErro(e));
      setParaExcluir(null);
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Gestão de Turmas"
        subtitle={
          anoSelecionado
            ? `${turmas.length} turma${turmas.length !== 1 ? "s" : ""} em ${anoSelecionado.ano}`
            : "Visualize alunos e professores de cada turma"
        }
        actions={
          <button
            className={BTN_PRIMARIO}
            disabled={anos.length === 0}
            title={anos.length === 0 ? "Cadastre um ano letivo antes" : undefined}
            onClick={() => {
              setEditando(null);
              setFormAberto(true);
            }}
          >
            <Plus size={14} />
            Nova Turma
          </button>
        }
      />

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <SearchInput value={busca} onChange={setBusca} placeholder="Buscar turma pelo nome..." />
        <div className="flex items-center gap-2">
          <label htmlFor="ano-turmas" className="text-xs font-bold text-muted-foreground">
            Ano letivo
          </label>
          <select
            id="ano-turmas"
            value={anoId ?? ""}
            onChange={(e) => setAnoId(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-border bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D2C3A]/20 focus:border-[#0D2C3A]"
          >
            {anos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.ano}
                {a.ativo ? " (ativo)" : ""}
              </option>
            ))}
          </select>
        </div>
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

      {carregando && turmas.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Carregando turmas...
        </div>
      )}

      {!carregando && !erro && filtradas.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {anos.length === 0
            ? "Nenhum ano letivo cadastrado. Cadastre um em Anos Letivos para criar turmas."
            : busca
              ? "Nenhuma turma encontrada para essa busca."
              : "Nenhuma turma cadastrada neste ano letivo."}
        </Card>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ${carregando ? "opacity-60" : ""}`}>
        {filtradas.map((t) => {
          const o = ocupacao.get(t.id);
          return (
            <Card key={t.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-foreground break-words">{t.nome}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    {ROTULO_TURNO[t.turno]} • {t.sala}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      t.turno === "MANHA"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {ROTULO_TURNO[t.turno]}
                  </span>
                  <button
                    title="Excluir turma"
                    onClick={() => setParaExcluir(t)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={13} className="text-red-500" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#F4F6F8] rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-foreground">{o ? o.alunosAtivos : "—"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">Alunos ativos</p>
                </div>
                <div className="bg-[#F4F6F8] rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-foreground">{o ? o.professores : "—"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">Professores</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => abrirDetalhe(t.id, "alunos")}
                  className="py-2 text-xs font-bold rounded-xl bg-[#F4F6F8] hover:bg-muted transition-colors flex flex-col items-center gap-1"
                >
                  <Users size={13} className="text-[#0D2C3A]" />
                  Alunos
                </button>
                <button
                  onClick={() => abrirDetalhe(t.id, "professores")}
                  className="py-2 text-xs font-bold rounded-xl bg-[#F4F6F8] hover:bg-muted transition-colors flex flex-col items-center gap-1"
                >
                  <GraduationCap size={13} className="text-sky-600" />
                  Professores
                </button>
                <button
                  onClick={() => {
                    setEditando(t);
                    setFormAberto(true);
                  }}
                  className="py-2 text-xs font-bold rounded-xl bg-[#F4F6F8] hover:bg-muted transition-colors flex flex-col items-center gap-1"
                >
                  <Edit size={13} className="text-muted-foreground" />
                  Editar
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <TurmaFormModal
        aberto={formAberto}
        turma={editando}
        anos={anos}
        anoPadraoId={anoId}
        aoFechar={() => setFormAberto(false)}
        aoSalvar={() => {
          setFormAberto(false);
          carregar();
        }}
      />

      <ConfirmDialog
        aberto={paraExcluir !== null}
        titulo={`Excluir a turma ${paraExcluir?.nome ?? ""}?`}
        mensagem="Só é possível excluir turmas sem matrículas e sem professores alocados. Esta ação não pode ser desfeita."
        textoConfirmar="Excluir"
        perigo
        carregando={excluindo}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setParaExcluir(null)}
      />
    </div>
  );
}