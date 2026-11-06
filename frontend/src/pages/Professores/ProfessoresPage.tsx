import { useState } from "react";
import {
  Plus, Edit, Trash2, Eye,
} from "lucide-react";
import { AvatarIcon } from "@/components/AvatarIcon";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { StatusBadge } from "@/components/StatusBadge";
import { TEACHERS } from "@/mocks/dados";
import { useNavigate } from "react-router";

export function ProfessoresPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const filtered = TEACHERS.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <PageHeader
        title="Gestão de Professores"
        subtitle={`${TEACHERS.length} professores cadastrados`}
        actions={
          <button
            onClick={() => navigate("/professores/novo")}
            className="flex items-center gap-2 px-4 py-2 bg-[#0D2C3A] text-white rounded-xl text-sm font-bold hover:bg-[#1A4A60] transition-colors"
          >
            <Plus size={14} />
            Novo Professor
          </button>
        }
      />
      <Card>
        <div className="px-5 py-4 border-b border-border">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome ou disciplina..."
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-[#F8FAFB]">
                {["Professor", "Disciplina", "Titulação", "Turmas", "Status", "Ações"].map((h) => (
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
              {filtered.map((t) => (
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
                  <td className="px-5 py-3.5 text-sm font-black text-foreground">{t.classes}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <Eye size={14} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => navigate("/professores/novo")}
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
      </Card>
    </div>
  );
}