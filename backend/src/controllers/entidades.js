import { prisma } from '../lib/prisma.js';
import { lerBooleano } from '../lib/consulta.js';
import { criarCrudController, lerId } from './crud-controller.js';

export { alunoController } from './aluno-controller.js';
export { professorController } from './professor-controller.js';

const disciplinaBase = criarCrudController('disciplina', {
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

export const disciplinaController = {
  ...disciplinaBase,

  // GET /disciplinas?ativo=
  async listar(req, res) {
    const ativo = lerBooleano(req.query.ativo, 'ativo');
    const disciplinas = await prisma.disciplina.findMany({
      where: ativo === undefined ? {} : { ativo },
      orderBy: { id: 'asc' },
    });
    return res.json(disciplinas);
  },

  // PATCH /disciplinas/:id/ativo — inativar mantém as alocações existentes (histórico),
  // mas a disciplina não pode receber novas alocações nem virar disciplina principal
  async definirAtivo(req, res) {
    const disciplina = await prisma.disciplina.update({
      where: { id: lerId(req.params.id) },
      data: { ativo: req.body.ativo },
    });
    return res.json(disciplina);
  },
};

export { turmaController } from './turma-controller.js';
export { alocacaoController } from './alocacao-controller.js';