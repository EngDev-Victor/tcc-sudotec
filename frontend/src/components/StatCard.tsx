import { Card } from "@/components/Card";

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "#0D2C3A",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="p-5 flex items-start gap-4">
      <div
        className="p-2.5 rounded-xl flex-shrink-0"
        style={{ backgroundColor: color + "18" }}
      >
        <Icon size={19} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-foreground">{value}</p>
        <p className="text-xs font-semibold text-muted-foreground mt-0.5">
          {label}
        </p>
        {sub && (
          <p className="text-xs text-muted-foreground mt-0.5 opacity-70">
            {sub}
          </p>
        )}
      </div>
    </Card>
  );
}