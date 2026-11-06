import {
  LayoutDashboard, Users, GraduationCap, BookOpen, LogOut,
} from "lucide-react";
import { AvatarIcon } from "@/components/AvatarIcon";
import { SkollaLogo } from "@/components/SkollaLogo";
import type { Screen } from "@/types/navigation";

const SIDEBAR_NAV: { icon: React.ElementType; label: string; screen: Screen }[] = [
  { icon: LayoutDashboard, label: "Dashboard",             screen: "admin-dashboard" },
  { icon: Users,           label: "Gestão de Alunos",      screen: "admin-students"  },
  { icon: GraduationCap,   label: "Gestão de Professores", screen: "admin-teachers"  },
  { icon: BookOpen,        label: "Gestão de Turmas",      screen: "admin-classes"   },
];

const SIDEBAR_USER = { name: "Secretaria SKOLLA", sub: "Gestor" };

export function Sidebar({
  screen,
  onNavigate,
  onLogout,
}: {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
}) {
  const user = SIDEBAR_USER;
  const items = SIDEBAR_NAV;

  const isActive = (s: Screen) => {
    if (screen === s) return true;
    if (s === "admin-students" && screen === "admin-student-form") return true;
    if (s === "admin-teachers" && screen === "admin-teacher-form") return true;
    if (s === "admin-classes" && screen === "admin-class-detail") return true;
    return false;
  };

  return (
    <nav className="w-64 flex-shrink-0 bg-[#0D2C3A] flex flex-col h-full">
      <div className="px-5 py-6 border-b border-white/10">
        <SkollaLogo white />
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {items.map((item) => {
          const active = isActive(item.screen);
          return (
            <button
              key={item.screen}
              onClick={() => onNavigate(item.screen)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? "bg-white/[0.12] text-white"
                  : "text-white/55 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <item.icon
                size={16}
                className={active ? "text-sky-400" : ""}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <div className="px-3 pb-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
          <AvatarIcon name={user.name} size="sm" bg="bg-sky-600" />
          <div className="min-w-0">
            <p className="text-white text-xs font-bold truncate">{user.name}</p>
            <p className="text-white/45 text-[10px] truncate">{user.sub}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/45 hover:bg-white/[0.07] hover:text-white transition-all"
        >
          <LogOut size={15} />
          Sair da conta
        </button>
      </div>
    </nav>
  );
}