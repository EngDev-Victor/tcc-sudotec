import { ErroHttp } from '../lib/erro-http.js';

// Valida e limpa o req.body: remove campos desconhecidos, aplica trim e minúsculas no e-mail
export const validar = (esquema) => (req, res, next) => {
  const resultado = esquema.safeParse(req.body ?? {});

  if (!resultado.success) {
    const detalhes = resultado.error.issues.map((problema) => ({
      campo: problema.path.join('.') || null,
      mensagem: problema.message,
    }));
    throw new ErroHttp(400, 'Dados inválidos.', detalhes);
  }

  req.body = resultado.data;
  return next();
};