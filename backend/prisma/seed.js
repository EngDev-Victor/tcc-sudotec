import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';

const nome = process.env.SEED_GESTOR_NOME || 'Administrador';
const email = process.env.SEED_GESTOR_EMAIL?.trim().toLowerCase();
const senha = process.env.SEED_GESTOR_SENHA;

if (!email || !senha) {
  console.error('Defina SEED_GESTOR_EMAIL e SEED_GESTOR_SENHA no .env');
  process.exit(1);
}

const senhaHash = await bcrypt.hash(senha, 10);

const gestor = await prisma.usuario.upsert({
  where: { email },
  update: { senhaHash },
  create: { nome, email, senhaHash, papel: 'GESTOR' },
});

console.log(`Gestor pronto: ${gestor.email} (id ${gestor.id})`);
await prisma.$disconnect();