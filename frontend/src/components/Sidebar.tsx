import {
  LayoutDashboard, Users, GraduationCap, BookOpen, LogOut,
  BookMarked, CalendarDays, Layers, ClipboardList, KeyRound,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { AvatarIcon } from "@/components/AvatarIcon";
import { SkollaLogo } from "@/components/SkollaLogo";
import { useAuth } from "@/contexts/AuthContext";
import { ROTULO_PAPEL } from "@/types/enums";

type ItemMenu = { icon: React.ElementType; label: string; to: string };

const SIDEBAR_NAV: ItemMenu[] = [
  { icon: LayoutDashboard, label: "Dashboard",             to: "/dashboard"    },
  { icon: Users,           label: "Gestão de Alunos",      to: "/alunos"       },
  { icon: GraduationCap,   label: "Gestão de Professores", to: "/professores"  },
  { icon: BookOpen,        label: "Gestão de Turmas",      to: "/turmas"       },
  { icon: BookMarked,      label: "Disciplinas",           to: "/disciplinas"  },
  { icon: CalendarDays,    label: "Anos Letivos",          to: "/anos-letivos" },
  { icon: Layers,          label: "Alocações",             to: "/alocacoes"    },
  { icon: ClipboardList,   label: "Matrículas",            to: "/matriculas"   },
  { icon: KeyRound,        label: "Contas de Acesso",      to: "/usuarios"     },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { usuario, sair } = useAuth();
  const user = {
    name: usuario?.nome ?? "",
    sub: usuario ? `${ROTULO_PAPEL[usuario.papel]} • ${usuario.email}` : "",
  };
  const items = SIDEBAR_NAV;

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");
  const onLogout = () => {
    sair();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="w-64 flex-shrink-0 bg-[#0D2C3A] flex flex-col h-full">
      <div className="px-5 py-6 border-b border-white/10">
        <SkollaLogo white />
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {items.map((item) => {
          const active = isActive(item.to);
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
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