import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { ErroHttp } from '../lib/erro-http.js';

// Valida o token e confere no banco se o usuário ainda existe e está ativo.
// O papel usado na autorização é sempre o atual do banco, não o gravado no token.
export async function validaJwt(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');

  if (tipo !== 'Bearer' || !token) {
    throw new ErroHttp(401, 'Token não informado.');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (erro) {
    if (erro instanceof jwt.TokenExpiredError) {
      throw new ErroHttp(401, 'Token expirado. Faça login novamente.');
    }
    throw new ErroHttp(401, 'Token inválido.');
  }

  const id = Number(payload.sub);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ErroHttp(401, 'Token inválido.');
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, papel: true, ativo: true },
  });

  if (!usuario) {
    throw new ErroHttp(401, 'Usuário do token não existe mais.');
  }
  if (!usuario.ativo) {
    throw new ErroHttp(401, 'Usuário desativado. Procure o gestor da escola.');
  }

  req.usuario = { id: usuario.id, papel: usuario.papel };
  return next();
}