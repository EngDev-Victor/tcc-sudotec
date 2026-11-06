import { useState } from "react";
import {
  Save,
} from "lucide-react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { PageHeader } from "@/components/PageHeader";
import { SelectField } from "@/components/SelectField";

export function ProfessorFormPage({ onBack }: { onBack: () => void }) {
  const [f, setF] = useState({ name: "", email: "", subject: "", degree: "", phone: "" });
  const s = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const subjects = ["Matemática", "Português", "Ciências", "História", "Geografia", "Inglês", "Ed. Física", "Arte"];

  return (
    <div className="p-8">
      <PageHeader
        title="Cadastro de Professor"
        subtitle="Preencha os dados do novo docente"
        onBack={onBack}
      />
      <Card className="max-w-2xl">
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <InputField label="Nome completo" value={f.name} onChange={(v) => s("name", v)} placeholder="Nome completo do professor" />
          </div>
          <InputField label="E-mail institucional" type="email" value={f.email} onChange={(v) => s("email", v)} placeholder="professor@skolla.edu.br" />
          <InputField label="Telefone" value={f.phone} onChange={(v) => s("phone", v)} placeholder="(11) 99999-9999" />
          <SelectField
            label="Disciplina principal"
            value={f.subject}
            onChange={(v) => s("subject", v)}
            options={subjects.map((sub) => ({ value: sub, label: sub }))}
          />
          <InputField label="Titulação" value={f.degree} onChange={(v) => s("degree", v)} placeholder="Ex: Mestre em Educação" />
        </div>
        <div className="px-6 py-4 border-t border-border bg-[#F8FAFB] flex justify-end gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl border border-border text-sm font-bold text-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button className="px-4 py-2 rounded-xl bg-[#0D2C3A] text-white text-sm font-bold hover:bg-[#1A4A60] transition-colors flex items-center gap-2">
            <Save size={13} />
            Salvar Professor
          </button>
        </div>
      </Card>
    </div>
  );
}