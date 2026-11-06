
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-border shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}