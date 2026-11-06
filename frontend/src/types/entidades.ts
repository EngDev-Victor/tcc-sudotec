// Objetos devolvidos pela API (seção 6 do contrato).
// Datas chegam como texto ISO 8601 em UTC (ex.: "2026-02-01T00:00:00.000Z").

import type { Papel, StatusMatricula, Titulacao, Turno } from "@/types/enums";

type Timestamps = { createdAt: string; updatedAt: string };

// ─── Autenticação ────────────────────────────────────────────────────────────

export type UsuarioLogado = { id: number; nome: string; email: string; papel: Papel };
export type LoginResposta = { token: string; usuario: UsuarioLogado };
export type Me = UsuarioLogado & { ativo: boolean };

// ─── Usuários (contas de acesso) ─────────────────────────────────────────────

export type Usuario = Timestamps & {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
};

// ─── Anos letivos ────────────────────────────────────────────────────────────

export type AnoLetivo = Timestamps & {
  id: number;
  ano: number;
  dataInicio: string;
  dataFim: string;
  ativo: boolean;
};

/** Item de GET /anos-letivos */
export type AnoLetivoListagem = AnoLetivo & { _count: { turmas: number } };

/** GET /anos-letivos/:id */
export type AnoLetivoDetalhe = AnoLetivo & { turmas: Turma[] };

// ─── Disciplinas ─────────────────────────────────────────────────────────────

export type Disciplina = Timestamps & {
  id: number;
  nome: string;
  cargaHoraria: number;
  ativo: boolean;
};

// ─── Alunos ──────────────────────────────────────────────────────────────────

export type Aluno = Timestamps & {
  id: number;
  nome: string;
  email: string;
  matricula: string;
  cpf: string;
  dataNascimento: string;
  nomeResponsavel: string;
  telefone: string;
  ativo: boolean;
  usuarioId: number | null;
};

/** PATCH /alunos/:id/ativo com { ativo: false } */
export type AlunoInativado = Aluno & { matriculasSuspensas: number };

export type MatriculaMantidaSuspensa = { matriculaId: number; turmaId: number; motivo: string };

/** PATCH /alunos/:id/ativo com { ativo: true } */
export type AlunoReativado = Aluno & {
  matriculasRestauradas: number[];
  matriculasMantidasSuspensas: MatriculaMantidaSuspensa[];
};

// ─── Professores ─────────────────────────────────────────────────────────────

export type Professor = Timestamps & {
  id: number;
  nome: string;
  email: string;
  especialidade: string;
  telefone: string;
  titulacao: Titulacao;
  ativo: boolean;
  disciplinaPrincipalId: number | null;
  /** Presente nas rotas GET/POST/PUT; ausente na resposta do PATCH /ativo */
  disciplinaPrincipal?: Disciplina | null;
  usuarioId: number | null;
};

// ─── Turmas ──────────────────────────────────────────────────────────────────

export type Turma = Timestamps & {
  id: number;
  nome: string;
  turno: Turno;
  sala: string;
  anoLetivoId: number;
  /** Incluído na listagem, criação e atualização */
  anoLetivo?: AnoLetivo;
};

export type TurmaAluno = {
  matriculaId: number;
  id: number;
  nome: string;
  email: string;
  matricula: string;
};

export type TurmaProfessor = {
  alocacaoId: number;
  professor: Pick<Professor, "id" | "nome" | "email" | "especialidade" | "ativo">;
  disciplina: Disciplina;
};

/** GET /turmas/:id */
export type TurmaDetalhe = Turma & {
  anoLetivo: AnoLetivo;
  alunos: TurmaAluno[];
  professores: TurmaProfessor[];
  totais: { alunosAtivos: number; alocacoes: number };
};

// ─── Alocações ───────────────────────────────────────────────────────────────

export type Alocacao = {
  id: number;
  professorId: number;
  turmaId: number;
  disciplinaId: number;
  professor: Professor;
  turma: Turma;
  disciplina: Disciplina;
};

// ─── Matrículas ──────────────────────────────────────────────────────────────

export type Matricula = Timestamps & {
  id: number;
  alunoId: number;
  turmaId: number;
  status: StatusMatricula;
  aluno: Aluno;
  turma: Turma;
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

type ResumoCadastro = { total: number; ativos: number; inativos: number };

export type OcupacaoTurma = {
  turmaId: number;
  nome: string;
  turno: Turno;
  sala: string;
  alunosAtivos: number;
  professores: number;
  alocacoes: number;
};

export type DashboardComAno = {
  anoLetivo: AnoLetivo;
  totais: { alunos: number; professores: number; disciplinas: number; turmas: number };
  alunos: ResumoCadastro & { matriculadosNoAno: number };
  professores: ResumoCadastro & { alocadosNoAno: number };
  matriculas: Record<StatusMatricula, number>;
  ocupacaoPorTurma: OcupacaoTurma[];
  pendencias: {
    turmasSemProfessor: { id: number; nome: string }[];
    turmasSemAlunos: { id: number; nome: string }[];
    alunosSemMatriculaAtiva: {
      total: number;
      itens: { id: number; nome: string; matricula: string }[];
    };
  };
};

export type DashboardSemAno = {
  anoLetivo: null;
  aviso: string;
  totais: { alunos: number; professores: number; disciplinas: number; turmas: number };
  alunos: ResumoCadastro;
  professores: ResumoCadastro;
};

/** GET /dashboard/gestor — use `dados.anoLetivo === null` para distinguir */
export type Dashboard = DashboardComAno | DashboardSemAno;