// Enums do contrato da API (seção 5).

export type Papel = "GESTOR" | "PROFESSOR" | "ALUNO" | "RESPONSAVEL";
export type Turno = "MANHA" | "TARDE";
export type Titulacao = "GRADUACAO" | "ESPECIALIZACAO" | "MESTRADO" | "DOUTORADO";
export type StatusMatricula = "ATIVA" | "SUSPENSA" | "TRANSFERIDA" | "CANCELADA" | "CONCLUIDA";

export const PAPEIS: Papel[] = ["GESTOR", "PROFESSOR", "ALUNO", "RESPONSAVEL"];
export const TURNOS: Turno[] = ["MANHA", "TARDE"];
export const TITULACOES: Titulacao[] = ["GRADUACAO", "ESPECIALIZACAO", "MESTRADO", "DOUTORADO"];
export const STATUS_MATRICULA: StatusMatricula[] = ["ATIVA", "SUSPENSA", "TRANSFERIDA", "CANCELADA", "CONCLUIDA"];

// Rótulos para exibição na interface
export const ROTULO_PAPEL: Record<Papel, string> = {
  GESTOR: "Gestor",
  PROFESSOR: "Professor",
  ALUNO: "Aluno",
  RESPONSAVEL: "Responsável",
};

export const ROTULO_TURNO: Record<Turno, string> = {
  MANHA: "Manhã",
  TARDE: "Tarde",
};

export const ROTULO_TITULACAO: Record<Titulacao, string> = {
  GRADUACAO: "Graduação",
  ESPECIALIZACAO: "Especialização",
  MESTRADO: "Mestrado",
  DOUTORADO: "Doutorado",
};

export const ROTULO_STATUS_MATRICULA: Record<StatusMatricula, string> = {
  ATIVA: "Ativa",
  SUSPENSA: "Suspensa",
  TRANSFERIDA: "Transferida",
  CANCELADA: "Cancelada",
  CONCLUIDA: "Concluída",
};