import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Edit, Power, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { AvatarIcon } from "@/components/AvatarIcon";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FiltroSituacao, situacaoParaAtivo, type Situacao } from "@/components/FiltroSituacao";
import { PageHeader } from "@/components/PageHeader";
import { Paginacao } from "@/components/Paginacao";
import { SearchInput } from "@/components/SearchInput";
import { BTN_ICONE, BTN_PRIMARIO } from "@/components/estilos";
import { useDebounce } from "@/hooks/useDebounce";
import { inativarAluno, listarAlunos, reativarAluno } from "@/services/alunos";
import { listarAnosLetivos } from "@/services/anosLetivos";
import { listarTurmas } from "@/services/turmas";
import type { Paginado } from "@/types/api";
import type { Aluno, AlunoReativado, AnoLetivoListagem, Turma } from "@/types/entidades";
import { mensagemDeErro } from "@/utils/erros";
import { formatarCPF, formatarTelefone } from "@/utils/formatacao";
import { ResultadoReativacaoModal } from "@/pages/Alunos/ResultadoReativacaoModal";

const LIMITE = 20;
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function AlunosPage() {
  const navigate = useNavigate();

  const [busca, setBusca] = useState("");
  const buscaAtrasada = useDebounce(busca.trim());
  const [situacao, setSituacao] = useState<Situacao>("ativas");
  const [anos, setAnos] = useState<AnoLetivoListagem[]>([]);
  const [anoId, setAnoId] = useState(""); // "" = todos os anos
  const [turmaId, setTurmaId] = useState("");
  const [pagina, setPagina] = useState(1);

  const [resultado, setResultado] = useState<Paginado<Aluno> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  const [paraInativar, setParaInativar] = useState<Aluno | null>(null);
  const [paraReativar, setParaReativar] = useState<Aluno | null>(null);
  const [processando, setProcessando] = useState(false);
  const [reativacao, setReativacao] = useState<AlunoReativado | null>(null);

  // Turmas para o filtro (mais recentes primeiro)
  useEffect(() => {
    listarTurmas()
      .then((lista) =>
        setTurmas(
          [...lista].sort(
            (a, b) => (b.anoLetivo?.ano ?? 0) - (a.anoLetivo?.ano ?? 0) || a.nome.localeCompare(b.nome, "pt-BR"),
          ),
        ),
      )
      .catch(() => setTurmas([]));
  }, []);

  // Anos letivos para o filtro (começa em "Todos os anos", para listar também quem não tem matrícula)
  useEffect(() => {
    listarAnosLetivos()
      .then(setAnos)
      .catch(() => setAnos([]));
  }, []);

  // Turmas do ano escolhido no filtro (em ordem de nome)
  const turmasDoAno = useMemo(
    () =>
      anoId
        ? turmas
            .filter((t) => t.anoLetivoId === Number(anoId))
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }))
        : [],
    [turmas, anoId],
  );

  function escolherAno(valor: string) {
    setAnoId(valor);
    setTurmaId(""); // a turma escolhida pode não ser do novo ano
  }

  // Volta para a página 1 quando um filtro muda
  useEffect(() => {
    setPagina(1);
  }, [buscaAtrasada, situacao, anoId, turmaId]);

  // Só a resposta da última consulta é usada (evita uma resposta antiga sobrescrever a nova)
  const consultaAtual = useRef(0);

  const carregar = useCallback(async () => {
    const consulta = ++consultaAtual.current;
    setCarregando(true);
    setErro(null);
    try {
      const r = await listarAlunos({
        busca: buscaAtrasada || undefined,
        ativo: situacaoParaAtivo(situacao),
        turmaId: turmaId ? Number(turmaId) : undefined,
        anoLetivoId: anoId ? Number(anoId) : undefined,
        pagina,
        limite: LIMITE,
      });
      if (consulta === consultaAtual.current) setResultado(r);
    } catch (e) {
      if (consulta === consultaAtual.current) setErro(mensagemDeErro(e));
    } finally {
      if (consulta === consultaAtual.current) setCarregando(false);
    }
  }, [buscaAtrasada, situacao, anoId, turmaId, pagina]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const nomesTurmas = useMemo(() => new Map(turmas.map((t) => [t.id, t.nome])), [turmas]);

  async function confirmarInativacao() {
    if (!paraInativar) return;
    setProcessando(true);
    try {
      const r = await inativarAluno(paraInativar.id);
      toast.success(
        `${r.nome} foi inativado.` +
          (r.matriculasSuspensas > 0
            ? ` ${plural(r.matriculasSuspensas, "matrícula ativa passou", "matrículas ativas passaram")} para suspensa.`
            : ""),
      );
      setParaInativar(null);
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e));
    } finally {
      setProcessando(false);
    }
  }

  async function confirmarReativacao() {
    if (!paraReativar) return;
    setProcessando(true);
    try {
      const r = await reativarAluno(paraReativar.id);
      setParaReativar(null);
      if (r.matriculasMantidasSuspensas.length > 0) {
        setReativacao(r); // mostra quais matrículas não voltaram e por quê
      } else {
        toast.success(
          `${r.nome} foi reativado.` +
            (r.matriculasRestauradas.length > 0
              ? ` ${plural(r.matriculasRestauradas.length, "matrícula voltou", "matrículas voltaram")} a ficar ativa.`
              : ""),
        );
      }
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e));
    } finally {
      setProcessando(false);
    }
  }

  const total = resultado?.paginacao.total ?? 0;
  const alunos = resultado?.dados ?? [];

  return (
    <div className="p-8">
      <PageHeader
        title="Gestão de Alunos"
        subtitle={resultado ? `${plural(total, "aluno encontrado", "alunos encontrados")}` : "Carregando..."}
        actions={
          <button onClick={() => navigate("/alunos/novo")} className={BTN_PRIMARIO}>
            <Plus size={14} />
            Novo Aluno
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
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchInput value={busca} onChange={setBusca} placeholder="Buscar pelo nome..." />
            <select
              value={anoId}
              onChange={(e) => escolherAno(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2C3A]/20 focus:border-[#0D2C3A] max-w-56"
              aria-label="Ano letivo"
              title="Mostra só alunos com matrícula ativa numa turma desse ano letivo"
            >
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
              className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2C3A]/20 focus:border-[#0D2C3A] max-w-56 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Turma"
              disabled={!anoId}
              title={anoId ? "Mostra só alunos com matrícula ativa na turma" : "Escolha um ano letivo para filtrar por turma"}
            >
              <option value="">Todas as turmas</option>
              {turmasDoAno.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <FiltroSituacao
            valor={situacao}
            onChange={setSituacao}
            rotulos={{ todas: "Todos", ativas: "Ativos", inativas: "Inativos" }}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-[#F8FAFB]">
                {["Aluno", "Matrícula", "CPF", "Responsável", "Situação", "Ações"].map((h) => (
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
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    <Loader2 size={16} className="inline animate-spin mr-2" />
                    Carregando...
                  </td>
                </tr>
              )}
              {resultado && alunos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    Nenhum aluno encontrado com esses filtros.
                  </td>
                </tr>
              )}
              {alunos.map((a) => (
                <tr key={a.id} className="hover:bg-[#F8FAFB] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <AvatarIcon name={a.nome} size="sm" bg={a.ativo ? "bg-[#0D2C3A]" : "bg-gray-400"} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">{a.nome}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-foreground font-semibold">{a.matricula}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">{formatarCPF(a.cpf)}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-foreground font-medium">{a.nomeResponsavel}</p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{formatarTelefone(a.telefone)}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tom={a.ativo ? "verde" : "vermelho"}>{a.ativo ? "Ativo" : "Inativo"}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        title="Editar"
                        onClick={() => navigate(`/alunos/${a.id}/editar`)}
                        className={BTN_ICONE}
                      >
                        <Edit size={14} className="text-muted-foreground" />
                      </button>
                      {a.ativo ? (
                        <button
                          title="Inativar"
                          onClick={() => setParaInativar(a)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Power size={14} className="text-red-500" />
                        </button>
                      ) : (
                        <button
                          title="Reativar"
                          onClick={() => setParaReativar(a)}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                        >
                          <Power size={14} className="text-emerald-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {resultado && (
          <Paginacao paginacao={resultado.paginacao} onMudarPagina={setPagina} desabilitado={carregando} />
        )}
      </Card>

      <ConfirmDialog
        aberto={paraInativar !== null}
        titulo={`Inativar ${paraInativar?.nome ?? ""}?`}
        mensagem="Alunos não são excluídos: o cadastro e o histórico ficam guardados. As matrículas ativas do aluno passam a SUSPENSA e podem voltar quando ele for reativado."
        textoConfirmar="Inativar"
        perigo
        carregando={processando}
        aoConfirmar={confirmarInativacao}
        aoCancelar={() => setParaInativar(null)}
      />

      <ConfirmDialog
        aberto={paraReativar !== null}
        titulo={`Reativar ${paraReativar?.nome ?? ""}?`}
        mensagem="As matrículas suspensas voltam a ficar ativas quando a turma é do ano letivo ativo (ou de um ano futuro) e o aluno não tem outra matrícula ativa no mesmo ano. As demais continuam suspensas."
        textoConfirmar="Reativar"
        carregando={processando}
        aoConfirmar={confirmarReativacao}
        aoCancelar={() => setParaReativar(null)}
      />

      <ResultadoReativacaoModal
        resultado={reativacao}
        nomesTurmas={nomesTurmas}
        aoFechar={() => setReativacao(null)}
      />
    </div>
  );
}