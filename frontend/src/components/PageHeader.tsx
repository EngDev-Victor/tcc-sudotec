import {
  ArrowLeft,
} from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  onBack,
  actions,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-7">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft size={17} className="text-foreground" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-black text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
}