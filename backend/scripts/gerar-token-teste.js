// Uso exclusivo do testar-api.ps1: gera tokens assinados com o JWT_SECRET do .env
// node scripts/gerar-token-teste.js <id do usuário> <valido|expirado> [papel]
import 'dotenv/config';
import jwt from 'jsonwebtoken';

const [sub = '1', modo = 'valido', papel = 'GESTOR'] = process.argv.slice(2);

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET não definido no .env');
  process.exit(1);
}

const agora = Math.floor(Date.now() / 1000);
const payload = {
  sub: String(sub),
  papel,
  iat: agora - 3600,
  exp: modo === 'expirado' ? agora - 60 : agora + 300,
};

process.stdout.write(jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256' }));