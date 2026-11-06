const TONS = {
  verde: "bg-emerald-50 text-emerald-700 border-emerald-200",
  vermelho: "bg-red-50 text-red-600 border-red-200",
  ambar: "bg-amber-50 text-amber-700 border-amber-200",
  azul: "bg-sky-50 text-sky-700 border-sky-200",
  cinza: "bg-gray-50 text-gray-600 border-gray-200",
};

export type TomBadge = keyof typeof TONS;

export function Badge({ tom, children }: { tom: TomBadge; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${TONS[tom]}`}
    >
      {children}
    </span>
  );
}