# SKOLLA — Contrato da API (módulo Gestor)

Documento gerado a partir do código do back-end (`backend/src`) em 04/11/2026, após a etapa 6 (segurança), as correções de regra e os ajustes da revisão do back-end. O comportamento descrito aqui é coberto pelo script `backend/scripts/testar-api.ps1` (236 verificações), executado num banco de teste separado com `backend/scripts/testar-com-banco-teste.ps1`: em 05/11/2026, 236 passaram e 0 falharam, com o `dev.db` intacto (SHA-256 igual antes e depois).

---

## 1. Visão geral

| Item | Valor |
|---|---|
| URL base (desenvolvimento) | `http://localhost:3000/api` |
| Formato | JSON (`Content-Type: application/json`) em requisições e respostas |
| Autenticação | JWT no cabeçalho `Authorization: Bearer <token>` |
| Perfil com acesso | `GESTOR` em todas as rotas, exceto `POST /auth/login` (pública) e `GET /auth/me` (qualquer usuário ativo) |
| Datas na entrada | Texto `AAAA-MM-DD` (ex.: `"2026-02-01"`) |
| Datas na saída | ISO 8601 em UTC (ex.: `"2026-02-01T00:00:00.000Z"`) |
| IDs | Inteiros positivos |

`GET /` (fora de `/api`) responde `{ "message": "API SKOLLA ativa e operacional." }` e serve para checar se o servidor está no ar.

### 1.1 Configuração (`.env`)

| Variável | Obrigatória | Padrão | Uso |
|---|---|---|---|
| `DATABASE_URL` | sim | — | Banco SQLite, ex.: `file:./dev.db` |
| `JWT_SECRET` | sim | — | Segredo de assinatura do token. O servidor não sobe sem ele. |
| `JWT_EXPIRES_IN` | não | `8h` | Validade do token |
| `PORT` | não | `3000` | Porta HTTP |
| `CORS_ORIGIN` | não | `http://localhost:5173` | Origens liberadas para o navegador, separadas por vírgula |
| `SEED_GESTOR_NOME` / `SEED_GESTOR_EMAIL` / `SEED_GESTOR_SENHA` | só para `npm run seed` | — | Cria ou atualiza o gestor inicial |

---

## 2. Regras gerais

### 2.1 Autenticação e autorização

1. `POST /auth/login` devolve o token.
2. Toda rota protegida exige `Authorization: Bearer <token>`.
3. A cada requisição, o token é validado (assinatura HS256 e expiração) **e** o usuário é conferido no banco:
   - usuário inexistente ou desativado → `401`, mesmo com o token ainda dentro da validade;
   - o papel usado na autorização é o **atual do banco**, não o gravado no token.
4. Exceto `/auth/me`, todas as rotas exigem papel `GESTOR`. Outro papel → `403`.

### 2.2 Corpo das requisições

- O corpo é validado antes de chegar ao controller. **Campos desconhecidos são descartados** sem erro.
- Textos passam por `trim`. E-mails são guardados em minúsculas.
- Em `PUT` (atualização), todos os campos são opcionais, mas é preciso enviar **pelo menos um**.
- JSON malformado → `400` `{ "error": "JSON inválido no corpo da requisição." }`.
- Corpo que não é objeto (ex.: uma lista) → `400` com detalhe `"O corpo da requisição deve ser um objeto JSON."`.

### 2.3 Parâmetros de rota e de consulta

- `:id` precisa ser um inteiro positivo. Caso contrário → `400` `{ "error": "ID inválido." }`.
- Booleanos em query string aceitam só `true` ou `false`. Outro valor → `400`, por exemplo `Parâmetro "ativo" inválido. Use true ou false.`.
- IDs em query string (`?turmaId=`) precisam ser inteiros positivos. Caso contrário → `400`. Nas listagens de alunos, professores, alocações e matrículas a mensagem cita o parâmetro (ex.: `Parâmetro "turmaId" inválido. Use um número inteiro maior que zero.`). Em `/turmas?anoLetivoId=` e `/dashboard/gestor?anoLetivoId=` a mensagem é `ID inválido.`.
- Buscar por um `:id` que não existe → `404` `{ "error": "Registro não encontrado." }`, salvo quando a rota tem mensagem própria (ex.: `Matrícula não encontrada.`).

### 2.4 Paginação

As rotas `GET /alunos`, `GET /professores` e `GET /matriculas` são paginadas:

| Parâmetro | Padrão | Regra |
|---|---|---|
| `pagina` | `1` | inteiro ≥ 1 |
| `limite` | `20` | inteiro entre 1 e 100 |

Formato da resposta:

```json
{
  "dados": [ ... ],
  "paginacao": { "pagina": 1, "limite": 20, "total": 57, "totalPaginas": 3 }
}
```

As demais listagens (`/usuarios`, `/anos-letivos`, `/disciplinas`, `/turmas`, `/alocacoes`) devolvem uma **lista simples**, sem paginação.

### 2.5 Busca por nome

`GET /alunos` e `GET /professores` aceitam `?busca=`:
- ignora acentos e maiúsculas (`jose` encontra `José`);
- procura o trecho em qualquer parte do nome;
- máximo de 100 caracteres;
- o resultado sai em ordem alfabética (pt-BR), com ou sem busca.

### 2.6 Histórico e inativação

- **Alunos e professores nunca são apagados.** `DELETE` responde `405`. Eles são inativados com `PATCH /:id/ativo`.
- Matrículas não têm `DELETE`. Elas mudam de status (cancelar, transferir, suspender).
- Disciplinas podem ser inativadas com `PATCH /disciplinas/:id/ativo` e também excluídas, mas só quando não têm vínculos.
- Exclusões que quebrariam vínculos (turma com matrículas, disciplina alocada, ano letivo com turmas etc.) respondem `409`.

---

## 3. Formato dos erros

Todos os erros são JSON com o campo `error`:

```json
{ "error": "Mensagem em português." }
```

Erros de validação (`400`) trazem também `detalhes`, com um item por campo:

```json
{
  "error": "Dados inválidos.",
  "detalhes": [
    { "campo": "nome", "mensagem": "Campo obrigatório." },
    { "campo": "turno", "mensagem": "Turno inválido. Use: MANHA, TARDE." }
  ]
}
```

Conflitos de valor único (`409`) trazem `campos`, quando o campo pode ser identificado:

```json
{ "error": "Já existe um aluno com esse CPF.", "campos": ["cpf"] }
```

### 3.1 Códigos de status

| Status | Quando |
|---|---|
| `200` | Sucesso com corpo |
| `201` | Registro criado |
| `204` | Excluído (sem corpo) |
| `400` | Dados inválidos, JSON malformado, parâmetro inválido |
| `401` | Sem token, token inválido ou expirado, usuário inexistente ou desativado, credenciais erradas |
| `403` | Papel sem permissão |
| `404` | Registro não encontrado, referência inexistente, rota inexistente |
| `405` | `DELETE` em aluno ou professor |
| `409` | Regra de negócio violada, valor único repetido, exclusão bloqueada por vínculos |
| `429` | Limite de tentativas de login atingido |
| `500` | Erro inesperado: `{ "error": "Erro interno do servidor." }` |

### 3.2 Mensagens de autenticação (`401`)

| Situação | `error` |
|---|---|
| Sem cabeçalho ou sem `Bearer` | `Token não informado.` |
| Token expirado | `Token expirado. Faça login novamente.` |
| Assinatura ou formato inválido | `Token inválido.` |
| Usuário do token apagado | `Usuário do token não existe mais.` |
| Usuário desativado | `Usuário desativado. Procure o gestor da escola.` |
| Login com e-mail, senha ou usuário inativo | `Credenciais inválidas.` |

`403`: `{ "error": "Você não tem permissão para acessar este recurso." }`

### 3.3 Mensagens de duplicidade (`409` com `campos`)

| `campos` | `error` |
|---|---|
| `["cpf"]` | `Já existe um aluno com esse CPF.` |
| `["matricula"]` | `Já existe um aluno com esse número de matrícula.` |
| `["email"]` | `Já existe um usuário / um aluno / um professor com esse e-mail.` (conforme a entidade) |
| `["ano"]` | `Já existe um ano letivo com esse ano.` |
| `["nome","anoLetivoId"]` | `Já existe uma turma com esse nome neste ano letivo.` |
| `["professorId","turmaId","disciplinaId"]` | `Esse professor já está alocado nessa turma para essa disciplina.` |
| campo não identificado | `Já existe um registro com esse valor único.` (sem `campos`) |

### 3.4 Rota inexistente

```json
{ "error": "Rota não encontrada: GET /api/rota-que-nao-existe" }
```

Dentro de `/api`, a autenticação vem antes: sem token a resposta é `401`, com papel diferente de gestor é `403`, e só o gestor recebe o `404`.

---

## 4. Segurança

### 4.1 CORS

- Liberado para as origens de `CORS_ORIGIN` (padrão `http://localhost:5173`).
- Métodos: `GET, POST, PUT, PATCH, DELETE`. Cabeçalhos: `Content-Type, Authorization`.
- A pré-verificação do navegador (`OPTIONS`) responde `204` **sem exigir token**.
- Outras origens não recebem `Access-Control-Allow-Origin`, e o navegador bloqueia a leitura da resposta.

### 4.2 Limite de tentativas de login

- **5 falhas em 15 minutos** para o mesmo **IP + e-mail** → a 6ª tentativa responde `429`, mesmo com a senha certa:
  ```json
  { "error": "Muitas tentativas de login. Tente novamente em 15 minutos." }
  ```
- Só respostas de erro contam. Um login certo zera o contador daquele IP + e-mail.
- Outros e-mails no mesmo IP não são afetados.
- As respostas trazem os cabeçalhos padrão `RateLimit-Policy` e `RateLimit`.
- O contador fica na memória do servidor: reiniciar o servidor zera tudo.

---

## 5. Enums

| Enum | Valores |
|---|---|
| `Papel` | `GESTOR`, `PROFESSOR`, `ALUNO`, `RESPONSAVEL` |
| `Turno` | `MANHA`, `TARDE` |
| `Titulacao` | `GRADUACAO`, `ESPECIALIZACAO`, `MESTRADO`, `DOUTORADO` |
| `StatusMatricula` | `ATIVA`, `SUSPENSA`, `TRANSFERIDA`, `CANCELADA`, `CONCLUIDA` |

Status de matrícula:

| Status | Significado |
|---|---|
| `ATIVA` | Aluno cursando a turma. Só pode haver **uma** por aluno em cada ano letivo. |
| `SUSPENSA` | Aluno foi inativado. Pode voltar a `ATIVA` na reativação. |
| `TRANSFERIDA` | Encerrada por transferência para outra turma do mesmo ano. |
| `CANCELADA` | Encerrada manualmente. Não é restaurada automaticamente. |
| `CONCLUIDA` | Reservado. Nenhuma rota define este status ainda. |

---

## 6. Rotas

Resumo:

| Método | Rota | Acesso |
|---|---|---|
| POST | `/auth/login` | público |
| GET | `/auth/me` | qualquer usuário ativo |
| GET | `/dashboard/gestor` | gestor |
| GET, POST | `/usuarios` | gestor |
| PATCH | `/usuarios/:id/ativo` | gestor |
| GET, POST | `/anos-letivos` | gestor |
| GET, PUT, DELETE | `/anos-letivos/:id` | gestor |
| PATCH | `/anos-letivos/:id/ativar` | gestor |
| GET, POST | `/alunos` | gestor |
| GET, PUT | `/alunos/:id` | gestor (`DELETE` → 405) |
| PATCH | `/alunos/:id/ativo` | gestor |
| GET, POST | `/professores` | gestor |
| GET, PUT | `/professores/:id` | gestor (`DELETE` → 405) |
| PATCH | `/professores/:id/ativo` | gestor |
| GET, POST | `/disciplinas` | gestor |
| GET, PUT, DELETE | `/disciplinas/:id` | gestor |
| PATCH | `/disciplinas/:id/ativo` | gestor |
| GET, POST | `/turmas` | gestor |
| GET, PUT, DELETE | `/turmas/:id` | gestor |
| GET, POST | `/alocacoes` | gestor |
| GET, PUT, DELETE | `/alocacoes/:id` | gestor |
| GET, POST | `/matriculas` | gestor |
| POST | `/matriculas/:id/transferir` | gestor |
| PATCH | `/matriculas/:id/cancelar` | gestor |

---

### 6.1 Autenticação

#### `POST /auth/login` (público)

Corpo:

| Campo | Tipo | Regra |
|---|---|---|
| `email` | texto | obrigatório, não vazio |
| `senha` | texto | obrigatório, não vazio |

`200`:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": { "id": 1, "nome": "Administrador", "email": "gestor@skolla.com", "papel": "GESTOR" }
}
```

Erros: `400` (validação), `401` `Credenciais inválidas.` (e-mail inexistente, senha errada ou usuário inativo, sem distinguir qual), `429` (limite de tentativas).

#### `GET /auth/me`

`200`:
```json
{ "id": 1, "nome": "Administrador", "email": "gestor@skolla.com", "papel": "GESTOR", "ativo": true }
```

---

### 6.2 Dashboard

#### `GET /dashboard/gestor`

| Query | Descrição |
|---|---|
| `anoLetivoId` | opcional. Sem ele, usa o ano letivo **ativo**. |

Regras dos indicadores:
- `alunos`, `professores` e `totais.disciplinas` contam o cadastro inteiro (ativos e inativos).
- Os demais blocos usam o ano letivo escolhido.
- Matrículas contadas como "alunos" são só as `ATIVA`.
- **Professores inativos não contam** em `ocupacaoPorTurma`, em `alocadosNoAno` nem em `turmasSemProfessor`. As alocações deles continuam no banco.
- `alunosSemMatriculaAtiva` considera só alunos ativos e lista no máximo 20, ordenados por nome.

`200` com ano letivo:
```json
{
  "anoLetivo": { "id": 1, "ano": 2026, "ativo": true, "dataInicio": "2026-02-01T00:00:00.000Z", "dataFim": "2026-12-15T00:00:00.000Z" },
  "totais": { "alunos": 120, "professores": 15, "disciplinas": 10, "turmas": 6 },
  "alunos": { "total": 120, "ativos": 115, "inativos": 5, "matriculadosNoAno": 110 },
  "professores": { "total": 15, "ativos": 14, "inativos": 1, "alocadosNoAno": 12 },
  "matriculas": { "ATIVA": 110, "SUSPENSA": 3, "TRANSFERIDA": 4, "CANCELADA": 2, "CONCLUIDA": 0 },
  "ocupacaoPorTurma": [
    { "turmaId": 3, "nome": "6º A", "turno": "MANHA", "sala": "Sala 1", "alunosAtivos": 28, "professores": 4, "alocacoes": 6 }
  ],
  "pendencias": {
    "turmasSemProfessor": [ { "id": 5, "nome": "9º B" } ],
    "turmasSemAlunos": [ { "id": 6, "nome": "7º C" } ],
    "alunosSemMatriculaAtiva": { "total": 5, "itens": [ { "id": 40, "nome": "Ana Souza", "matricula": "2026-040" } ] }
  }
}
```

- `ocupacaoPorTurma[].professores` conta professores distintos; `alocacoes` conta pares professor × disciplina.
- O antigo campo `ocupacaoPorTurma[].professoresAtivos` **foi removido**, porque agora todos os contados são ativos.

`200` sem ano letivo ativo (e sem `anoLetivoId`):
```json
{
  "anoLetivo": null,
  "aviso": "Nenhum ano letivo ativo. Ative um ano letivo ou informe ?anoLetivoId=.",
  "totais": { "alunos": 120, "professores": 15, "disciplinas": 10, "turmas": 0 },
  "alunos": { "total": 120, "ativos": 115, "inativos": 5 },
  "professores": { "total": 15, "ativos": 14, "inativos": 1 }
}
```

Erros: `400` (`anoLetivoId` inválido), `404` `Ano letivo não encontrado.`.

---

### 6.3 Usuários (contas de acesso)

Objeto **Usuario**, que nunca inclui a senha:
```json
{ "id": 2, "nome": "Maria Lima", "email": "maria@escola.com", "papel": "PROFESSOR", "ativo": true, "createdAt": "...", "updatedAt": "..." }
```

#### `GET /usuarios`
Lista simples, ordenada por `id`.

#### `POST /usuarios` → `201`

| Campo | Tipo | Regra |
|---|---|---|
| `nome` | texto | obrigatório, até 120 |
| `email` | texto | obrigatório, e-mail válido, até 160, único |
| `senha` | texto | obrigatório, 8 a 72 caracteres |
| `papel` | enum `Papel` | obrigatório |

Erros: `400`, `409` (e-mail repetido, `campos: ["email"]`).

#### `PATCH /usuarios/:id/ativo` → `200` (Usuario)

Corpo: `{ "ativo": false }`.
- Desativar derruba o acesso **na hora**: tokens já emitidos passam a receber `401`.
- O gestor não pode desativar a própria conta → `400` `Você não pode desativar a própria conta.`.
- Erros: `400`, `404`.

---

### 6.4 Anos letivos

Objeto **AnoLetivo**:
```json
{ "id": 1, "ano": 2026, "dataInicio": "2026-02-01T00:00:00.000Z", "dataFim": "2026-12-15T00:00:00.000Z", "ativo": true, "createdAt": "...", "updatedAt": "..." }
```

#### `GET /anos-letivos`
Lista simples, do ano mais recente para o mais antigo. Cada item traz `_count: { turmas: N }`.

#### `GET /anos-letivos/:id`
O AnoLetivo com `turmas: [ ... ]`.

#### `POST /anos-letivos` → `201`

| Campo | Tipo | Regra |
|---|---|---|
| `ano` | inteiro | obrigatório, 2000 a 2100, único |
| `dataInicio` | data `AAAA-MM-DD` | obrigatório |
| `dataFim` | data `AAAA-MM-DD` | obrigatório, posterior a `dataInicio` |

O ano nasce **inativo** (`ativo: false`). Erros: `400`, `409` (`campos: ["ano"]`).

#### `PUT /anos-letivos/:id` → `200`
Mesmos campos, todos opcionais (ao menos um). O período continua validado contra as datas já gravadas.

#### `PATCH /anos-letivos/:id/ativar` → `200` (AnoLetivo)
Sem corpo. Ativa este ano e desativa todos os outros: **só um ano letivo fica ativo por vez**.

#### Ano letivo encerrado

O encerramento é **manual**: um ano letivo é considerado **encerrado** quando é **anterior ao ano letivo ativo**, ou seja, quando o gestor ativa um ano seguinte. Não existe campo `encerrado`, e o `dataFim` é **apenas informativo**: passar da data de término não encerra o ano sozinho.

Com isso, enquanto o gestor não ativar o próximo ano, o ano atual continua aceitando matrículas e reativações, mesmo depois do `dataFim` (por exemplo, para os acertos de fim de ano).

| Em relação ao ano ativo | Matricular (`POST /matriculas`) | Restaurar na reativação |
|---|---|---|
| o próprio ano ativo | permitido | permitido |
| ano futuro | permitido (rematrícula antecipada) | permitido |
| ano anterior (encerrado) | `409` | continua `SUSPENSA` |
| não há ano ativo | `409` | continua `SUSPENSA` |

#### `DELETE /anos-letivos/:id` → `204`
Erros `409`:
- `Não é possível excluir o ano letivo ativo. Ative outro ano antes.`
- `Não é possível excluir o ano letivo: ele possui turmas.`

---

### 6.5 Alunos

Objeto **Aluno**:
```json
{
  "id": 7, "nome": "João Pereira", "email": "joao@email.com", "matricula": "2026-007",
  "cpf": "52998224725", "dataNascimento": "2012-05-20T00:00:00.000Z",
  "nomeResponsavel": "Carla Pereira", "telefone": "46999990000",
  "ativo": true, "usuarioId": null, "createdAt": "...", "updatedAt": "..."
}
```

#### `GET /alunos` (paginado)

| Query | Descrição |
|---|---|
| `busca` | trecho do nome, sem acento (ver 2.5) |
| `ativo` | `true` / `false` |
| `turmaId` | só alunos com matrícula **ATIVA** nessa turma |
| `pagina`, `limite` | ver 2.4 |

#### `GET /alunos/:id` → Aluno

#### `POST /alunos` → `201`

| Campo | Tipo | Regra |
|---|---|---|
| `nome` | texto | obrigatório, até 120 |
| `email` | texto | obrigatório, e-mail válido, até 160, único |
| `matricula` | texto | obrigatório, até 30, único (número de matrícula escolar) |
| `cpf` | texto | obrigatório, válido (dígitos verificadores), único. Aceita com ou sem máscara e é guardado só com dígitos. |
| `dataNascimento` | data `AAAA-MM-DD` | obrigatório, não futura, a partir de 1900 |
| `nomeResponsavel` | texto | obrigatório, até 120 |
| `telefone` | texto | obrigatório, DDD + número (10 ou 11 dígitos; celular começa com 9). Aceita máscara e é guardado só com dígitos. |

Erros: `400`, `409` (`campos: ["cpf"]`, `["email"]` ou `["matricula"]`).

#### `PUT /alunos/:id` → `200`
Mesmos campos, todos opcionais (ao menos um).

#### `PATCH /alunos/:id/ativo` → `200`

Corpo: `{ "ativo": false }` ou `{ "ativo": true }`.

**Inativar** (`ativo: false`): as matrículas `ATIVA` do aluno passam a `SUSPENSA`.
```json
{ "id": 7, "nome": "João Pereira", "...": "...", "ativo": false, "matriculasSuspensas": 1 }
```

**Reativar** (`ativo: true`): cada matrícula `SUSPENSA` volta a `ATIVA`, da mais recente para a mais antiga, **somente se**:
1. o ano letivo da turma for o **ativo ou um ano futuro** (a mesma regra da criação de matrícula); **e**
2. o aluno não tiver outra matrícula `ATIVA` no mesmo ano letivo.

As que não puderem voltar continuam `SUSPENSA`, com o motivo:
```json
{
  "id": 7, "nome": "João Pereira", "...": "...", "ativo": true,
  "matriculasRestauradas": [10],
  "matriculasMantidasSuspensas": [
    { "matriculaId": 11, "turmaId": 3, "motivo": "O ano letivo da turma é anterior ao ano letivo ativo." }
  ]
}
```

| `motivo` possível | Quando |
|---|---|
| `O ano letivo da turma é anterior ao ano letivo ativo.` | a turma é de um ano já passado |
| `Nenhum ano letivo está ativo.` | não há ano ativo para comparar |
| `O aluno já possui matrícula ativa neste ano letivo.` | conflito com outra `ATIVA` do mesmo ano |

- Matrículas `CANCELADA` e `TRANSFERIDA` nunca são alteradas.
- Enviar `ativo: true` para um aluno já ativo tenta restaurar as suspensas de novo. Isso serve para depois de ativar o ano letivo.
- O antigo campo `matriculasCanceladas` **foi removido**.
- Erros: `400`, `404`.

#### `DELETE /alunos/:id` → `405`
```json
{ "error": "Alunos não podem ser excluídos. Para desativar, use PATCH /alunos/:id/ativo com { \"ativo\": false }." }
```
Cabeçalho `Allow: GET, POST, PUT, PATCH`.

---

### 6.6 Professores

Objeto **Professor** (sempre com `disciplinaPrincipal` incluída, ou `null`):
```json
{
  "id": 4, "nome": "Paulo Ramos", "email": "paulo@escola.com", "especialidade": "Matemática",
  "telefone": "4635550000", "titulacao": "MESTRADO", "ativo": true,
  "disciplinaPrincipalId": 2, "disciplinaPrincipal": { "id": 2, "nome": "Matemática", "cargaHoraria": 160, "...": "..." },
  "usuarioId": null, "createdAt": "...", "updatedAt": "..."
}
```

#### `GET /professores` (paginado)

| Query | Descrição |
|---|---|
| `busca` | trecho do nome, sem acento |
| `ativo` | `true` / `false` |
| `turmaId` | professores com alocação nessa turma |
| `disciplinaId` | professores com alocação nessa disciplina |
| `disciplinaPrincipalId` | professores com essa disciplina principal |
| `pagina`, `limite` | ver 2.4 |

`turmaId` e `disciplinaId` juntos valem para a **mesma** alocação. Este filtro não esconde professores inativos; para isso, combine com `ativo=true`.

#### `GET /professores/:id` → Professor

#### `POST /professores` → `201`

| Campo | Tipo | Regra |
|---|---|---|
| `nome` | texto | obrigatório, até 120 |
| `email` | texto | obrigatório, e-mail válido, até 160, único |
| `especialidade` | texto | obrigatório, até 80 |
| `telefone` | texto | obrigatório, mesma regra do aluno |
| `titulacao` | enum `Titulacao` | obrigatório |
| `disciplinaPrincipalId` | inteiro ou `null` | opcional. Precisa existir (`404 Disciplina não encontrada.`) e estar **ativa**. |

Erros: `400`, `404`, `409` (`campos: ["email"]`), `409` `Disciplina inativa não pode ser definida como disciplina principal.`.

#### `PUT /professores/:id` → `200`
Mesmos campos, todos opcionais (ao menos um). `disciplinaPrincipalId: null` remove a disciplina principal. Trocar para uma disciplina inativa → `409`. Reenviar a disciplina principal atual é aceito, mesmo que ela tenha sido inativada depois.

#### `PATCH /professores/:id/ativo` → `200` (Professor, sem `disciplinaPrincipal`)

Corpo: `{ "ativo": false }`.
- As alocações do professor **continuam no banco**, mas saem das consultas normais e do dashboard (ver 6.9).
- Professor inativo não pode receber nem editar alocações (`409`).

#### `DELETE /professores/:id` → `405` (mesmo formato do aluno)

---

### 6.7 Disciplinas

Objeto **Disciplina**:
```json
{ "id": 2, "nome": "Matemática", "cargaHoraria": 160, "ativo": true, "createdAt": "...", "updatedAt": "..." }
```

| Rota | Resposta |
|---|---|
| `GET /disciplinas` | lista simples, por `id`. Filtro opcional `?ativo=true\|false`. |
| `GET /disciplinas/:id` | Disciplina |
| `POST /disciplinas` | `201`. Nasce ativa. |
| `PUT /disciplinas/:id` | `200` |
| `PATCH /disciplinas/:id/ativo` | `200` (Disciplina). Corpo: `{ "ativo": false }`. |
| `DELETE /disciplinas/:id` | `204` |

| Campo | Tipo | Regra |
|---|---|---|
| `nome` | texto | obrigatório, até 80 |
| `cargaHoraria` | inteiro | obrigatório, 1 a 2000 |

Disciplina inativa:
- **não** recebe novas alocações nem pode ter alocações editadas (`409`, ver 6.9);
- **não** pode virar disciplina principal de professor (`409`, ver 6.6);
- as alocações que já existiam **continuam** visíveis nas consultas (histórico).

O campo `ativo` só muda pelo `PATCH`. Se vier no `POST` ou no `PUT`, é ignorado.

`DELETE` → `409` quando houver vínculos:
- `Não é possível excluir a disciplina: ela está alocada em turmas.`
- `Não é possível excluir a disciplina: ela é a disciplina principal de professores.`

---

### 6.8 Turmas

Objeto **Turma** (listagem, criação e atualização incluem `anoLetivo`):
```json
{
  "id": 3, "nome": "6º A", "turno": "MANHA", "sala": "Sala 1", "anoLetivoId": 1,
  "anoLetivo": { "id": 1, "ano": 2026, "...": "..." },
  "createdAt": "...", "updatedAt": "..."
}
```

#### `GET /turmas`
Lista simples, por `id`. Filtro opcional: `?anoLetivoId=`.

#### `GET /turmas/:id` (detalhe)

| Query | Descrição |
|---|---|
| `incluirInativos` | `true` inclui professores inativos (consulta histórica). Padrão: só ativos. |

`200`:
```json
{
  "id": 3, "nome": "6º A", "turno": "MANHA", "sala": "Sala 1", "anoLetivoId": 1,
  "anoLetivo": { "id": 1, "ano": 2026, "...": "..." },
  "createdAt": "...", "updatedAt": "...",
  "alunos": [
    { "matriculaId": 10, "id": 7, "nome": "João Pereira", "email": "joao@email.com", "matricula": "2026-007" }
  ],
  "professores": [
    {
      "alocacaoId": 5,
      "professor": { "id": 4, "nome": "Paulo Ramos", "email": "paulo@escola.com", "especialidade": "Matemática", "ativo": true },
      "disciplina": { "id": 2, "nome": "Matemática", "cargaHoraria": 160, "...": "..." }
    }
  ],
  "totais": { "alunosAtivos": 1, "alocacoes": 1 }
}
```
- `alunos` traz só as matrículas `ATIVA`, ordenadas por nome do aluno.
- `totais.alocacoes` segue o mesmo filtro de `professores`.

#### `POST /turmas` → `201`

| Campo | Tipo | Regra |
|---|---|---|
| `nome` | texto | obrigatório, até 40. Único **dentro do ano letivo**. |
| `anoLetivoId` | inteiro | obrigatório. Precisa existir (`404 Ano letivo não encontrado.`). |
| `turno` | enum `Turno` | obrigatório |
| `sala` | texto | obrigatório, até 30 |

Erros: `400`, `404`, `409` (`campos: ["nome","anoLetivoId"]`).

#### `PUT /turmas/:id` → `200`
Mesmos campos, todos opcionais (ao menos um).
- **Trocar o `anoLetivoId` de uma turma que já tem matrículas** (de qualquer status) → `409`: `Não é possível trocar o ano letivo de uma turma que já possui matrículas. Crie uma nova turma no outro ano.`.
- Reenviar o mesmo `anoLetivoId` é aceito.

#### `DELETE /turmas/:id` → `204`
Erros `409`:
- `Não é possível excluir a turma: ela possui matrículas (o histórico é preservado).`
- `Não é possível excluir a turma: ela possui professores alocados. Remova as alocações antes.`

---

### 6.9 Alocações (professor × turma × disciplina)

Objeto **Alocacao**, com `professor`, `turma` e `disciplina` completos:
```json
{
  "id": 5, "professorId": 4, "turmaId": 3, "disciplinaId": 2,
  "professor": { "...": "Professor" }, "turma": { "...": "Turma" }, "disciplina": { "...": "Disciplina" }
}
```

#### `GET /alocacoes`
Lista simples, por `id`.

| Query | Descrição |
|---|---|
| `turmaId`, `professorId`, `disciplinaId` | filtros opcionais, combináveis |
| `incluirInativos` | `true` inclui alocações de professores inativos. Padrão: só de professores ativos. |

#### `GET /alocacoes/:id` → Alocacao
Responde mesmo que o professor esteja inativo (consulta explícita do histórico).

#### `POST /alocacoes` → `201`

| Campo | Tipo | Regra |
|---|---|---|
| `professorId` | inteiro | obrigatório. Precisa existir e estar **ativo**. |
| `turmaId` | inteiro | obrigatório. Precisa existir. |
| `disciplinaId` | inteiro | obrigatório. Precisa existir e estar **ativa**. |

Erros:
- `404`: `Professor não encontrado.`, `Turma não encontrada.`, `Disciplina não encontrada.`
- `409`: `Professor inativo não pode receber novas alocações.`
- `409`: `Disciplina inativa não pode receber novas alocações.`
- `409`: combinação repetida (`campos: ["professorId","turmaId","disciplinaId"]`).

#### `PUT /alocacoes/:id` → `200`
Mesmos campos, todos opcionais (ao menos um). O professor e a disciplina (os novos ou os atuais) precisam estar ativos.

#### `DELETE /alocacoes/:id` → `204`
Permitido, para desfazer um engano.

---

### 6.10 Matrículas

Objeto **Matricula**, com `aluno` e `turma` completos:
```json
{
  "id": 10, "alunoId": 7, "turmaId": 3, "status": "ATIVA", "createdAt": "...", "updatedAt": "...",
  "aluno": { "...": "Aluno" }, "turma": { "...": "Turma" }
}
```

Regras principais:
- **um aluno só pode ter uma matrícula `ATIVA` por ano letivo**;
- **só se matricula em turma do ano letivo ativo ou de um ano futuro** (rematrícula antecipada). Turmas de anos **anteriores** ao ativo são recusadas, e sem nenhum ano ativo nenhuma matrícula é aceita.

#### `GET /matriculas` (paginado, por `id`)

| Query | Descrição |
|---|---|
| `alunoId` | matrículas do aluno (histórico completo) |
| `turmaId` | matrículas da turma |
| `status` | um dos valores de `StatusMatricula`. Outro valor → `400 Status inválido. Use: ...`. |
| `anoLetivoId` | matrículas em turmas desse ano |
| `pagina`, `limite` | ver 2.4 |

#### `POST /matriculas` → `201`

| Campo | Tipo | Regra |
|---|---|---|
| `alunoId` | inteiro | obrigatório |
| `turmaId` | inteiro | obrigatório |

A matrícula nasce `ATIVA`. Erros:
- `404`: `Aluno não encontrado.`, `Turma não encontrada.`
- `409`: `Aluno inativo não pode ser matriculado.`
- `409`: `Não é possível matricular em turma de ano letivo anterior ao ano ativo (2025 é anterior a 2026).`
- `409`: `Nenhum ano letivo está ativo. Ative um ano letivo antes de matricular.`
- `409`: `O aluno já possui matrícula ativa neste ano letivo.`

Matricular num ano futuro é permitido. O aluno pode ter, ao mesmo tempo, uma `ATIVA` no ano atual e outra no ano seguinte.

Pedidos simultâneos para o mesmo aluno e ano: só um é aceito, e os demais recebem `409` (testado com 10 pedidos em paralelo no SQLite).

#### `POST /matriculas/:id/transferir` → `201`

Corpo: `{ "turmaDestinoId": 4 }`.

A matrícula atual passa a `TRANSFERIDA`, e uma nova `ATIVA` é criada na turma destino, numa única operação. A resposta é a **nova** matrícula. Erros:
- `404`: `Matrícula não encontrada.`, `Turma de destino não encontrada.`
- `400`: `A turma de destino é a mesma da matrícula atual.`
- `409`: `Só é possível transferir matrículas ativas.`
- `409`: `A turma de destino pertence a outro ano letivo. A transferência só é permitida dentro do mesmo ano letivo.`
- `409`: as mesmas mensagens de ano letivo do `POST /matriculas` (destino em ano anterior ao ativo, ou nenhum ano ativo).
- `409`: `A matrícula não está mais ativa.` (duas transferências simultâneas)

#### `PATCH /matriculas/:id/cancelar` → `200` (Matricula)

Sem corpo. Aceita matrículas `ATIVA` ou `SUSPENSA`, que passam a `CANCELADA`. Erros:
- `404`: `Matrícula não encontrada.`
- `409`: `Só é possível cancelar matrículas ativas ou suspensas (status atual: CANCELADA).`

Não existe `DELETE /matriculas/:id`: a resposta é `404` de rota inexistente.

---

## 7. Fluxo típico do front-end

1. `POST /auth/login`, guardar o `token` e mandá-lo em todas as requisições.
2. `GET /auth/me` ao abrir a aplicação, para validar a sessão. Se vier `401`, voltar para o login.
3. `GET /dashboard/gestor` na tela inicial.
4. Cadastros:
   - `POST /anos-letivos` e `PATCH /anos-letivos/:id/ativar`;
   - depois `POST /turmas`, `POST /disciplinas` e `POST /professores`;
   - depois `POST /alocacoes`, `POST /alunos` e `POST /matriculas`.
5. Formulários: exibir `detalhes[].mensagem` ao lado de cada `detalhes[].campo` (erros `400`) e destacar `campos` (erros `409` de duplicidade).

---

## 8. Limitações conhecidas e pendências

- **Deploy atrás de proxy** (Render, Vercel): falta `app.set('trust proxy', 1)`. Sem isso, o limite de login enxerga o IP do proxy e não o do usuário.
- **Contador do limite de login em memória**: zera ao reiniciar e não é compartilhado entre várias instâncias do servidor.
- **Vínculo usuário ↔ aluno/professor**: os campos `usuarioId` existem no banco, mas nenhuma rota os define ainda. Hoje as contas de acesso são independentes dos cadastros.
- **`CONCLUIDA`**: o status existe, mas nenhuma rota encerra matrículas como concluídas (por exemplo, no fim do ano letivo).
- **Regra "uma matrícula `ATIVA` por ano" protegida só pela aplicação**: no SQLite, a transação atual garante a regra mesmo com pedidos simultâneos. Na migração para o **PostgreSQL**, é obrigatório reforçá-la no banco: um índice único parcial (aluno + ano letivo onde `status = 'ATIVA'`), o que exige guardar o `anoLetivoId` também na matrícula.
- **Migrations antigas em banco preenchido**: as migrations de 30/10 e 04/11 adicionam colunas obrigatórias sem valor padrão e falham num banco que já tenha turmas, alunos ou professores criados antes delas. Nenhum banco nesse estado está em uso (o `dev.db` foi recriado com todas as migrations). As migrations já aplicadas **não devem ser editadas**, porque o Prisma detecta a alteração e pede reset. Antes do primeiro deploy, sem dados de produção, avaliar consolidar todas numa única migration inicial.
- **Busca e ordenação em memória**: `GET /alunos` e `GET /professores` carregam `id` e `nome` de todos os registros que passam nos filtros, filtram a busca e ordenam em JavaScript, e só então buscam a página. Isso é suficiente para o porte de uma escola. Melhoria futura: levar a busca e a ordenação para o banco.
- **Listagens sem paginação**: `/usuarios`, `/anos-letivos`, `/disciplinas`, `/turmas` e `/alocacoes` devolvem tudo de uma vez.
- **Módulos Professor, Aluno e Responsável**: fora do escopo deste MVP. Esses papéis só conseguem usar `/auth/login` e `/auth/me`.