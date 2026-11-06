import { getInitials } from "@/utils/texto";

export function AvatarIcon({
  name,
  size = "md",
  bg = "bg-[#0D2C3A]",
  className = "",
}: {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  bg?: string;
  className?: string;
}) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-20 h-20 text-2xl",
  };
  return (
    <div
      className={`rounded-xl ${bg} text-white font-bold flex items-center justify-center flex-shrink-0 ${sizes[size]} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}