import { SkollaLogoMark } from "@/components/SkollaLogo";

export function TelaCarregando({ mensagem = "Carregando..." }: { mensagem?: string }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[#F4F6F8]">
      <div className="animate-pulse">
        <SkollaLogoMark size={48} />
      </div>
      <p className="text-sm font-semibold text-muted-foreground">{mensagem}</p>
    </div>
  );
}