/*
  Warnings:

  - A unique constraint covering the columns `[nomeNormalizado]` on the table `Disciplina` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Disciplina" ADD COLUMN "nomeNormalizado" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Disciplina_nomeNormalizado_key" ON "Disciplina"("nomeNormalizado");
