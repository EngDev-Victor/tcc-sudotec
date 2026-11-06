import {
  Users, GraduationCap, Plus, Edit,
} from "lucide-react";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { CLASSES_DATA } from "@/mocks/dados";
import type { Screen } from "@/types/navigation";

export function TurmasPage({
  onNavigate,
  onOpenClassDetail,
}: {
  onNavigate: (s: Screen) => void;
  onOpenClassDetail: (classId: number, tab: "students" | "teachers") => void;
}) {
  return (
    <div className="p-8">
      <PageHeader
        title="Gestão de Turmas"
        subtitle="Visualize alunos e professores de cada turma"
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-[#0D2C3A] text-white rounded-xl text-sm font-bold hover:bg-[#1A4A60] transition-colors">
            <Plus size={14} />
            Nova Turma
          </button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {CLASSES_DATA.map((c) => (
          <Card key={c.id} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-foreground">{c.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  {c.period} • {c.room}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  c.period === "Manhã"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                {c.period}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#F4F6F8] rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-foreground">{c.students}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">Alunos</p>
              </div>
              <div className="bg-[#F4F6F8] rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-foreground">{c.teachers}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">Professores</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onOpenClassDetail(c.id, "students")}
                className="py-2 text-xs font-bold rounded-xl bg-[#F4F6F8] hover:bg-muted transition-colors flex flex-col items-center gap-1"
              >
                <Users size={13} className="text-[#0D2C3A]" />
                Alunos
              </button>
              <button
                onClick={() => onOpenClassDetail(c.id, "teachers")}
                className="py-2 text-xs font-bold rounded-xl bg-[#F4F6F8] hover:bg-muted transition-colors flex flex-col items-center gap-1"
              >
                <GraduationCap size={13} className="text-sky-600" />
                Professores
              </button>
              <button className="py-2 text-xs font-bold rounded-xl bg-[#F4F6F8] hover:bg-muted transition-colors flex flex-col items-center gap-1">
                <Edit size={13} className="text-muted-foreground" />
                Editar
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}