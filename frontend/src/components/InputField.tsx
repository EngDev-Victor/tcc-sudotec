export function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  erro,
  disabled,
  min,
  max,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Mensagem de erro exibida abaixo do campo */
  erro?: string;
  disabled?: boolean;
  min?: string | number;
  max?: string | number;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        aria-invalid={erro ? true : undefined}
        className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 transition-all disabled:bg-muted disabled:cursor-not-allowed ${
          erro
            ? "border-red-400 focus:ring-red-200 focus:border-red-500"
            : "border-border focus:ring-[#0D2C3A]/20 focus:border-[#0D2C3A]"
        }`}
      />
      {erro && <p className="text-xs text-red-600 font-medium mt-1">{erro}</p>}
    </div>
  );
}