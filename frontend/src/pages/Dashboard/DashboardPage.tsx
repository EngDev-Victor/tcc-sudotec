import {
  Users, GraduationCap, BookOpen, Plus, UserCheck, ChevronRight, Percent,
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
import { AvatarIcon } from "@/components/AvatarIcon";
import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { CHART_DATA, STUDENTS } from "@/mocks/dados";
import type { Screen } from "@/types/navigation";

export function DashboardPage({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-black text-foreground">Painel Administrativo</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Segunda-feira, 25 de agosto de 2026
          </p>
        </div>
        <button
          onClick={() => onNavigate("admin-student-form")}
          className="flex items-center gap-2 px-4 py-2 bg-[#0D2C3A] text-white rounded-xl text-sm font-bold hover:bg-[#1A4A60] transition-colors"
        >
          <Plus size={14} />
          Nova Matrícula
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users}         label="Alunos Matriculados" value="1.240" sub="+18 este mês"    color="#0D2C3A" />
        <StatCard icon={GraduationCap} label="Professores Ativos"  value="86"    sub="3 afastados"      color="#0EA5E9" />
        <StatCard icon={BookOpen}      label="Turmas em Andamento" value="48"    sub="6 séries"          color="#8B5CF6" />
        <StatCard icon={Percent}       label="Taxa de Frequência"  value="94.2%" sub="Meta: 90%"         color="#10B981" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 p-6">
          <h3 className="text-sm font-black text-foreground mb-0.5">Frequência Mensal</h3>
          <p className="text-xs text-muted-foreground mb-5 font-medium">
            Percentual de presença • 2026
          </p>
          <div className="[&_*]:outline-none">
          <ResponsiveContainer width="100%" height={200}>
            <ReBarChart data={CHART_DATA} barSize={36}>
              <CartesianGrid
                key="grid"
                strokeDasharray="3 3"
                stroke="#F0F0F0"
                vertical={false}
              />
              <XAxis
                key="xaxis"
                dataKey="month"
                tick={{ fontSize: 12, fill: "#6B7A8D", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                key="yaxis"
                domain={[80, 100]}
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
                formatter={(v: number) => [`${v}%`, "Frequência"]}
              />
              <Bar key="bar" dataKey="freq" name="Frequência" fill="#0D2C3A" radius={[5, 5, 0, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-foreground">Últimas Matrículas</h3>
            <button
              onClick={() => onNavigate("admin-students")}
              className="text-xs text-sky-600 hover:text-sky-700 font-bold transition-colors"
            >
              Ver todos
            </button>
          </div>
          <div className="space-y-3">
            {STUDENTS.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <AvatarIcon name={s.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.class}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          { label: "Novo Aluno",      icon: UserCheck,    screen: "admin-student-form" as Screen, color: "#0D2C3A" },
          { label: "Novo Professor",  icon: GraduationCap, screen: "admin-teacher-form" as Screen, color: "#0EA5E9" },
          { label: "Nova Turma",      icon: BookOpen,     screen: "admin-classes"       as Screen, color: "#8B5CF6" },
        ].map((a) => (
          <button
            key={a.label}
            onClick={() => onNavigate(a.screen)}
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