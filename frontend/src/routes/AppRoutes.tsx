import { Navigate, Route, Routes } from "react-router";
import { GestorLayout } from "@/layouts/GestorLayout";
import { RotaProtegida } from "@/routes/RotaProtegida";
import { LoginPage } from "@/pages/Login/LoginPage";
import { DashboardPage } from "@/pages/Dashboard/DashboardPage";
import { AlunosPage } from "@/pages/Alunos/AlunosPage";
import { AlunoFormPage } from "@/pages/Alunos/AlunoFormPage";
import { ProfessoresPage } from "@/pages/Professores/ProfessoresPage";
import { ProfessorFormPage } from "@/pages/Professores/ProfessorFormPage";
import { TurmasPage } from "@/pages/Turmas/TurmasPage";
import { TurmaDetalhePage } from "@/pages/Turmas/TurmaDetalhePage";
import { AnosLetivosPage } from "@/pages/AnosLetivos/AnosLetivosPage";
import { DisciplinasPage } from "@/pages/Disciplinas/DisciplinasPage";
import { AlocacoesPage } from "@/pages/Alocacoes/AlocacoesPage";
import { MatriculasPage } from "@/pages/Matriculas/MatriculasPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Área do gestor: exige login com papel GESTOR */}
      <Route element={<RotaProtegida />}>
        <Route element={<GestorLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/alunos" element={<AlunosPage />} />
          <Route path="/alunos/novo" element={<AlunoFormPage />} />
          <Route path="/alunos/:id/editar" element={<AlunoFormPage />} />

          <Route path="/professores" element={<ProfessoresPage />} />
          <Route path="/professores/novo" element={<ProfessorFormPage />} />
          <Route path="/professores/:id/editar" element={<ProfessorFormPage />} />

          <Route path="/turmas" element={<TurmasPage />} />
          <Route path="/turmas/:id" element={<TurmaDetalhePage />} />

          <Route path="/anos-letivos" element={<AnosLetivosPage />} />
          <Route path="/disciplinas" element={<DisciplinasPage />} />
          <Route path="/alocacoes" element={<AlocacoesPage />} />
          <Route path="/matriculas" element={<MatriculasPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}