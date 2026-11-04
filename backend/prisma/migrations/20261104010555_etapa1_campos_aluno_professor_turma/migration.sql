/*
  Warnings:

  - Added the required column `cpf` to the `Aluno` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dataNascimento` to the `Aluno` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nomeResponsavel` to the `Aluno` table without a default value. This is not possible if the table is not empty.
  - Added the required column `telefone` to the `Aluno` table without a default value. This is not possible if the table is not empty.
  - Added the required column `telefone` to the `Professor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titulacao` to the `Professor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sala` to the `Turma` table without a default value. This is not possible if the table is not empty.
  - Added the required column `turno` to the `Turma` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Aluno" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "dataNascimento" DATETIME NOT NULL,
    "nomeResponsavel" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "usuarioId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Aluno_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Aluno" ("createdAt", "email", "id", "matricula", "nome", "updatedAt", "usuarioId") SELECT "createdAt", "email", "id", "matricula", "nome", "updatedAt", "usuarioId" FROM "Aluno";
DROP TABLE "Aluno";
ALTER TABLE "new_Aluno" RENAME TO "Aluno";
CREATE UNIQUE INDEX "Aluno_email_key" ON "Aluno"("email");
CREATE UNIQUE INDEX "Aluno_matricula_key" ON "Aluno"("matricula");
CREATE UNIQUE INDEX "Aluno_cpf_key" ON "Aluno"("cpf");
CREATE UNIQUE INDEX "Aluno_usuarioId_key" ON "Aluno"("usuarioId");
CREATE TABLE "new_Professor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "titulacao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "disciplinaPrincipalId" INTEGER,
    "usuarioId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Professor_disciplinaPrincipalId_fkey" FOREIGN KEY ("disciplinaPrincipalId") REFERENCES "Disciplina" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Professor_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Professor" ("createdAt", "email", "especialidade", "id", "nome", "updatedAt", "usuarioId") SELECT "createdAt", "email", "especialidade", "id", "nome", "updatedAt", "usuarioId" FROM "Professor";
DROP TABLE "Professor";
ALTER TABLE "new_Professor" RENAME TO "Professor";
CREATE UNIQUE INDEX "Professor_email_key" ON "Professor"("email");
CREATE UNIQUE INDEX "Professor_usuarioId_key" ON "Professor"("usuarioId");
CREATE TABLE "new_Turma" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "turno" TEXT NOT NULL,
    "sala" TEXT NOT NULL,
    "anoLetivoId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Turma_anoLetivoId_fkey" FOREIGN KEY ("anoLetivoId") REFERENCES "AnoLetivo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Turma" ("anoLetivoId", "createdAt", "id", "nome", "updatedAt") SELECT "anoLetivoId", "createdAt", "id", "nome", "updatedAt" FROM "Turma";
DROP TABLE "Turma";
ALTER TABLE "new_Turma" RENAME TO "Turma";
CREATE UNIQUE INDEX "Turma_nome_anoLetivoId_key" ON "Turma"("nome", "anoLetivoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
