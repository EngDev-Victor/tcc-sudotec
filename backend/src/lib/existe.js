import { prisma } from './prisma.js';
import { ErroHttp } from './erro-http.js';

// Confirma que o registro referenciado existe, com uma mensagem específica
export async function exigirExistencia(modelo, id, mensagem) {
  const registro = await prisma[modelo].findUnique({ where: { id }, select: { id: true } });
  if (!registro) {
    throw new ErroHttp(404, mensagem);
  }
}