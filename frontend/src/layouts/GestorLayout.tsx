import { Outlet } from "react-router";
import { Sidebar } from "@/components/Sidebar";

export function GestorLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F8]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}