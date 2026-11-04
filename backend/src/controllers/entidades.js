import { criarCrudController } from './crud-controller.js';

export const alunoController = criarCrudController('aluno', {
  campos: ['nome', 'email', 'matricula', 'cpf', 'dataNascimento', 'nomeResponsavel', 'telefone'],
});

export const professorController = criarCrudController('professor', {
  campos: ['nome', 'email', 'especialidade', 'telefone', 'titulacao'],
  opcionais: ['disciplinaPrincipalId'],
  include: { disciplinaPrincipal: true },
  referencias: { disciplinaPrincipalId: ['disciplina', 'Disciplina não encontrada.'] },
});

export const disciplinaController = criarCrudController('disciplina', {
  campos: ['nome', 'cargaHoraria'],
  exclusaoBloqueadaPor: [
    {
      modelo: 'alocacaoProfessorTurma',
      campo: 'disciplinaId',
      mensagem: 'Não é possível excluir a disciplina: ela está alocada em turmas.',
    },
    {
      modelo: 'professor',
      campo: 'disciplinaPrincipalId',
      mensagem: 'Não é possível excluir a disciplina: ela é a disciplina principal de professores.',
    },
  ],
});

export { turmaController } from './turma-controller.js';

export const alocacaoController = criarCrudController('alocacaoProfessorTurma', {
  campos: ['professorId', 'turmaId', 'disciplinaId'],
  include: { professor: true, turma: true, disciplina: true },
  filtros: ['turmaId', 'professorId', 'disciplinaId'],
  referencias: {
    professorId: ['professor', 'Professor não encontrado.'],
    turmaId: ['turma', 'Turma não encontrada.'],
    disciplinaId: ['disciplina', 'Disciplina não encontrada.'],
  },
});