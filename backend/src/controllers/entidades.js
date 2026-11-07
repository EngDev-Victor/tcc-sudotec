import { prisma } from "../lib/prisma.js";
import { lerBooleano, normalizarTexto } from "../lib/consulta.js";
import { ErroHttp } from "../lib/erro-http.js";
import { criarCrudController, lerId } from "./crud-controller.js";

export { alunoController } from "./aluno-controller.js";
export { professorController } from "./professor-controller.js";

const disciplinaBase = criarCrudController("disciplina", {
  campos: ["nome", "cargaHoraria"],
  exclusaoBloqueadaPor: [
    {
      modelo: "alocacaoProfessorTurma",
      campo: "disciplinaId",
      mensagem:
        "Não é possível excluir a disciplina: ela está alocada em turmas.",
    },
    {
      modelo: "professor",
      campo: "disciplinaPrincipalId",
      mensagem:
        "Não é possível excluir a disciplina: ela é a disciplina principal de professores.",
    },
  ],
});

// Nome único entre todas as disciplinas, ativas e inativas,
// sem diferenciar maiúsculas, minúsculas, acentos e espaços extras
async function exigirNomeDisponivel(nome, idAtual) {
  if (nome === undefined) return;
  const alvo = normalizarTexto(nome);
  const todas = await prisma.disciplina.findMany({
    select: { id: true, nome: true, ativo: true },
  });
  const existente = todas.find(
    (d) => d.id !== idAtual && normalizarTexto(d.nome) === alvo,
  );
  if (existente) {
    throw new ErroHttp(
      409,
      existente.ativo
        ? "Já existe uma disciplina com esse nome."
        : "Já existe uma disciplina inativa com esse nome. Reative-a em vez de cadastrar outra.",
      undefined,
      ["nome"],
    );
  }
}

export const disciplinaController = {
  ...disciplinaBase,

  async criar(req, res) {
    await exigirNomeDisponivel(req.body.nome);
    return disciplinaBase.criar(req, res);
  },

  async atualizar(req, res) {
    await exigirNomeDisponivel(req.body.nome, lerId(req.params.id));
    return disciplinaBase.atualizar(req, res);
  },

  // GET /disciplinas?ativo=
  async listar(req, res) {
    const ativo = lerBooleano(req.query.ativo, "ativo");
    const disciplinas = await prisma.disciplina.findMany({
      where: ativo === undefined ? {} : { ativo },
      orderBy: { id: "asc" },
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

export { turmaController } from "./turma-controller.js";
export { alocacaoController } from "./alocacao-controller.js";
