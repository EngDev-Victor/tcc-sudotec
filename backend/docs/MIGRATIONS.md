# SKOLLA — Regras para migrations do banco

O schema do banco é mudado só por migrations do Prisma (`backend/prisma/migrations`). Este documento define como criar uma migration sem quebrar bancos que já têm dados.

## Histórico

Em 05/11/2026, as 6 migrations do desenvolvimento foram consolidadas numa única migration inicial (`20261105100000_inicial`), gerada a partir do `schema.prisma`. As antigas adicionavam colunas obrigatórias sem valor padrão e falhavam em bancos que já tinham registros. A consolidação foi feita antes do primeiro deploy, quando ainda não havia dados de produção.

**Depois do primeiro deploy, não se consolida mais.** A partir daí, valem as regras abaixo.

## Regras

1. **Toda migration nasce com `--create-only`.**
   ```powershell
   npx prisma migrate dev --create-only --name descricao_curta
   ```
   O comando cria o arquivo `migration.sql` sem aplicar nada.

2. **Leia o `migration.sql` antes de aplicar.** Confira:
   - se aparece o aviso `Added the required column ... without a default value. This is not possible if the table is not empty.` (ver regra 3);
   - se existe `DROP TABLE` ou `DROP COLUMN` de algo que tem dados;
   - se, numa recriação de tabela (`CREATE TABLE "new_..."` + `INSERT INTO ... SELECT`), **todas** as colunas antigas, incluindo o `id`, são copiadas.

3. **Coluna obrigatória nova numa tabela com dados: escolha uma das saídas.**

   | Situação | Saída |
   |---|---|
   | Existe um valor que serve para os registros antigos | `@default(...)` no schema (ex.: `ativo Boolean @default(true)`) |
   | Não existe um valor padrão razoável (ex.: CPF) | Em 3 passos: (a) criar a coluna como opcional (`String?`); (b) preencher os registros antigos (script ou cadastro); (c) outra migration tornando a coluna obrigatória |
   | O valor sai de outra coluna ou tabela | Editar o `migration.sql` **antes de aplicar**, preenchendo a coluna no `INSERT INTO ... SELECT` |

4. **Nunca edite uma migration já aplicada** em algum banco. O Prisma confere a assinatura de cada migration aplicada e, se o arquivo mudou, acusa divergência e pede `migrate reset`. Para corrigir algo, crie uma migration nova.

5. **Nunca rode `prisma migrate reset` nem `prisma db push` no `dev.db`** (nem em produção). Para aplicar migrations prontas, use:
   ```powershell
   npx prisma migrate deploy
   ```
   Ele só aplica o que falta. Não faz reset nem pergunta nada.

6. **Faça uma cópia do banco antes de aplicar:**
   ```powershell
   Copy-Item .\dev.db .\dev.db.antes-<descricao>.bak
   ```
   O `.gitignore` já ignora `*.db.bak` e `dev.db.*`.

7. **Depois de aplicar**, rode `npx prisma generate` e os testes no banco separado:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\testar-com-banco-teste.ps1
   ```
   O script recria o `test.db` do zero com todas as migrations. Assim, ele também prova que um banco novo é montado sem erro.

8. **Mudança só de enum no SQLite** (ex.: novo status): o SQLite guarda enums como texto, então o `--create-only` gera uma migration vazia (`-- This is an empty migration.`). Nesse caso, apague a pasta vazia e rode só `npx prisma generate`.

## Para quando houver produção (PostgreSQL)

- Teste toda migration nova numa **cópia** do banco de produção antes de aplicar no banco real.
- A regra "uma matrícula `ATIVA` por aluno e ano letivo" precisa de um índice único parcial no banco (ver a seção 8 do `CONTRATO_API.md`).