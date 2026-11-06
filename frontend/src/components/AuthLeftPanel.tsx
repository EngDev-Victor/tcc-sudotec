import { SkollaLogo } from "@/components/SkollaLogo";

export function AuthLeftPanel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="hidden lg:flex w-[46%] bg-[#0D2C3A] flex-col justify-between p-12 relative overflow-hidden flex-shrink-0">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-28 -right-28 w-[400px] h-[400px] rounded-full bg-white/[0.04]" />
        <div className="absolute bottom-24 -left-20 w-72 h-72 rounded-full bg-white/[0.04]" />
        <div className="absolute top-2/3 right-12 w-2.5 h-2.5 rounded-full bg-sky-400/50" />
        <div className="absolute top-1/2 right-32 w-1.5 h-1.5 rounded-full bg-sky-400/30" />
        <div className="absolute top-1/4 left-16 w-1 h-1 rounded-full bg-sky-400/40" />
      </div>
      <SkollaLogo white />
      <div className="relative z-10 space-y-5">
        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.18em]">
          Gestão Escolar Simplificada
        </p>
        <h2 className="text-4xl font-black text-white leading-tight">{title}</h2>
        <p className="text-white/55 text-base leading-relaxed">{subtitle}</p>
        <div className="flex items-start gap-8 pt-5 mt-2 border-t border-white/[0.1]">
          {[
            { value: "22", label: "Funcionalidades" },
            { value: "1",  label: "Site" },
            { value: "0",  label: "Planilhas" },
          ].map((m, i) => (
            <div key={m.label} className="flex items-baseline gap-1.5">
              <p className="text-3xl font-black text-white">{m.value}</p>
              <p className="text-xs text-white/40 font-semibold leading-tight">{m.label}</p>
              {i < 2 && <span className="ml-5 text-white/15 text-xl font-thin select-none">|</span>}
            </div>
          ))}
        </div>
      </div>
      <p className="text-white/25 text-xs font-medium">
        © 2026 SKOLLA • Todos os direitos reservados
      </p>
    </div>
  );
}