import { useCallback, useEffect, useState } from "react";
import { Users, GraduationCap, BookMarked, Loader2, AlertCircle, Edit, Layers } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { AvatarIcon } from "@/components/AvatarIcon";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { BTN_ICONE, BTN_SECUNDARIO } from "@/components/estilos";
import { buscarTurma } from "@/services/turmas";
import type { TurmaDetalhe } from "@/types/entidades";
import { ROTULO_TURNO } from "@/types/enums";
import { mensagemDeErro } from "@/utils/erros";

type Aba = "alunos" | "professores";

export function TurmaDetalhePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const turmaId = Number(id);
  const aba: Aba = searchParams.get("aba") === "professores" ? "professores" : "alunos";
  const voltar = () => navigate("/turmas");

  const [turma, setTurma] = useState<TurmaDetalhe | null>(null);
  const [incluirInativos, setIncluirInativos] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setTurma(await buscarTurma(turmaId, incluirInativos));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, [turmaId, incluirInativos]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const trocarAba = (nova: Aba) => setSearchParams(nova === "professores" ? { aba: "professores" } : {}, { replace: true });

  if (carregando && !turma) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        Carregando turma...
      </div>
    );
  }

  if (erro && !turma) {
    return (
      <div className="p-8">
        <PageHeader title="Turma" onBack={voltar} />
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 max-w-2xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{erro}</p>
        </div>
      </div>
    );
  }

  if (!turma) return null;

  const professoresDistintos = new Set(turma.professores.map((p) => p.professor.id)).size;

  return (
    <div className="p-8">
      <PageHeader
        title={turma.nome}
        subtitle={`${ROTULO_TURNO[turma.turno]} • ${turma.sala} • Ano letivo ${turma.anoLetivo.ano}`}
        onBack={voltar}
        actions={
          <button className={BTN_SECUNDARIO} onClick={() => navigate(`/alocacoes?turmaId=${turma.id}`)}>
            <Layers size={14} />
            Gerenciar alocações
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={Users} label="Alunos ativos" value={String(turma.totais.alunosAtivos)} color="#0D2C3A" />
        <StatCard icon={GraduationCap} label="Professores" value={String(professoresDistintos)} color="#0EA5E9" />
        <StatCard
          icon={BookMarked}
          label="Alocações"
          value={String(turma.totais.alocacoes)}
          sub="professor × disciplina"
          color="#8B5CF6"
        />
      </div>

      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex bg-muted rounded-xl p-1 w-fit">
          {(["alunos", "professores"] as const).map((t) => (
            <button
              key={t}
              onClick={() => trocarAba(t)}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                aba === t ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "alunos" ? `Alunos (${turma.alunos.length})` : `Professores (${turma.professores.length})`}
            </button>
          ))}
        </div>
        {aba === "professores" && (
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={incluirInativos}
              onChange={(e) => setIncluirInativos(e.target.checked)}
              className="accent-[#0D2C3A]"
            />
            Mostrar professores inativos (histórico)
            {carregando && <Loader2 size={12} className="animate-spin" />}
          </label>
        )}
      </div>

      {aba === "alunos" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-[#F8FAFB]">
                  {["#", "Aluno", "E-mail", "Nº matrícula", ""].map((h, i) => (
                    <th key={i} className="text-left px-5 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {turma.alunos.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum aluno com matrícula ativa nesta turma.</td></tr>
                )}
                {turma.alunos.map((a, i) => (
                  <tr key={a.matriculaId} className="hover:bg-[#F8FAFB] transition-colors">
                    <td className="px-5 py-3.5 text-xs text-muted-foreground font-black">{String(i + 1).padStart(2, "0")}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarIcon name={a.nome} size="sm" />
                        <span className="text-sm font-bold text-foreground">{a.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{a.email}</td>
                    <td className="px-5 py-3.5 text-sm text-foreground font-semibold">{a.matricula}</td>
                    <td className="px-5 py-3.5">
                      <button title="Ver cadastro" onClick={() => navigate(`/alunos/${a.id}/editar`)} className={BTN_ICONE}>
                        <Edit size={14} className="text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {aba === "professores" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-[#F8FAFB]">
                  {["Professor", "Disciplina", "Carga horária", "Situação", ""].map((h, i) => (
                    <th key={i} className="text-left px-5 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {turma.professores.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum professor alocado nesta turma.</td></tr>
                )}
                {turma.professores.map((p) => (
                  <tr key={p.alocacaoId} className="hover:bg-[#F8FAFB] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarIcon name={p.professor.nome} size="sm" bg={p.professor.ativo ? "bg-sky-700" : "bg-gray-400"} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground">{p.professor.nome}</p>
                          <p className="text-xs text-muted-foreground">{p.professor.especialidade}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          p.disciplina.ativo
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}
                      >
                        {p.disciplina.nome}
                        {p.disciplina.ativo ? "" : " (inativa)"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{p.disciplina.cargaHoraria}h</td>
                    <td className="px-5 py-3.5">
                      <Badge tom={p.professor.ativo ? "verde" : "vermelho"}>{p.professor.ativo ? "Ativo" : "Inativo"}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <button title="Ver cadastro" onClick={() => navigate(`/professores/${p.professor.id}/editar`)} className={BTN_ICONE}>
                        <Edit size={14} className="text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}