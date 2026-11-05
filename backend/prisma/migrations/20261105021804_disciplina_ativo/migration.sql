-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Disciplina" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "cargaHoraria" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Disciplina" ("cargaHoraria", "createdAt", "id", "nome", "updatedAt") SELECT "cargaHoraria", "createdAt", "id", "nome", "updatedAt" FROM "Disciplina";
DROP TABLE "Disciplina";
ALTER TABLE "new_Disciplina" RENAME TO "Disciplina";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
