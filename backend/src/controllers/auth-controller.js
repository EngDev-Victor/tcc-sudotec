import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { ErroHttp } from '../lib/erro-http.js';
import { zerarTentativasLogin } from '../middlewares/limitar-login.js'; // 6.3

// Hash falso para comparar mesmo quando o e-mail não existe (evita revelar quais e-mails estão cadastrados pelo tempo de resposta)
const HASH_FALSO = bcrypt.hashSync('senha-invalida', 10);

export const authController = {
  async login(req, res) {
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');

    if (!email || !senha) {
      throw new ErroHttp(400, 'Campos obrigatórios: email, senha.');
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    const senhaConfere = await bcrypt.compare(senha, usuario?.senhaHash ?? HASH_FALSO);

    if (!usuario || !senhaConfere || !usuario.ativo) {
      throw new ErroHttp(401, 'Credenciais inválidas.');
    }

    const token = jwt.sign({ papel: usuario.papel }, process.env.JWT_SECRET, {
      subject: String(usuario.id),
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    // Login certo: zera as falhas acumuladas deste IP + e-mail
    await zerarTentativasLogin(req); // 6.3

    return res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
    });
  },

  async me(req, res) {
    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { id: req.usuario.id },
      select: { id: true, nome: true, email: true, papel: true, ativo: true },
    });
    return res.json(usuario);
  },
};