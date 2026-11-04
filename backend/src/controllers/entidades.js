import { criarCrudController } from './crud-controller.js';

export { alunoController } from './aluno-controller.js';
export { professorController } from './professor-controller.js';

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
export { alocacaoController } from './alocacao-controller.js';