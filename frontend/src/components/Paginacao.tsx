import type { Paginado } from "@/types/api";

/** Rodapé de tabela paginada, no estilo do protótipo. */
export function Paginacao({
  paginacao,
  onMudarPagina,
  desabilitado = false,
}: {
  paginacao: Paginado<unknown>["paginacao"];
  onMudarPagina: (pagina: number) => void;
  desabilitado?: boolean;
}) {
  const { pagina, limite, total, totalPaginas } = paginacao;
  const inicio = total === 0 ? 0 : (pagina - 1) * limite + 1;
  const fim = Math.min(pagina * limite, total);

  // Até 5 números ao redor da página atual
  const primeira = Math.max(1, Math.min(pagina - 2, totalPaginas - 4));
  const numeros = Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => primeira + i);

  const botao =
    "px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-bold hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="px-5 py-3.5 border-t border-border bg-[#F8FAFB] flex items-center justify-between gap-3 flex-wrap">
      <p className="text-xs text-muted-foreground font-medium">
        {total === 0 ? "Nenhum registro" : `Mostrando ${inicio}–${fim} de ${total.toLocaleString("pt-BR")}`}
      </p>
      {totalPaginas > 1 && (
        <div className="flex items-center gap-1.5">
          <button className={botao} disabled={desabilitado || pagina <= 1} onClick={() => onMudarPagina(pagina - 1)}>
            Anterior
          </button>
          {numeros.map((n) =>
            n === pagina ? (
              <button key={n} className="px-3 py-1.5 rounded-lg border border-[#0D2C3A] bg-[#0D2C3A] text-white text-xs font-bold">
                {n}
              </button>
            ) : (
              <button key={n} className={botao} disabled={desabilitado} onClick={() => onMudarPagina(n)}>
                {n}
              </button>
            ),
          )}
          <button
            className={botao}
            disabled={desabilitado || pagina >= totalPaginas}
            onClick={() => onMudarPagina(pagina + 1)}
          >
            Próximo
          </button>
        </div>
      )}
    </div>
  );
}