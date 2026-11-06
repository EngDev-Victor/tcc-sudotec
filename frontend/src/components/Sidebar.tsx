import {
  LayoutDashboard, Users, GraduationCap, BookOpen, LogOut,
  BookMarked, CalendarDays, Layers, ClipboardList, KeyRound,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { AvatarIcon } from "@/components/AvatarIcon";
import { SkollaLogo } from "@/components/SkollaLogo";

type ItemMenu = {
  icon: React.ElementType;
  label: string;
  to: string;
  // false = tela ainda não implementada (aparece desabilitada)
  pronto: boolean;
};

const SIDEBAR_NAV: ItemMenu[] = [
  { icon: LayoutDashboard, label: "Dashboard",             to: "/dashboard",     pronto: true  },
  { icon: Users,           label: "Gestão de Alunos",      to: "/alunos",        pronto: true  },
  { icon: GraduationCap,   label: "Gestão de Professores", to: "/professores",   pronto: true  },
  { icon: BookOpen,        label: "Gestão de Turmas",      to: "/turmas",        pronto: true  },
  { icon: BookMarked,      label: "Disciplinas",           to: "/disciplinas",   pronto: false },
  { icon: CalendarDays,    label: "Anos Letivos",          to: "/anos-letivos",  pronto: false },
  { icon: Layers,          label: "Alocações",             to: "/alocacoes",     pronto: false },
  { icon: ClipboardList,   label: "Matrículas",            to: "/matriculas",    pronto: false },
  { icon: KeyRound,        label: "Contas de Acesso",      to: "/usuarios",      pronto: false },
];

const SIDEBAR_USER = { name: "Secretaria SKOLLA", sub: "Gestor" };

export function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = SIDEBAR_USER;
  const items = SIDEBAR_NAV;

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");
  const onLogout = () => navigate("/login");

  return (
    <nav className="w-64 flex-shrink-0 bg-[#0D2C3A] flex flex-col h-full">
      <div className="px-5 py-6 border-b border-white/10">
        <SkollaLogo white />
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {items.map((item) => {
          if (!item.pronto) {
            return (
              <div
                key={item.to}
                title="Em breve"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/25 cursor-not-allowed select-none"
              >
                <item.icon size={16} />
                <span className="flex-1 text-left">{item.label}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/25">Em breve</span>
              </div>
            );
          }
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