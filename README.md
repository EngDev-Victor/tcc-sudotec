# SKOLLA — Gestão Escolar

Plataforma web de gestão escolar desenvolvida como Trabalho de Conclusão de Curso. Esta versão (MVP) implementa o **módulo Gestor**: o painel da secretaria/coordenação para organizar anos letivos, turmas, disciplinas, professores, alunos, matrículas e contas de acesso.

> Os módulos Professor, Aluno e Responsável fazem parte da visão do projeto, mas estão fora do escopo deste MVP.

---

## Funcionalidades

| Área | O que o gestor pode fazer |
|---|---|
| **Acesso** | Login com JWT; sessão validada a cada abertura; só contas com papel Gestor entram no sistema |
| **Dashboard** | Indicadores do ano letivo, alunos por turma, matrículas por status e pendências (turmas sem professor, alunos sem matrícula) |
| **Anos letivos** | Cadastrar, editar, excluir e ativar — só um ano fica ativo por vez; anos anteriores ao ativo são considerados encerrados |
| **Turmas** | Cadastrar, editar e excluir por ano letivo; detalhe com alunos e professores da turma |
| **Disciplinas** | Cadastrar, editar, inativar/reativar e excluir (bloqueado quando há vínculos) |
| **Professores** | Cadastro com titulação e disciplina principal; busca, filtros e paginação; inativação sem perder o histórico |
| **Alunos** | Cadastro com CPF e telefone validados; busca sem acentos, filtros e paginação; inativação e reativação com restauração das matrículas |
| **Alocações** | Definir qual professor leciona qual disciplina em cada turma |
| **Matrículas** | Matricular (inclusive rematrícula antecipada no ano seguinte), transferir entre turmas do mesmo ano e cancelar, com histórico completo |
| **Contas de acesso** | Criar contas e ativá-las/desativá-las (a desativação derruba o acesso na hora) |

Principais regras de negócio (detalhadas no [contrato da API](backend/docs/CONTRATO_API.md)):

- alunos e professores **nunca são excluídos**, apenas inativados;
- um aluno tem no máximo **uma matrícula ativa por ano letivo**;
- só se matricula em turma do **ano ativo ou de um ano futuro**;
- transferências só entre turmas do **mesmo ano letivo**; a matrícula antiga fica como `TRANSFERIDA`;
- o período do ano letivo precisa estar **dentro do próprio ano**;
- o nome da disciplina é **único**, sem diferenciar maiúsculas, minúsculas e acentos (inclusive em relação às inativas).

---

## Tecnologias

**Back-end** — Node.js, Express 5, Prisma 7 com SQLite, Zod 4 (validação), JSON Web Token, bcryptjs, express-rate-limit (limite de tentativas de login).

**Front-end** — React 18, TypeScript, Vite 6, Tailwind CSS 4, React Router 7, Recharts (gráficos), Sonner (avisos), Radix UI (diálogos), Lucide (ícones). A interface partiu de um protótipo gerado no Figma Make.

---

## Estrutura do repositório

```
Skolla/
├── package.json         # workspaces (backend + frontend) e script para subir os dois
├── validar-projeto.ps1  # validação completa: TypeScript, build e testes da API
├── backend/
│   ├── docs/            # CONTRATO_API.md e MIGRATIONS.md
│   ├── prisma/          # schema, migration inicial e seed do gestor
│   ├── scripts/         # testes da API e dados de apresentação
│   └── src/             # controllers, rotas, middlewares e validações
└── frontend/
    └── src/
        ├── pages/       # uma pasta por tela
        ├── components/  # componentes reutilizáveis
        ├── services/    # chamadas à API
        ├── contexts/    # autenticação
        ├── types/       # tipos do contrato da API
        └── utils/       # formatação e tratamento de erros
```

---

## Como executar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20.19 ou superior (exigência do Prisma 7), com npm
- Git
- Windows PowerShell, para os scripts de teste e de dados de demonstração

### 1. Clonar e instalar

```bash
git clone https://github.com/JoaoRodriguesqtw/Skolla.git
cd Skolla
npm install
```

O repositório usa **npm workspaces**: um único `npm install` na raiz instala as dependências do back-end e do front-end (elas ficam em `Skolla/node_modules`).

### 2. Configurar o back-end

Copie `backend/.env.example` para `backend/.env` e preencha:

| Variável | Exemplo | Uso |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | Banco SQLite |
| `JWT_SECRET` | um texto longo e aleatório | Assinatura do token (obrigatório) |
| `JWT_EXPIRES_IN` | `8h` | Validade do login |
| `PORT` | `3000` | Porta da API |
| `CORS_ORIGIN` | `http://localhost:5173` | Endereço do front-end (opcional; esse é o padrão) |
| `SEED_GESTOR_NOME` / `SEED_GESTOR_EMAIL` / `SEED_GESTOR_SENHA` | — | Gestor inicial criado pelo seed |

### 3. Criar o banco e o gestor inicial

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
npm run seed
```

### 4. Configurar o front-end

Copie `frontend/.env.example` para `frontend/.env`. O valor padrão já aponta para a API local:

```
VITE_API_URL=http://localhost:3000/api
```

### 5. Rodar

Na raiz, um comando sobe os dois:

```bash
npm run dev          # API em http://localhost:3000 e sistema em http://localhost:5173
```

Ou, se preferir, em dois terminais:

```bash
# terminal 1
cd backend
npm run dev

# terminal 2
cd frontend
npm run dev
```

Entre com o e-mail e a senha definidos em `SEED_GESTOR_EMAIL` e `SEED_GESTOR_SENHA`.

---

## Dados de demonstração

O script `backend/scripts/popular-apresentacao.ps1` cria, **pela própria API**, uma escola de exemplo: anos letivos 2025 (encerrado), 2026 (ativo) e 2027 (futuro), turmas, disciplinas, professores, 24 alunos e matrículas com todos os status — incluindo um caso pronto de cada regra de negócio.

Com o banco recém-criado (só o gestor do seed) e o back-end rodando:

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\scripts\popular-apresentacao.ps1
```

Para voltar a base ao estado original (por exemplo, depois de um ensaio), pare o back-end e rode os comandos abaixo. **Atenção: o `migrate reset` apaga todos os dados do `dev.db`.** Use só numa base de demonstração; as regras de [migrations](backend/docs/MIGRATIONS.md) proíbem o reset em qualquer base com dados que precisam ser mantidos.

```powershell
npx prisma migrate reset --force
npm run seed
npm run dev
# em outro terminal:
powershell -ExecutionPolicy Bypass -File .\scripts\popular-apresentacao.ps1
```

Contas extras criadas pelo script (senha `Skolla@2026`):

| E-mail | Papel | Observação |
|---|---|---|
| `coordenacao@skolla.edu.br` | Gestor | entra no sistema |
| `ana.ferreira@skolla.edu.br` | Professor | login recusado — o MVP é exclusivo do gestor |

---

## Testes

A validação completa roda, na raiz, a checagem de tipos e o build do front-end e os testes da API, e grava o resultado em `relatorio-validacao.txt`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\validar-projeto.ps1
```

Os testes da API (**250 verificações**) rodam num banco de teste separado (`backend/test.db`, API na porta 3001); o `dev.db` não é alterado. Para rodar só eles (com a porta 3001 livre):

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\scripts\testar-com-banco-teste.ps1
```

Só o front-end:

```bash
cd frontend
npm run typecheck    # checagem de tipos do TypeScript
npm run build        # build de produção
```

---

## Documentação

- [Contrato da API](backend/docs/CONTRATO_API.md) — rotas, campos, respostas, erros e regras de negócio
- [Migrations](backend/docs/MIGRATIONS.md) — regras para alterar o banco

---

## Limitações conhecidas

- Somente o módulo Gestor está implementado.
- As contas de acesso ainda não são vinculadas aos cadastros de professores e alunos.
- O status de matrícula `CONCLUIDA` existe, mas o encerramento automático do ano ainda não foi implementado.
- O projeto roda localmente; não há deploy publicado.
- O banco é SQLite, adequado ao desenvolvimento e à demonstração; para publicação, a recomendação é migrar para PostgreSQL.

A lista completa está na seção 8 do contrato da API.

