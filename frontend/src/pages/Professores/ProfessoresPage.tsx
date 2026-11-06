import { useCallback, useEffect, useRef, useState } from "react";
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
import { listarDisciplinas } from "@/services/disciplinas";
import { alterarAtivoProfessor, listarProfessores } from "@/services/professores";
import type { Paginado } from "@/types/api";
import type { Disciplina, Professor } from "@/types/entidades";
import { ROTULO_TITULACAO } from "@/types/enums";
import { mensagemDeErro } from "@/utils/erros";

const LIMITE = 20;

export function ProfessoresPage() {
  const navigate = useNavigate();

  const [busca, setBusca] = useState("");
  const buscaAtrasada = useDebounce(busca.trim());
  const [situacao, setSituacao] = useState<Situacao>("ativas");
  const [disciplinaPrincipalId, setDisciplinaPrincipalId] = useState("");
  const [pagina, setPagina] = useState(1);

  const [resultado, setResultado] = useState<Paginado<Professor> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);

  const [paraInativar, setParaInativar] = useState<Professor | null>(null);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    listarDisciplinas()
      .then((lista) => setDisciplinas([...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))))
      .catch(() => setDisciplinas([]));
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [buscaAtrasada, situacao, disciplinaPrincipalId]);

  // Só a resposta da última consulta é usada
  const consultaAtual = useRef(0);

  const carregar = useCallback(async () => {
    const consulta = ++consultaAtual.current;
    setCarregando(true);
    setErro(null);
    try {
      const r = await listarProfessores({
        busca: buscaAtrasada || undefined,
        ativo: situacaoParaAtivo(situacao),
        disciplinaPrincipalId: disciplinaPrincipalId ? Number(disciplinaPrincipalId) : undefined,
        pagina,
        limite: LIMITE,
      });
      if (consulta === consultaAtual.current) setResultado(r);
    } catch (e) {
      if (consulta === consultaAtual.current) setErro(mensagemDeErro(e));
    } finally {
      if (consulta === consultaAtual.current) setCarregando(false);
    }
  }, [buscaAtrasada, situacao, disciplinaPrincipalId, pagina]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function reativar(p: Professor) {
    try {
      await alterarAtivoProfessor(p.id, true);
      toast.success(`${p.nome} foi reativado.`);
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e));
    }
  }

  async function confirmarInativacao() {
    if (!paraInativar) return;
    setProcessando(true);
    try {
      await alterarAtivoProfessor(paraInativar.id, false);
      toast.success(`${paraInativar.nome} foi inativado.`);
      setParaInativar(null);
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e));
    } finally {
      setProcessando(false);
    }
  }

  const total = resultado?.paginacao.total ?? 0;
  const professores = resultado?.dados ?? [];

  return (
    <div className="p-8">
      <PageHeader
        title="Gestão de Professores"
        subtitle={
          resultado ? `${total} professor${total !== 1 ? "es" : ""} encontrado${total !== 1 ? "s" : ""}` : "Carregando..."
        }
        actions={
          <button onClick={() => navigate("/professores/novo")} className={BTN_PRIMARIO}>
            <Plus size={14} />
            Novo Professor
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
              value={disciplinaPrincipalId}
              onChange={(e) => setDisciplinaPrincipalId(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D2C3A]/20 focus:border-[#0D2C3A] max-w-56"
            >
              <option value="">Qualquer disciplina principal</option>
              {disciplinas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                  {d.ativo ? "" : " (inativa)"}
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
                {["Professor", "Especialidade", "Disciplina principal", "Titulação", "Situação", "Ações"].map((h) => (
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
              {resultado && professores.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    Nenhum professor encontrado com esses filtros.
                  </td>
                </tr>
              )}
              {professores.map((p) => (
                <tr key={p.id} className="hover:bg-[#F8FAFB] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <AvatarIcon name={p.nome} size="sm" bg={p.ativo ? "bg-sky-700" : "bg-gray-400"} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">{p.nome}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-foreground font-medium">{p.especialidade}</td>
                  <td className="px-5 py-3.5">
                    {p.disciplinaPrincipal ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          p.disciplinaPrincipal.ativo
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}
                        title={p.disciplinaPrincipal.ativo ? undefined : "Disciplina inativa"}
                      >
                        {p.disciplinaPrincipal.nome}
                        {p.disciplinaPrincipal.ativo ? "" : " (inativa)"}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{ROTULO_TITULACAO[p.titulacao]}</td>
                  <td className="px-5 py-3.5">
                    <Badge tom={p.ativo ? "verde" : "vermelho"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        title="Editar"
                        onClick={() => navigate(`/professores/${p.id}/editar`)}
                        className={BTN_ICONE}
                      >
                        <Edit size={14} className="text-muted-foreground" />
                      </button>
                      {p.ativo ? (
                        <button
                          title="Inativar"
                          onClick={() => setParaInativar(p)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Power size={14} className="text-red-500" />
                        </button>
                      ) : (
                        <button
                          title="Reativar"
                          onClick={() => reativar(p)}
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
        mensagem="Professores não são excluídos. As alocações dele continuam guardadas, mas saem das consultas normais e do dashboard, e ele não pode receber novas alocações enquanto estiver inativo."
        textoConfirmar="Inativar"
        perigo
        carregando={processando}
        aoConfirmar={confirmarInativacao}
        aoCancelar={() => setParaInativar(null)}
      />
    </div>
  );
}