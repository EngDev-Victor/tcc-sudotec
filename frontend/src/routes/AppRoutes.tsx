import { Navigate, Route, Routes } from "react-router";
import { GestorLayout } from "@/layouts/GestorLayout";
import { LoginPage } from "@/pages/Login/LoginPage";
import { DashboardPage } from "@/pages/Dashboard/DashboardPage";
import { AlunosPage } from "@/pages/Alunos/AlunosPage";
import { AlunoFormPage } from "@/pages/Alunos/AlunoFormPage";
import { ProfessoresPage } from "@/pages/Professores/ProfessoresPage";
import { ProfessorFormPage } from "@/pages/Professores/ProfessorFormPage";
import { TurmasPage } from "@/pages/Turmas/TurmasPage";
import { TurmaDetalhePage } from "@/pages/Turmas/TurmaDetalhePage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Área do gestor (a proteção por login entra na etapa de autenticação) */}
      <Route element={<GestorLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/alunos" element={<AlunosPage />} />
        <Route path="/alunos/novo" element={<AlunoFormPage />} />
        <Route path="/alunos/:id/editar" element={<AlunoFormPage />} />

        <Route path="/professores" element={<ProfessoresPage />} />
        <Route path="/professores/novo" element={<ProfessorFormPage />} />

        <Route path="/turmas" element={<TurmasPage />} />
        <Route path="/turmas/:id" element={<TurmaDetalhePage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}