// Formatação de valores vindos da API para exibição e para formulários.

/** "2026-02-01T00:00:00.000Z" → "01/02/2026" (usa UTC para não voltar um dia no fuso do Brasil) */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dia = String(d.getUTCDate()).padStart(2, "0");
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${d.getUTCFullYear()}`;
}

/** "2026-02-01T00:00:00.000Z" → "2026-02-01" (valor para <input type="date"> e para a API) */
export function dataParaInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** "52998224725" → "529.982.247-25" */
export function formatarCPF(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

/** "46999990000" → "(46) 99999-0000"; "4635550000" → "(46) 3555-0000" */
export function formatarTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  const corte = d.length === 11 ? 5 : 4;
  if (resto.length <= corte) return `(${ddd}) ${resto}`;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}