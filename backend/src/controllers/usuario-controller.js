import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { ErroHttp } from '../lib/erro-http.js';
import { lerId } from './crud-controller.js';

const PAPEIS = ['GESTOR', 'PROFESSOR', 'ALUNO', 'RESPONSAVEL'];

// Nunca devolver o senhaHash
const publico = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  ativo: true,
  createdAt: true,
  updatedAt: true,
};

export const usuarioController = {
  async listar(req, res) {
    const usuarios = await prisma.usuario.findMany({ select: publico, orderBy: { id: 'asc' } });
    return res.json(usuarios);
  },

  async criar(req, res) {
    const { nome, senha, papel } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!nome || !email || !senha || !papel) {
      throw new ErroHttp(400, 'Campos obrigatórios: nome, email, senha, papel.');
    }
    if (!PAPEIS.includes(papel)) {
      throw new ErroHttp(400, `Papel inválido. Use: ${PAPEIS.join(', ')}.`);
    }
    if (String(senha).length < 8) {
      throw new ErroHttp(400, 'A senha deve ter no mínimo 8 caracteres.');
    }

    const senhaHash = await bcrypt.hash(String(senha), 10);
    const usuario = await prisma.usuario.create({
      data: { nome, email, senhaHash, papel },
      select: publico,
    });
    return res.status(201).json(usuario);
  },

  async definirAtivo(req, res) {
    const { ativo } = req.body;
    if (typeof ativo !== 'boolean') {
      throw new ErroHttp(400, 'Campo obrigatório: ativo (true ou false).');
    }
    const id = lerId(req.params.id);
    if (id === req.usuario.id && !ativo) {
      throw new ErroHttp(400, 'Você não pode desativar a própria conta.');
    }
    const usuario = await prisma.usuario.update({
      where: { id },
      data: { ativo },
      select: publico,
    });
    return res.json(usuario);
  },
};