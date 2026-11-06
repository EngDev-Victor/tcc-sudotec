import { useEffect, useState } from "react";
import {
  Users, GraduationCap, BookOpen, UserCheck, ChevronRight, ClipboardList,
  AlertCircle, AlertTriangle, Loader2, RefreshCw, CheckCircle2,
} from "lucide-react";
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router";
import { AvatarIcon } from "@/components/AvatarIcon";
import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { buscarDashboard } from "@/services/dashboard";
import { listarAnosLetivos } from "@/services/anosLetivos";
import type { AnoLetivoListagem, Dashboard, DashboardComAno } from "@/types/entidades";
import { ROTULO_STATUS_MATRICULA, STATUS_MATRICULA } from "@/types/enums";
import { mensagemDeErro } from "@/utils/erros";

const numero = (n: number) => n.toLocaleString("pt-BR");

/** Máximo de barras no gráfico e de turmas listadas nas pendências */
const MAX_TURMAS_GRAFICO = 12;
const MAX_TURMAS_PENDENCIA = 8;

function dataDeHoje(): string {
  const texto = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [anos, setAnos] = useState<AnoLetivoListagem[]>([]);
  // "" = ano letivo ativo (a API escolhe quando não recebe anoLetivoId)
  const [anoSelecionado, setAnoSelecionado] = useState("");
  const [dados, setDados] = useState<Dashboard | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => {
    listarAnosLetivos()
      .then(setAnos)
      .catch(() => setAnos([])); // o seletor é opcional; o dashboard funciona sem ele
  }, []);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    buscarDashboard(anoSelecionado ? Number(anoSelecionado) : undefined)
      .then((d) => ativo && setDados(d))
      .catch((e) => ativo && setErro(mensagemDeErro(e)))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [anoSelecionado, recarregar]);

  const comAno: DashboardComAno | null = dados && dados.anoLetivo ? dados : null;

  // Turmas com mais alunos ativos primeiro; com muitas turmas, mostra só as maiores
  const turmasGrafico = comAno
    ? [...comAno.ocupacaoPorTurma]
        .sort((a, b) => b.alunosAtivos - a.alunosAtivos || a.nome.localeCompare(b.nome, "pt-BR"))
        .slice(0, MAX_TURMAS_GRAFICO)
    : [];
  const totalTurmasGrafico = comAno?.ocupacaoPorTurma.length ?? 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-foreground">Painel Administrativo</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {dataDeHoje()}
            {comAno && ` • Ano letivo ${comAno.anoLetivo.ano}${comAno.anoLetivo.ativo ? "" : " (consulta)"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="ano-letivo" className="text-xs font-bold text-muted-foreground">
            Ano letivo
          </label>
          <select
            id="ano-letivo"
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D2C3A]/20 focus:border-[#0D2C3A] transition-all"
          >
            <option value="">Ano ativo</option>
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
          <button
            onClick={() => setRecarregar((n) => n + 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors"
          >
            <RefreshCw size={12} />
            Tentar novamente
          </button>
        </div>
      )}

      {carregando && !dados && (
        <div className="flex items-center justify-center gap-2 py-24 text-sm font-semibold text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Carregando indicadores...
        </div>
      )}

      {dados && (
        <div className={carregando ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {!dados.anoLetivo && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 font-medium">{dados.aviso}</p>
            </div>
          )}

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={Users}
              label="Alunos Ativos"
              value={numero(dados.alunos.ativos)}
              sub={`${numero(dados.alunos.total)} cadastrados • ${numero(dados.alunos.inativos)} inativos`}
              color="#0D2C3A"
            />
            <StatCard
              icon={ClipboardList}
              label="Matriculados no Ano"
              value={comAno ? numero(comAno.alunos.matriculadosNoAno) : "—"}
              sub={comAno ? `Matrículas ativas em ${comAno.anoLetivo.ano}` : "Sem ano letivo"}
              color="#10B981"
            />
            <StatCard
              icon={GraduationCap}
              label="Professores Ativos"
              value={numero(dados.professores.ativos)}
              sub={
                comAno
                  ? `${numero(comAno.professores.alocadosNoAno)} alocados no ano`
                  : `${numero(dados.professores.total)} cadastrados`
              }
              color="#0EA5E9"
            />
            <StatCard
              icon={BookOpen}
              label="Turmas no Ano"
              value={numero(dados.totais.turmas)}
              sub={`${numero(dados.totais.disciplinas)} disciplinas cadastradas`}
              color="#8B5CF6"
            />
          </div>

          {comAno && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card className="xl:col-span-2 p-6">
                <h3 className="text-sm font-black text-foreground mb-0.5">Alunos por Turma</h3>
                <p className="text-xs text-muted-foreground mb-5 font-medium">
                  Matrículas ativas • {comAno.anoLetivo.ano}
                  {totalTurmasGrafico > MAX_TURMAS_GRAFICO &&
                    ` • ${MAX_TURMAS_GRAFICO} maiores de ${numero(totalTurmasGrafico)} turmas`}
                </p>
                {comAno.ocupacaoPorTurma.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-16 text-center">
                    Nenhuma turma cadastrada neste ano letivo.
                  </p>
                ) : (
                  <div className="[&_*]:outline-none">
                    <ResponsiveContainer width="100%" height={200}>
                      <ReBarChart data={turmasGrafico} barSize={turmasGrafico.length > 8 ? 24 : 36}>
                        <CartesianGrid
                          key="grid"
                          strokeDasharray="3 3"
                          stroke="#F0F0F0"
                          vertical={false}
                        />
                        <XAxis
                          key="xaxis"
                          dataKey="nome"
                          tick={{ fontSize: 11, fill: "#6B7A8D", fontWeight: 600 }}
                          interval={0}
                          tickFormatter={(nome: string) => (nome.length > 10 ? nome.slice(0, 9) + "…" : nome)}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          key="yaxis"
                          allowDecimals={false}
                          tick={{ fontSize: 12, fill: "#6B7A8D" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          key="tooltip"
                          contentStyle={{
                            borderRadius: 10,
                            border: "1px solid #EEF1F4",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                          formatter={(v: number) => [v, "Alunos ativos"]}
                        />
                        <Bar key="bar" dataKey="alunosAtivos" name="Alunos ativos" fill="#0D2C3A" radius={[5, 5, 0, 0]} />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 pt-4 border-t border-border">
                  {STATUS_MATRICULA.map((s) => (
                    <p key={s} className="text-xs text-muted-foreground font-medium">
                      {ROTULO_STATUS_MATRICULA[s]}:{" "}
                      <span className="font-black text-foreground">{numero(comAno.matriculas[s])}</span>
                    </p>
                  ))}
                </div>
              </Card>

              <Pendencias dados={comAno} />
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          { label: "Novo Aluno",      icon: UserCheck,    to: "/alunos/novo", color: "#0D2C3A" },
          { label: "Novo Professor",  icon: GraduationCap, to: "/professores/novo", color: "#0EA5E9" },
          { label: "Nova Turma",      icon: BookOpen,     to: "/turmas", color: "#8B5CF6" },
        ].map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.to)}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border hover:border-[#0D2C3A]/20 hover:shadow-md transition-all group"
          >
            <div
              className="p-2 rounded-xl"
              style={{ backgroundColor: a.color + "18" }}
            >
              <a.icon size={17} style={{ color: a.color }} />
            </div>
            <span className="text-sm font-bold text-foreground">{a.label}</span>
            <ChevronRight
              size={14}
              className="ml-auto text-muted-foreground group-hover:translate-x-0.5 transition-transform"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function Pendencias({ dados }: { dados: DashboardComAno }) {
  const { turmasSemProfessor, turmasSemAlunos, alunosSemMatriculaAtiva } = dados.pendencias;
  const semPendencias =
    turmasSemProfessor.length === 0 && turmasSemAlunos.length === 0 && alunosSemMatriculaAtiva.total === 0;

  return (
    <Card className="p-6">
      <h3 className="text-sm font-black text-foreground mb-4">Pendências</h3>

      {semPendencias ? (
        <div className="flex items-center gap-2.5 text-sm text-emerald-700 font-semibold">
          <CheckCircle2 size={16} />
          Nenhuma pendência neste ano letivo.
        </div>
      ) : (
        <div className="space-y-5">
          {turmasSemProfessor.length > 0 && (
            <ListaTurmas titulo="Turmas sem professor" turmas={turmasSemProfessor} />
          )}
          {turmasSemAlunos.length > 0 && (
            <ListaTurmas titulo="Turmas sem alunos" turmas={turmasSemAlunos} />
          )}
          {alunosSemMatriculaAtiva.total > 0 && (
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">
                Alunos sem matrícula ativa ({numero(alunosSemMatriculaAtiva.total)})
              </p>
              <div className="space-y-2.5">
                {alunosSemMatriculaAtiva.itens.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center gap-3">
                    <AvatarIcon name={a.nome} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{a.nome}</p>
                      <p className="text-xs text-muted-foreground">Matrícula {a.matricula}</p>
                    </div>
                  </div>
                ))}
                {alunosSemMatriculaAtiva.total > 5 && (
                  <p className="text-xs text-muted-foreground font-medium">
                    e mais {numero(alunosSemMatriculaAtiva.total - 5)}...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function ListaTurmas({ titulo, turmas }: { titulo: string; turmas: { id: number; nome: string }[] }) {
  return (
    <div>
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">
        {titulo} ({turmas.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {turmas.slice(0, MAX_TURMAS_PENDENCIA).map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
          >
            {t.nome}
          </span>
        ))}
        {turmas.length > MAX_TURMAS_PENDENCIA && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            e mais {turmas.length - MAX_TURMAS_PENDENCIA}...
          </span>
        )}
      </div>
    </div>
  );
}