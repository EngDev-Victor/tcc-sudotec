// Janela modal no visual SKOLLA, sobre o Dialog (Radix) do shadcn.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

// Classes escritas por extenso para o Tailwind encontrá-las no código
const LARGURAS = {
  md: "max-w-md sm:max-w-md",
  lg: "max-w-lg sm:max-w-lg",
  xl: "max-w-2xl sm:max-w-2xl",
};

export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  rodape,
  largura = "lg",
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: React.ReactNode;
  children?: React.ReactNode;
  rodape?: React.ReactNode;
  largura?: keyof typeof LARGURAS;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !abrir && aoFechar()}>
      <DialogContent className={`${LARGURAS[largura]} rounded-xl p-6 gap-5 bg-white`}>
        <div>
          <DialogTitle className="text-lg font-black text-foreground">{titulo}</DialogTitle>
          {descricao ? (
            <DialogDescription className="text-sm text-muted-foreground mt-1.5">{descricao}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{titulo}</DialogDescription>
          )}
        </div>
        {children}
        {rodape && <div className="flex justify-end gap-2 pt-1">{rodape}</div>}
      </DialogContent>
    </Dialog>
  );
}