import { useCallback, useEffect, useState } from "react";
import { Plus, Edit, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { AvatarIcon } from "@/components/AvatarIcon";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { BTN_ICONE, BTN_PRIMARIO } from "@/components/estilos";
import { excluirAlocacao, listarAlocacoes } from "@/services/alocacoes";
import { listarAnosLetivos } from "@/services/anosLetivos";
import { listarDisciplinas } from "@/services/disciplinas";
import { listarTodosProfessores } from "@/services/professores";
import { listarTurmas } from "@/services/turmas";
import type { Alocacao, AnoLetivoListagem, Disciplina, Professor, Turma } from "@/types/entidades";
import { mensagemDeErro } from "@/utils/erros";
import { normalizar } from "@/utils/texto";
import { AlocacaoFormModal } from "@/pages/Alocacoes/AlocacaoFormModal";

const SELECT =
  "px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2C3A]/20 focus:border-[#0D2C3A] max-w-56";

export function AlocacoesPage() {
  // ?turmaId= permite abrir a tela já filtrada (atalho do detalhe da turma)
  const [searchParams, setSearchParams] = useSearchParams();
  const turmaId = searchParams.get("turmaId") ?? "";
  const setTurmaId = (v: string) => setSearchParams(v ? { turmaId: v } : {}, { replace: true });

  const [anos, setAnos] = useState<AnoLetivoListagem[]>([]);
  const [anoId, setAnoId] = useState<number | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);

  const [disciplinaId, setDisciplinaId] = useState("");
  const [busca, setBusca] = useState("");
  const [incluirInativos, setIncluirInativos] = useState(false);

  const [alocacoes, setAlocacoes] = useState<Alocacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Alocacao | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Alocacao | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Dados de apoio: anos, professores ativos e disciplinas ativas
  useEffect(() => {
    // Aberta com ?turmaId=: começa no ano letivo dessa turma; senão, no ano ativo
    const turmaInicial = searchParams.get("turmaId");
    Promise.all([listarAnosLetivos(), turmaInicial ? listarTurmas() : Promise.resolve([] as Turma[])])
      .then(([lista, todasTurmas]) => {
        setAnos(lista);
        const daTurma = todasTurmas.find((t) => String(t.id) === turmaInicial)?.anoLetivoId;
        setAnoId((atual) => atual ?? daTurma ?? (lista.find((a) => a.ativo) ?? lista[0])?.id ?? null);
        if (lista.length === 0) setCarregando(false);
      })
      .catch((e) => {
        setErro(mensagemDeErro(e));
        setCarregando(false);
      });
    listarTodosProfessores({ ativo: true }).then(setProfessores).catch(() => setProfessores([]));
    listarDisciplinas(true)
      .then((l) => setDisciplinas([...l].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))))
      .catch(() => setDisciplinas([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na abertura da tela
  }, []);

  // Turmas do ano escolhido
  useEffect(() => {
    if (anoId === null) return;
    listarTurmas(anoId)
      .then((l) => setTurmas([...l].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }))))
      .catch(() => setTurmas([]));
  }, [anoId]);

  const carregar = useCallback(async () => {
    if (anoId === null) return;
    setCarregando(true);
    setErro(null);
    try {
      const lista = await listarAlocacoes({
        turmaId: turmaId ? Number(turmaId) : undefined,
        disciplinaId: disciplinaId ? Number(disciplinaId) : undefined,
        incluirInativos,
      });
      // A API não filtra por ano letivo: filtra aqui pela turma
      setAlocacoes(
        lista
          .filter((a) => a.turma.anoLetivoId === anoId)
          .sort(
            (a, b) =>
              a.turma.nome.localeCompare(b.turma.nome, "pt-BR", { numeric: true }) ||
              a.disciplina.nome.localeCompare(b.disciplina.nome, "pt-BR"),
          ),
      );
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, [anoId, turmaId, disciplinaId, incluirInativos]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const termo = normalizar(busca.trim());
  const filtradas = termo ? alocacoes.filter((a) => normalizar(a.professor.nome).includes(termo)) : alocacoes;

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    setExcluindo(true);
    try {
      await excluirAlocacao(paraExcluir.id);
      toast.success("Alocação removida.");
      setParaExcluir(null);
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e));
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Alocações"
        subtitle="Professores por turma e disciplina"
        actions={
          <button
            className={BTN_PRIMARIO}
            disabled={turmas.length === 0}
            title={turmas.length === 0 ? "Não há turmas neste ano letivo" : undefined}
            onClick={() => {
              setEditando(null);
              setFormAberto(true);
            }}
          >
            <Plus size={14} />
            Alocar Professor
          </button>
        }
      />

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium flex-1">{erro}</p>
          <button onClick={carregar} className="text-xs font-bold text-red-700 hover:underline">
            Tentar novamente
          </button>
        </div>
      )}

      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center gap-3 flex-wrap">
          <select
            value={anoId ?? ""}
            onChange={(e) => {
              setAnoId(Number(e.target.value));
              setTurmaId("");
            }}
            className={SELECT}
            aria-label="Ano letivo"
          >
            {anos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.ano}
                {a.ativo ? " (ativo)" : ""}
              </option>
            ))}
          </select>
          <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className={SELECT} aria-label="Turma">
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
          <select
            value={disciplinaId}
            onChange={(e) => setDisciplinaId(e.target.value)}
            className={SELECT}
            aria-label="Disciplina"
          >
            <option value="">Todas as disciplinas</option>
            {disciplinas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
          <SearchInput value={busca} onChange={setBusca} placeholder="Buscar professor..." />
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer select-none ml-auto">
            <input
              type="checkbox"
              checked={incluirInativos}
              onChange={(e) => setIncluirInativos(e.target.checked)}
              className="accent-[#0D2C3A]"
            />
            Incluir professores inativos
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-[#F8FAFB]">
                {["Turma", "Professor", "Disciplina", "Carga horária", "Ações"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y divide-border ${carregando && alocacoes.length > 0 ? "opacity-60" : ""}`}>
              {carregando && alocacoes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    <Loader2 size={16} className="inline animate-spin mr-2" />
                    Carregando...
                  </td>
                </tr>
              )}
              {!carregando && filtradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    Nenhuma alocação encontrada com esses filtros.
                  </td>
                </tr>
              )}
              {filtradas.map((a) => (
                <tr key={a.id} className="hover:bg-[#F8FAFB] transition-colors">
                  <td className="px-5 py-3.5 text-sm font-black text-foreground">{a.turma.nome}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <AvatarIcon name={a.professor.nome} size="sm" bg={a.professor.ativo ? "bg-sky-700" : "bg-gray-400"} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">{a.professor.nome}</p>
                        {!a.professor.ativo && <Badge tom="vermelho">Inativo</Badge>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        a.disciplina.ativo
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      {a.disciplina.nome}
                      {a.disciplina.ativo ? "" : " (inativa)"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{a.disciplina.cargaHoraria}h</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        title={a.professor.ativo ? "Editar" : "Professor inativo não pode ter a alocação editada"}
                        disabled={!a.professor.ativo}
                        onClick={() => {
                          setEditando(a);
                          setFormAberto(true);
                        }}
                        className={BTN_ICONE}
                      >
                        <Edit size={14} className="text-muted-foreground" />
                      </button>
                      <button
                        title="Remover alocação"
                        onClick={() => setParaExcluir(a)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!carregando && filtradas.length > 0 && (
          <div className="px-5 py-3.5 border-t border-border bg-[#F8FAFB]">
            <p className="text-xs text-muted-foreground font-medium">
              {filtradas.length} alocaç{filtradas.length === 1 ? "ão" : "ões"}
            </p>
          </div>
        )}
      </Card>

      <AlocacaoFormModal
        aberto={formAberto}
        alocacao={editando}
        turmas={turmas}
        professores={professores}
        disciplinas={disciplinas}
        turmaPadraoId={turmaId ? Number(turmaId) : null}
        aoFechar={() => setFormAberto(false)}
        aoSalvar={() => {
          setFormAberto(false);
          carregar();
        }}
      />

      <ConfirmDialog
        aberto={paraExcluir !== null}
        titulo="Remover alocação?"
        mensagem={
          paraExcluir
            ? `${paraExcluir.professor.nome} deixará de constar como professor de ${paraExcluir.disciplina.nome} na turma ${paraExcluir.turma.nome}. Use esta opção para desfazer um engano.`
            : ""
        }
        textoConfirmar="Remover"
        perigo
        carregando={excluindo}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setParaExcluir(null)}
      />
    </div>
  );
}