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

export const turmaController = criarCrudController('turma', {
  campos: ['nome', 'anoLetivo'],
});

export const alocacaoController = criarCrudController('alocacaoProfessorTurma', {
  campos: ['professorId', 'turmaId', 'disciplinaId'],
  include: { professor: true, turma: true, disciplina: true },
});