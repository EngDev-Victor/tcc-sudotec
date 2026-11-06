import { useState } from "react";
import { GestorLayout } from "@/layouts/GestorLayout";
import { CLASSES_DATA, STUDENTS } from "@/mocks/dados";
import { AlunoFormPage } from "@/pages/Alunos/AlunoFormPage";
import { AlunosPage } from "@/pages/Alunos/AlunosPage";
import { DashboardPage } from "@/pages/Dashboard/DashboardPage";
import { LoginPage } from "@/pages/Login/LoginPage";
import { ProfessorFormPage } from "@/pages/Professores/ProfessorFormPage";
import { ProfessoresPage } from "@/pages/Professores/ProfessoresPage";
import { TurmaDetalhePage } from "@/pages/Turmas/TurmaDetalhePage";
import { TurmasPage } from "@/pages/Turmas/TurmasPage";
import type { Screen } from "@/types/navigation";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classDetailInitialTab, setClassDetailInitialTab] = useState<"students" | "teachers">("students");

  const navigate = (s: Screen) => {
    if (s === "admin-student-form") setSelectedStudentId(null);
    setScreen(s);
  };

  const openClassDetail = (classId: number, tab: "students" | "teachers") => {
    setSelectedClassId(classId);
    setClassDetailInitialTab(tab);
    setScreen("admin-class-detail");
  };

  const handleLogin = () => setScreen("admin-dashboard");
  const handleLogout = () => setScreen("login");

  if (screen === "login") return <LoginPage onLogin={handleLogin} />;

  const content = () => {
    switch (screen) {
      case "admin-dashboard":
        return <DashboardPage onNavigate={navigate} />;
      case "admin-students":
        return (
          <AlunosPage
            onCreate={() => {
              navigate("admin-student-form");
            }}
            onEdit={(id) => {
              setSelectedStudentId(id);
              setScreen("admin-student-form");
            }}
          />
        );
      case "admin-student-form":
        return (
          <AlunoFormPage
            student={STUDENTS.find((student) => student.id === selectedStudentId)}
            onBack={() => navigate("admin-students")}
          />
        );
      case "admin-teachers":
        return <ProfessoresPage onNavigate={navigate} />;
      case "admin-teacher-form":
        return <ProfessorFormPage onBack={() => navigate("admin-teachers")} />;
      case "admin-classes":
        return (
          <TurmasPage
            onNavigate={navigate}
            onOpenClassDetail={openClassDetail}
          />
        );
      case "admin-class-detail":
        return (
          <TurmaDetalhePage
            classId={selectedClassId ?? CLASSES_DATA[0].id}
            initialTab={classDetailInitialTab}
            onBack={() => navigate("admin-classes")}
          />
        );
      default:
        return null;
    }
  };

  return (
    <GestorLayout screen={screen} onNavigate={navigate} onLogout={handleLogout}>
      {content()}
    </GestorLayout>
  );
}