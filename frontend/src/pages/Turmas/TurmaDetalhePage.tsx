import { useState } from "react";
import {
  Users, GraduationCap, Percent,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { AvatarIcon } from "@/components/AvatarIcon";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { CLASSES_DATA, CLASS_STUDENTS_MAP, CLASS_TEACHERS_MAP, STUDENTS, TEACHERS } from "@/mocks/dados";

export function TurmaDetalhePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const classId = Number(id);
  const initialTab = searchParams.get("aba") === "professores" ? "teachers" : "students";
  const onBack = () => navigate("/turmas");
  const [tab, setTab] = useState<"students" | "teachers">(initialTab);
  const cls = CLASSES_DATA.find((c) => c.id === classId) ?? CLASSES_DATA[0];

  const studentIds = CLASS_STUDENTS_MAP[classId] ?? [];
  const teacherIds = CLASS_TEACHERS_MAP[classId] ?? [];
  const classStudents = STUDENTS.filter((s) => studentIds.includes(s.id));
  const classTeachers = TEACHERS.filter((t) => teacherIds.includes(t.id));

  return (
    <div className="p-8">
      <PageHeader
        title={cls.name}
        subtitle={`${cls.period} • ${cls.room}`}
        onBack={onBack}
      />

      {/* Class stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={Users}         label="Total de Alunos"     value={String(cls.students)}  color="#0D2C3A" />
        <StatCard icon={GraduationCap} label="Professores"          value={String(cls.teachers)}  color="#0EA5E9" />
        <StatCard icon={Percent}       label="Frequência Média"     value="91%"                   color="#10B981" />
      </div>

      {/* Tabs */}
      <div className="flex bg-muted rounded-xl p-1 mb-5 w-fit">
        {(["students", "teachers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === t ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "students" ? `Alunos (${classStudents.length})` : `Professores (${classTeachers.length})`}
          </button>
        ))}
      </div>

      {tab === "students" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-[#F8FAFB]">
                  {["#", "Aluno", "E-mail", "Frequência", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {classStudents.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum aluno nesta turma.</td></tr>
                )}
                {classStudents.map((s, i) => (
                  <tr key={s.id} className="hover:bg-[#F8FAFB] transition-colors">
                    <td className="px-5 py-3.5 text-xs text-muted-foreground font-black">{String(i + 1).padStart(2, "0")}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarIcon name={s.name} size="sm" />
                        <span className="text-sm font-bold text-foreground">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{s.email}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${s.freq >= 75 ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${s.freq}%` }} />
                        </div>
                        <span className="text-sm font-bold text-foreground">{s.freq}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "teachers" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-[#F8FAFB]">
                  {["Professor", "Disciplina", "Titulação", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {classTeachers.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum professor atribuído.</td></tr>
                )}
                {classTeachers.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F8FAFB] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarIcon name={t.name} size="sm" bg="bg-sky-700" />
                        <span className="text-sm font-bold text-foreground">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                        {t.subject}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{t.degree}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={t.status} /></td>
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