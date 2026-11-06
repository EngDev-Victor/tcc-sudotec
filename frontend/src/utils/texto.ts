export const getInitials = (name: string) =>
  name.trim().split(" ").filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join("");

/** Para buscas: minúsculas e sem acentos ("José" → "jose") */
export const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();