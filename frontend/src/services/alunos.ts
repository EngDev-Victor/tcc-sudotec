import { api } from "@/services/api";
import type { Paginado, ParametrosPaginacao } from "@/types/api";
import type { Aluno, AlunoInativado, AlunoReativado } from "@/types/entidades";

/** Datas no formato AAAA-MM-DD; CPF e telefone com ou sem máscara */
export type DadosAluno = {
  nome: string;
  email: string;
  matricula: string;
  cpf: string;
  dataNascimento: string;
  nomeResponsavel: string;
  telefone: string;
};

export type FiltrosAlunos = ParametrosPaginacao & {
  busca?: string;
  ativo?: boolean;
  /** Só alunos com matrícula ATIVA nessa turma */
  turmaId?: number;
  /** Só alunos com matrícula ATIVA numa turma desse ano letivo */
  anoLetivoId?: number;
};

/** GET /alunos — paginado, ordem alfabética */
export function listarAlunos(filtros: FiltrosAlunos = {}): Promise<Paginado<Aluno>> {
  return api.get<Paginado<Aluno>>("/alunos", { query: filtros });
}

export function buscarAluno(id: number): Promise<Aluno> {
  return api.get<Aluno>(`/alunos/${id}`);
}

export function criarAluno(dados: DadosAluno): Promise<Aluno> {
  return api.post<Aluno>("/alunos", dados);
}

/** PUT /alunos/:id — envie só os campos alterados (ao menos um) */
export function atualizarAluno(id: number, dados: Partial<DadosAluno>): Promise<Aluno> {
  return api.put<Aluno>(`/alunos/${id}`, dados);
}

/** PATCH /alunos/:id/ativo { ativo: false } — matrículas ATIVA passam a SUSPENSA */
export function inativarAluno(id: number): Promise<AlunoInativado> {
  return api.patch<AlunoInativado>(`/alunos/${id}/ativo`, { ativo: false });
}

/** PATCH /alunos/:id/ativo { ativo: true } — tenta restaurar as matrículas SUSPENSA */
export function reativarAluno(id: number): Promise<AlunoReativado> {
  return api.patch<AlunoReativado>(`/alunos/${id}/ativo`, { ativo: true });
}