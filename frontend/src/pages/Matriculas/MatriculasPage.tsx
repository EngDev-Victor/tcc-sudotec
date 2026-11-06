import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, ArrowLeftRight, Ban, Loader2, AlertCircle, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { AvatarIcon } from "@/components/AvatarIcon";
import { BuscaAluno } from "@/components/BuscaAluno";
import { Card } from "@/components/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { Paginacao } from "@/components/Paginacao";
import { StatusMatriculaBadge } from "@/components/StatusMatriculaBadge";
import { BTN_PRIMARIO } from "@/components/estilos";
import { buscarAluno } from "@/services/alunos";
import { listarAnosLetivos } from "@/services/anosLetivos";
import { cancelarMatricula, listarMatriculas } from "@/services/matriculas";
import { listarTurmas } from "@/services/turmas";
import type { Paginado } from "@/types/api";
import type { Aluno, AnoLetivoListagem, Matricula, Turma } from "@/types/entidades";
import { ROTULO_STATUS_MATRICULA, STATUS_MATRICULA, type StatusMatricula } from "@/types/enums";
import { mensagemDeErro } from "@/utils/erros";
import { formatarData } from "@/utils/formatacao";
import { NovaMatriculaModal } from "@/pages/Matriculas/NovaMatriculaModal";
import { TransferirModal, type MatriculaParaTransferir } from "@/pages/Matriculas/TransferirModal";

const LIMITE = 20;
const SELECT =
  "px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2C3A]/20 focus:border-[#0D2C3A] max-w-56";

export function MatriculasPage() {
  const navigate = useNavigate();
  // ?alunoId= mostra o histórico de um aluno (atalho do cadastro do aluno)
  const [searchParams, setSearchParams] = useSearchParams();
  const alunoId = searchParams.get("alunoId");

  const [anos, setAnos] = useState<AnoLetivoListagem[]>([]);
  const [anoId, setAnoId] = useState<string | null>(null); // "" = todos os anos
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState("");
  const [status, setStatus] = useState<StatusMatricula | "">("");
  const [pagina, setPagina] = useState(1);
  const [alunoFiltro, setAlunoFiltro] = useState<Aluno | null>(null);

  const [resultado, setResultado] = useState<Paginado<Matricula> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [novaAberta, setNovaAberta] = useState(false);
  const [paraTransferir, setParaTransferir] = useState<MatriculaParaTransferir | null>(null);
  const [paraCancelar, setParaCancelar] = useState<Matricula | null>(null);
  const [cancelando, setCancelando] = useState(false);

  // Anos: com aluno filtrado, mostra todos os anos (histórico); senão, o ano ativo
  useEffect(() => {
    listarAnosLetivos()
      .then((lista) => {
        setAnos(lista);
        setAnoId((atual) => atual ?? (alunoId ? "" : String((lista.find((a) => a.ativo) ?? lista[0])?.id ?? "")));
      })
      .catch((e) => {
        setErro(mensagemDeErro(e));
        setAnoId("");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na abertura da tela
  }, []);

  useEffect(() => {
    if (!alunoId) {
      setAlunoFiltro(null);
      return;
    }
    buscarAluno(Number(alunoId)).then(setAlunoFiltro).catch(() => setAlunoFiltro(null));
  }, [alunoId]);

  useEffect(() => {
    setTurmaId("");
    if (!anoId) {
      setTurmas([]);
      return;
    }
    listarTurmas(Number(anoId))
      .then((l) => setTurmas([...l].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }))))
      .catch(() => setTurmas([]));
  }, [anoId]);

  useEffect(() => {
    setPagina(1);
  }, [anoId, turmaId, status, alunoId]);

  const consultaAtual = useRef(0);

  const carregar = useCallback(async () => {
    if (anoId === null) return;
    const consulta = ++consultaAtual.current;
    setCarregando(true);
    setErro(null);
    try {
      const r = await listarMatriculas({
        anoLetivoId: anoId ? Number(anoId) : undefined,
        turmaId: turmaId ? Number(turmaId) : undefined,
        status: status || undefined,
        alunoId: alunoId ? Number(alunoId) : undefined,
        pagina,
        limite: LIMITE,
      });
      if (consulta === consultaAtual.current) setResultado(r);
    } catch (e) {
      if (consulta === consultaAtual.current) setErro(mensagemDeErro(e));
    } finally {
      if (consulta === consultaAtual.current) setCarregando(false);
    }
  }, [anoId, turmaId, status, alunoId, pagina]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const anoDe = (anoLetivoId: number) => anos.find((a) => a.id === anoLetivoId)?.ano;

  async function confirmarCancelamento() {
    if (!paraCancelar) return;
    setCancelando(true);
    try {
      await cancelarMatricula(paraCancelar.id);
      toast.success(`Matrícula de ${paraCancelar.aluno.nome} cancelada.`);
      setParaCancelar(null);
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e));
      setParaCancelar(null);
    } finally {
      setCancelando(false);
    }
  }

  const matriculas = resultado?.dados ?? [];
  const total = resultado?.paginacao.total ?? 0;

  return (
    <div className="p-8">
      <PageHeader
        title="Matrículas"
        subtitle={resultado ? `${total} matrícula${total !== 1 ? "s" : ""} encontrada${total !== 1 ? "s" : ""}` : "Carregando..."}
        actions={
          <button className={BTN_PRIMARIO} onClick={() => setNovaAberta(true)}>
            <Plus size={14} />
            Nova Matrícula
          </button>
        }
      />

      {alunoId && (
        <div className="flex items-center gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-sm text-sky-900 font-medium flex-1">
            Matrículas de <strong>{alunoFiltro?.nome ?? `aluno #${alunoId}`}</strong>
            {anoId ? " no ano selecionado" : " em todos os anos"}
          </p>
          <button
            onClick={() => setSearchParams({}, { replace: true })}
            className="flex items-center gap-1 text-xs font-bold text-sky-800 hover:underline"
          >
            <X size={12} />
            Ver todas
          </button>
        </div>
      )}

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
          <select value={anoId ?? ""} onChange={(e) => setAnoId(e.target.value)} className={SELECT} aria-label="Ano letivo">
            <option value="">Todos os anos</option>
            {anos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.ano}
                {a.ativo ? " (ativo)" : ""}
              </option>
            ))}
          </select>
          <select
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            className={SELECT}
            aria-label="Turma"
            disabled={!anoId}
            title={anoId ? undefined : "Escolha um ano letivo para filtrar por turma"}
          >
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
          <BuscaAluno
            className="w-64"
            placeholder="Filtrar por aluno..."
            onEscolher={(a) => {
              setAlunoFiltro(a);
              setSearchParams({ alunoId: String(a.id) }, { replace: true });
            }}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusMatricula | "")}
            className={SELECT}
            aria-label="Status"
          >
            <option value="">Todos os status</option>
            {STATUS_MATRICULA.map((s) => (
              <option key={s} value={s}>
                {ROTULO_STATUS_MATRICULA[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-[#F8FAFB]">
                {["Aluno", "Turma", "Status", "Desde", "Ações"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y divide-border ${carregando && resultado ? "opacity-60" : ""}`}>
              {carregando && !resultado && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    <Loader2 size={16} className="inline animate-spin mr-2" />
                    Carregando...
                  </td>
                </tr>
              )}
              {resultado && matriculas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    Nenhuma matrícula encontrada com esses filtros.
                  </td>
                </tr>
              )}
              {matriculas.map((m) => {
                const podeCancelar = m.status === "ATIVA" || m.status === "SUSPENSA";
                return (
                  <tr key={m.id} className="hover:bg-[#F8FAFB] transition-colors">
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => navigate(`/alunos/${m.aluno.id}/editar`)}
                        className="flex items-center gap-3 text-left"
                        title="Abrir cadastro do aluno"
                      >
                        <AvatarIcon name={m.aluno.nome} size="sm" bg={m.aluno.ativo ? "bg-[#0D2C3A]" : "bg-gray-400"} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground hover:underline">{m.aluno.nome}</p>
                          <p className="text-xs text-muted-foreground">Matrícula {m.aluno.matricula}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => navigate(`/turmas/${m.turma.id}`)}
                        className="text-sm font-bold text-foreground hover:underline"
                      >
                        {m.turma.nome}
                      </button>
                      <p className="text-xs text-muted-foreground">{anoDe(m.turma.anoLetivoId) ?? ""}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusMatriculaBadge status={m.status} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{formatarData(m.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {m.status === "ATIVA" && (
                          <button
                            onClick={() =>
                              setParaTransferir({
                                matriculaId: m.id,
                                alunoNome: m.aluno.nome,
                                turma: { id: m.turma.id, nome: m.turma.nome, anoLetivoId: m.turma.anoLetivoId },
                              })
                            }
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sky-200 bg-sky-50 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors"
                          >
                            <ArrowLeftRight size={12} />
                            Transferir
                          </button>
                        )}
                        {podeCancelar && (
                          <button
                            onClick={() => setParaCancelar(m)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <Ban size={12} />
                            Cancelar
                          </button>
                        )}
                        {!podeCancelar && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {resultado && <Paginacao paginacao={resultado.paginacao} onMudarPagina={setPagina} desabilitado={carregando} />}
      </Card>

      <NovaMatriculaModal
        aberto={novaAberta}
        alunoPadrao={alunoFiltro}
        aoFechar={() => setNovaAberta(false)}
        aoSalvar={() => {
          setNovaAberta(false);
          carregar();
        }}
      />

      <TransferirModal
        matricula={paraTransferir}
        aoFechar={() => setParaTransferir(null)}
        aoTransferir={() => {
          setParaTransferir(null);
          carregar();
        }}
      />

      <ConfirmDialog
        aberto={paraCancelar !== null}
        titulo="Cancelar matrícula?"
        mensagem={
          paraCancelar
            ? `A matrícula de ${paraCancelar.aluno.nome} na turma ${paraCancelar.turma.nome} passará a CANCELADA. Matrículas canceladas não voltam a ficar ativas automaticamente.`
            : ""
        }
        textoConfirmar="Cancelar matrícula"
        perigo
        carregando={cancelando}
        aoConfirmar={confirmarCancelamento}
        aoCancelar={() => setParaCancelar(null)}
      />
    </div>
  );
}