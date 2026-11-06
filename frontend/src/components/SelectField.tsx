export function SelectField({
  label,
  value,
  onChange,
  options,
  erro,
  disabled,
  placeholder = "Selecione...",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  /** Mensagem de erro exibida abaixo do campo */
  erro?: string;
  disabled?: boolean;
  /** Texto da opção vazia (valor "") */
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={erro ? true : undefined}
        className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 transition-all disabled:bg-muted disabled:cursor-not-allowed ${
          erro
            ? "border-red-400 focus:ring-red-200 focus:border-red-500"
            : "border-border focus:ring-[#0D2C3A]/20 focus:border-[#0D2C3A]"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {erro && <p className="text-xs text-red-600 font-medium mt-1">{erro}</p>}
    </div>
  );
}