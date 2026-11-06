// Classes de botão do protótipo, centralizadas para manter o mesmo visual em todas as telas.

export const BTN_PRIMARIO =
  "flex items-center justify-center gap-2 px-4 py-2 bg-[#0D2C3A] text-white rounded-xl text-sm font-bold hover:bg-[#1A4A60] transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

export const BTN_SECUNDARIO =
  "flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border bg-white text-sm font-bold text-foreground hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

export const BTN_PERIGO =
  "flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

/** Botão de ícone das tabelas (editar, excluir...) */
export const BTN_ICONE =
  "p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed";