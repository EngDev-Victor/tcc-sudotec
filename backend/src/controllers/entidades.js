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

// Nome único entre todas as disciplinas, ativas e inativas, sem diferenciar
// maiúsculas, minúsculas, acentos e espaços extras. A coluna nomeNormalizado
// tem índice único no banco: a consulta abaixo dá a mensagem certa, e o banco
// garante a regra mesmo com cadastros simultâneos.
function conflitoDeNome(ativa) {
  return new ErroHttp(
    409,
    ativa
      ? "Já existe uma disciplina com esse nome."
      : "Já existe uma disciplina inativa com esse nome. Reative-a em vez de cadastrar outra.",
    undefined,
    ["nome"],
  );
}

// Devolve o nome normalizado, ou lança 409 se ele já estiver em uso
async function exigirNomeDisponivel(nome, idAtual) {
  const alvo = normalizarTexto(nome);
  let existente = await prisma.disciplina.findUnique({
    where: { nomeNormalizado: alvo },
    select: { id: true, ativo: true },
  });
  if (!existente) {
    // Disciplinas antigas, ainda sem nomeNormalizado (antes do script de preenchimento)
    const antigas = await prisma.disciplina.findMany({
      where: { nomeNormalizado: null },
      select: { id: true, nome: true, ativo: true },
    });
    existente = antigas.find((d) => normalizarTexto(d.nome) === alvo) ?? null;
  }
  if (existente && existente.id !== idAtual) {
    throw conflitoDeNome(existente.ativo);
  }
  return alvo;
}

// Outro pedido gravou o mesmo nome entre a consulta e a gravação: o índice único recusa
async function gravarComNomeUnico(gravar) {
  try {
    return await gravar();
  } catch (error) {
    if (error.code === "P2002") throw conflitoDeNome(true);
    throw error;
  }
}

export const disciplinaController = {
  ...disciplinaBase,

  async criar(req, res) {
    const { nome, cargaHoraria } = req.body;
    const nomeNormalizado = await exigirNomeDisponivel(nome);
    const disciplina = await gravarComNomeUnico(() =>
      prisma.disciplina.create({
        data: { nome, cargaHoraria, nomeNormalizado },
      }),
    );
    return res.status(201).json(disciplina);
  },

  async atualizar(req, res) {
    const id = lerId(req.params.id);
    const { nome, cargaHoraria } = req.body;
    const data = {};
    if (nome !== undefined) {
      data.nome = nome;
      data.nomeNormalizado = await exigirNomeDisponivel(nome, id);
    }
    if (cargaHoraria !== undefined) data.cargaHoraria = cargaHoraria;
    const disciplina = await gravarComNomeUnico(() =>
      prisma.disciplina.update({ where: { id }, data }),
    );
    return res.json(disciplina);
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