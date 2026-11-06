export type Situacao = "todas" | "ativas" | "inativas";

const OPCOES: { valor: Situacao; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "ativas", rotulo: "Ativas" },
  { valor: "inativas", rotulo: "Inativas" },
];

/** Abas Todas / Ativas / Inativas, no estilo das abas do protótipo. */
export function FiltroSituacao({
  valor,
  onChange,
  rotulos,
}: {
  valor: Situacao;
  onChange: (v: Situacao) => void;
  /** Troca os textos (ex.: "Ativos" / "Inativos") */
  rotulos?: Partial<Record<Situacao, string>>;
}) {
  return (
    <div className="flex bg-muted rounded-xl p-1">
      {OPCOES.map((o) => (
        <button
          key={o.valor}
          onClick={() => onChange(o.valor)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            valor === o.valor
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {rotulos?.[o.valor] ?? o.rotulo}
        </button>
      ))}
    </div>
  );
}

/** Converte o filtro para o parâmetro ?ativo= da API */
export function situacaoParaAtivo(s: Situacao): boolean | undefined {
  return s === "todas" ? undefined : s === "ativas";
}