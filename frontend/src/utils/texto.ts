export const getInitials = (name: string) =>
  name.trim().split(" ").filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join("");