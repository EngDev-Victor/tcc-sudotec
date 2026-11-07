import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.ts';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });

// nomeNormalizado é uso interno da regra de nome único: não sai nas respostas da API
export const prisma = new PrismaClient({
  adapter,
  omit: { disciplina: { nomeNormalizado: true } },
});