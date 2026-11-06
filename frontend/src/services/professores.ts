import { api } from "@/services/api";
import type { Paginado, ParametrosPaginacao } from "@/types/api";
import type { Professor } from "@/types/entidades";
import type { Titulacao } from "@/types/enums";

export type DadosProfessor = {
  nome: string;
  email: string;
  especialidade: string;
  telefone: string;
  titulacao: Titulacao;
  /** null = sem disciplina principal */
  disciplinaPrincipalId: number | null;
};

export type FiltrosProfessores = ParametrosPaginacao & {
  busca?: string;
  ativo?: boolean;
  /** Professores com alocação nessa turma */
  turmaId?: number;
  /** Professores com alocação nessa disciplina */
  disciplinaId?: number;
  disciplinaPrincipalId?: number;
};

/** GET /professores — paginado, ordem alfabética */
export function listarProfessores(filtros: FiltrosProfessores = {}): Promise<Paginado<Professor>> {
  return api.get<Paginado<Professor>>("/professores", { query: filtros });
}

export function buscarProfessor(id: number): Promise<Professor> {
  return api.get<Professor>(`/professores/${id}`);
}

export function criarProfessor(dados: DadosProfessor): Promise<Professor> {
  return api.post<Professor>("/professores", dados);
}

/** PUT /professores/:id — envie só os campos alterados (ao menos um) */
export function atualizarProfessor(id: number, dados: Partial<DadosProfessor>): Promise<Professor> {
  return api.put<Professor>(`/professores/${id}`, dados);
}

/** PATCH /professores/:id/ativo — as alocações continuam no banco */
export function alterarAtivoProfessor(id: number, ativo: boolean): Promise<Professor> {
  return api.patch<Professor>(`/professores/${id}/ativo`, { ativo });
}

/**
 * Todos os professores que passam no filtro, percorrendo as páginas (limite máximo da API: 100).
 * Usado para preencher listas de seleção.
 */
export async function listarTodosProfessores(filtros: Omit<FiltrosProfessores, "pagina" | "limite"> = {}): Promise<Professor[]> {
  const todos: Professor[] = [];
  let pagina = 1;
  for (;;) {
    const r = await listarProfessores({ ...filtros, pagina, limite: 100 });
    todos.push(...r.dados);
    if (pagina >= r.paginacao.totalPaginas) return todos;
    pagina++;
  }
}