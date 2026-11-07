// Preenche Disciplina.nomeNormalizado nas disciplinas criadas antes da coluna existir.
// Uso (na pasta backend, com a API parada):  npx tsx scripts/preencher-nome-normalizado.js
// Usa o DATABASE_URL do .env. Pode rodar mais de uma vez: só mexe nas que estão vazias.
import { prisma } from '../src/lib/prisma.js';
import { normalizarTexto } from '../src/lib/consulta.js';

const todas = await prisma.disciplina.findMany({
  select: { id: true, nome: true, nomeNormalizado: true },
  orderBy: { id: 'asc' },
});

// Confere duplicidades antes de gravar qualquer coisa
const porNome = new Map();
for (const d of todas) {
  const alvo = normalizarTexto(d.nome);
  if (!porNome.has(alvo)) porNome.set(alvo, []);
  porNome.get(alvo).push(d);
}
const repetidas = [...porNome.values()].filter((lista) => lista.length > 1);
if (repetidas.length) {
  console.error('Nada foi alterado. Há disciplinas com o mesmo nome (sem acentos/maiúsculas):');
  for (const lista of repetidas) {
    console.error('  - ' + lista.map((d) => `#${d.id} "${d.nome}"`).join(', '));
  }
  console.error('Renomeie uma de cada grupo pela tela de Disciplinas e rode de novo.');
  await prisma.$disconnect();
  process.exit(1);
}

const pendentes = todas.filter((d) => d.nomeNormalizado === null);
for (const d of pendentes) {
  await prisma.disciplina.update({
    where: { id: d.id },
    data: { nomeNormalizado: normalizarTexto(d.nome) },
  });
}
console.log(`Disciplinas: ${todas.length} no banco, ${pendentes.length} preenchidas agora.`);
await prisma.$disconnect();