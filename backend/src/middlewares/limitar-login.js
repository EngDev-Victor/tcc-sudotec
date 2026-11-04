import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

const JANELA_MINUTOS = 15;
const MAX_FALHAS = 5;

// Chave = IP + e-mail: um usuário errando a senha não bloqueia os outros da mesma rede
function chaveLogin(req) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  return `${ipKeyGenerator(req.ip)}|${email}`;
}

// Conta só as falhas (status >= 400). Na 6ª falha dentro da janela, responde 429.
export const limitarLogin = rateLimit({
  windowMs: JANELA_MINUTOS * 60 * 1000,
  limit: MAX_FALHAS,
  skipSuccessfulRequests: true,
  keyGenerator: chaveLogin,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: `Muitas tentativas de login. Tente novamente em ${JANELA_MINUTOS} minutos.`,
    });
  },
});

// Login certo zera as falhas acumuladas desse IP + e-mail
export async function zerarTentativasLogin(req) {
  await limitarLogin.resetKey(chaveLogin(req));
}