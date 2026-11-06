import { useState } from "react";
import {
  Save,
} from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { PageHeader } from "@/components/PageHeader";
import { SelectField } from "@/components/SelectField";
import { CLASSES_DATA, STUDENTS } from "@/mocks/dados";

export function AlunoFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const student = id ? STUDENTS.find((s) => s.id === Number(id)) : undefined;
  const onBack = () => navigate("/alunos");
  const isEditing = Boolean(student);
  const [f, setF] = useState({
    name: student?.name ?? "",
    email: student?.email ?? "",
    cpf: "",
    dob: "",
    guardian: "",
    phone: "",
    class: student?.class ?? "",
    status: student?.status ?? "ativo",
  });
  const s = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="p-8">
      <PageHeader
        title={isEditing ? "Editar cadastro" : "Cadastro de Aluno"}
        subtitle={
          isEditing
            ? "Atualize os dados e o status do aluno"
            : "Preencha os dados para matricular um novo aluno"
        }
        onBack={onBack}
      />
      <Card className="max-w-2xl">
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <InputField label="Nome completo" value={f.name} onChange={(v) => s("name", v)} placeholder="Nome completo do aluno" />
          </div>
          <InputField label="E-mail" type="email" value={f.email} onChange={(v) => s("email", v)} placeholder="email@skolla.edu.br" />
          <InputField label="CPF" value={f.cpf} onChange={(v) => s("cpf", v)} placeholder="000.000.000-00" />
          <InputField label="Data de nascimento" type="date" value={f.dob} onChange={(v) => s("dob", v)} />
          <InputField label="Nome do responsável" value={f.guardian} onChange={(v) => s("guardian", v)} placeholder="Nome completo" />
          <InputField label="Telefone de contato" value={f.phone} onChange={(v) => s("phone", v)} placeholder="(11) 99999-9999" />
          <SelectField
            label="Turma"
            value={f.class}
            onChange={(v) => s("class", v)}
            options={CLASSES_DATA.map((c) => ({ value: c.name, label: `${c.name} – ${c.period}` }))}
          />
          {isEditing && (
            <SelectField
              label="Status"
              value={f.status}
              onChange={(v) => s("status", v)}
              options={[
                { value: "ativo", label: "Ativo" },
                { value: "inativo", label: "Inativo" },
              ]}
            />
          )}
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
            {isEditing ? "Salvar alterações" : "Salvar Aluno"}
          </button>
        </div>
      </Card>
    </div>
  );
}