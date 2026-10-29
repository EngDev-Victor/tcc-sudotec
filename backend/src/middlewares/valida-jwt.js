import jwt from 'jsonwebtoken';
import { ErroHttp } from '../lib/erro-http.js';

export function validaJwt(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');

  if (tipo !== 'Bearer' || !token) {
    throw new ErroHttp(401, 'Token não informado.');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.usuario = { id: Number(payload.sub), papel: payload.papel };
    return next();
  } catch {
    throw new ErroHttp(401, 'Token inválido ou expirado.');
  }
}