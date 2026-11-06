import { Sidebar } from "@/components/Sidebar";
import type { Screen } from "@/types/navigation";

export function GestorLayout({
  screen,
  onNavigate,
  onLogout,
  children,
}: {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F8]">
      <Sidebar
        screen={screen}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
    </div>
  );
}