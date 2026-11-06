import { useState } from "react";
import {
  Plus, Edit, Trash2, Eye,
} from "lucide-react";
import { AvatarIcon } from "@/components/AvatarIcon";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { StatusBadge } from "@/components/StatusBadge";
import { STUDENTS } from "@/mocks/dados";

export function AlunosPage({
  onCreate,
  onEdit,
}: {
  onCreate: () => void;
  onEdit: (studentId: number) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = STUDENTS.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.class.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <PageHeader
        title="Gestão de Alunos"
        subtitle={`${STUDENTS.length} alunos cadastrados`}
        actions={
          <button
            onClick={onCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#0D2C3A] text-white rounded-xl text-sm font-bold hover:bg-[#1A4A60] transition-colors"
          >
            <Plus size={14} />
            Novo Aluno
          </button>
        }
      />
      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome ou turma..."
          />
          <p className="text-xs text-muted-foreground font-medium">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-[#F8FAFB]">
                {["Aluno", "Turma", "E-mail", "Frequência", "Status", "Ações"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-[#F8FAFB] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <AvatarIcon name={s.name} size="sm" />
                      <span className="text-sm font-bold text-foreground">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-foreground font-medium">{s.class}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{s.email}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            s.freq >= 75 ? "bg-emerald-500" : "bg-red-500"
                          }`}
                          style={{ width: `${s.freq}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-foreground">{s.freq}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <Eye size={14} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => onEdit(s.id)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Edit size={14} className="text-muted-foreground" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3.5 border-t border-border bg-[#F8FAFB] flex items-center justify-end gap-1.5">
          <button className="px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-bold hover:bg-muted transition-colors">
            Anterior
          </button>
          <button className="px-3 py-1.5 rounded-lg border border-[#0D2C3A] bg-[#0D2C3A] text-white text-xs font-bold">
            1
          </button>
          <button className="px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-bold hover:bg-muted transition-colors">
            Próximo
          </button>
        </div>
      </Card>
    </div>
  );
}