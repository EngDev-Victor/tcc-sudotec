import { criarCrudController } from './crud-controller.js';

export const alunoController = criarCrudController('aluno', {
  campos: ['nome', 'email', 'matricula'],
});

export const professorController = criarCrudController('professor', {
  campos: ['nome', 'email', 'especialidade'],
});

export const disciplinaController = criarCrudController('disciplina', {
  campos: ['nome', 'cargaHoraria'],
});

export { turmaController } from './turma-controller.js';

export const alocacaoController = criarCrudController('alocacaoProfessorTurma', {
  campos: ['professorId', 'turmaId', 'disciplinaId'],
  include: { professor: true, turma: true, disciplina: true },
  filtros: ['turmaId', 'professorId', 'disciplinaId'],
});