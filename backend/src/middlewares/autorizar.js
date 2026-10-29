import { ErroHttp } from '../lib/erro-http.js';

export const autorizar = (...papeisPermitidos) => (req, res, next) => {
  if (!req.usuario || !papeisPermitidos.includes(req.usuario.papel)) {
    throw new ErroHttp(403, 'Você não tem permissão para acessar este recurso.');
  }
  return next();
};