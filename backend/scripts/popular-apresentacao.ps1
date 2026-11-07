<#
  SKOLLA - dados de apresentação
  Cria, pela API, uma base pequena e realista para demonstrar o módulo Gestor.

  Pré-requisitos:
    - banco recém-resetado (npx prisma migrate reset --force + npm run seed)
    - backend rodando (npm run dev)
  Uso (na pasta backend):
    .\scripts\popular-apresentacao.ps1

  O login usa SEED_GESTOR_EMAIL e SEED_GESTOR_SENHA do backend\.env.
  As contas extras criadas aqui usam a senha de demonstração abaixo.
#>
param(
  [string]$Api = "http://localhost:3000/api",
  [string]$SenhaDemo = "Skolla@2026"
)
$ErrorActionPreference = "Stop"

# ---------- Leitura do .env ----------
$arquivoEnv = Join-Path $PSScriptRoot "..\.env"
if (-not (Test-Path $arquivoEnv)) { throw "Arquivo .env não encontrado em $arquivoEnv" }
$envVars = @{}
foreach ($linha in Get-Content $arquivoEnv -Encoding UTF8) {
  if ($linha -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
    $envVars[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}
$emailGestor = $envVars["SEED_GESTOR_EMAIL"]
$senhaGestor = $envVars["SEED_GESTOR_SENHA"]
if (-not $emailGestor -or -not $senhaGestor) { throw "Defina SEED_GESTOR_EMAIL e SEED_GESTOR_SENHA no .env." }

# ---------- Chamada à API ----------
$script:token = $null
$script:criouAlgo = $false   # depois da primeira criação, uma falha exige reset
function Api([string]$Metodo, [string]$Caminho, $Corpo = $null) {
  $params = @{ Method = $Metodo; Uri = "$Api$Caminho"; Headers = @{} }
  if ($script:token) { $params.Headers.Authorization = "Bearer $script:token" }
  if ($null -ne $Corpo) {
    # Envia em UTF-8 (no PowerShell 5.1 o padrão estragaria os acentos)
    $json = $Corpo | ConvertTo-Json -Depth 5 -Compress
    $params.Body = [Text.Encoding]::UTF8.GetBytes($json)
    $params.ContentType = "application/json; charset=utf-8"
  }
  try {
    $resposta = Invoke-RestMethod @params
    if ($Metodo -ne "GET" -and $Caminho -ne "/auth/login") { $script:criouAlgo = $true }
    return $resposta
  } catch {
    $detalhe = $_.ErrorDetails.Message
    Write-Host "`nFALHOU: $Metodo $Caminho" -ForegroundColor Red
    if ($detalhe) {
      Write-Host $detalhe -ForegroundColor Red
    } elseif (-not $_.Exception.Response) {
      Write-Host "Sem resposta da API em $Api. O backend está rodando (npm run dev)?" -ForegroundColor Red
    } else {
      Write-Host $_.Exception.Message -ForegroundColor Red
    }
    if ($script:criouAlgo) { throw "Interrompido no meio: faça o reset do banco e rode o script de novo." }
    throw "Interrompido antes de criar qualquer dado: corrija o problema e rode o script de novo."
  }
}

# Quantidade de itens de uma resposta em lista. No PowerShell 5.1 o Invoke-RestMethod
# entrega a lista JSON como um único objeto (e "[]" vira uma lista vazia ou $null).
function Contar($lista) { return @($lista | Where-Object { $null -ne $_ }).Count }
function Etapa([string]$texto) { Write-Host "`n== $texto ==" -ForegroundColor Cyan }

# ---------- Login e verificação do banco ----------
Etapa "Login"
$login = Api POST "/auth/login" @{ email = $emailGestor; senha = $senhaGestor }
$script:token = $login.token
Write-Host "Logado como $($login.usuario.nome)"

$qtdAnos = Contar (Api GET "/anos-letivos")
$qtdAlunos = (Api GET "/alunos?limite=1").paginacao.total
if ($qtdAnos -gt 0 -or $qtdAlunos -gt 0) {
  throw "O banco já tem dados ($qtdAnos ano(s) letivo(s), $qtdAlunos aluno(s)). Rode o reset antes (npx prisma migrate reset --force e npm run seed)."
}

# ---------- Disciplinas ----------
Etapa "Disciplinas"
$disc = @{}
foreach ($d in @(
  @("port", "Língua Portuguesa", 160), @("mat", "Matemática", 160), @("cien", "Ciências", 120),
  @("hist", "História", 80), @("geo", "Geografia", 80), @("ing", "Inglês", 80),
  @("edf", "Educação Física", 80), @("arte", "Arte", 40), @("rel", "Ensino Religioso", 40)
)) {
  $disc[$d[0]] = Api POST "/disciplinas" @{ nome = $d[1]; cargaHoraria = $d[2] }
  Write-Host "  $($d[1])"
}
Api PATCH "/disciplinas/$($disc.rel.id)/ativo" @{ ativo = $false } | Out-Null
Write-Host "  Ensino Religioso -> inativa"

# ---------- Professores ----------
Etapa "Professores"
$prof = @{}
foreach ($p in @(
  @("ana",      "Ana Paula Ferreira",       "ana.ferreira@skolla.edu.br",   "Letras - Português",   "MESTRADO",       "port", "46903703826"),
  @("carlos",   "Carlos Eduardo Lima",      "carlos.lima@skolla.edu.br",    "Matemática",           "DOUTORADO",      "mat",  "46953845355"),
  @("fernanda", "Fernanda Souza Rocha",     "fernanda.rocha@skolla.edu.br", "Ciências Biológicas",  "ESPECIALIZACAO", "cien", "46977879432"),
  @("ricardo",  "Ricardo Alves Martins",    "ricardo.martins@skolla.edu.br","História",             "GRADUACAO",      "hist", "46962705860"),
  @("juliana",  "Juliana Costa Pereira",    "juliana.pereira@skolla.edu.br","Geografia",            "ESPECIALIZACAO", "geo",  "46921458421"),
  @("marcos",   "Marcos Vinícius Teixeira", "marcos.teixeira@skolla.edu.br","Letras - Inglês",      "MESTRADO",       "ing",  "46908394906"),
  @("bia",      "Beatriz Nunes Carvalho",   "beatriz.carvalho@skolla.edu.br","Educação Física",     "GRADUACAO",      "edf",  "46968828112"),
  @("roberto",  "Roberto Silva Mendes",     "roberto.mendes@skolla.edu.br", "Artes Visuais",        "ESPECIALIZACAO", "arte", "46965844093")
)) {
  $prof[$p[0]] = Api POST "/professores" @{
    nome = $p[1]; email = $p[2]; especialidade = $p[3]; telefone = $p[6]; titulacao = $p[4]
    disciplinaPrincipalId = $disc[$p[5]].id
  }
  Write-Host "  $($p[1])"
}

# ---------- Anos letivos e turmas ----------
Etapa "Anos letivos"
$ano = @{}
$ano[2025] = Api POST "/anos-letivos" @{ ano = 2025; dataInicio = "2025-02-03"; dataFim = "2025-12-12" }
$ano[2026] = Api POST "/anos-letivos" @{ ano = 2026; dataInicio = "2026-02-02"; dataFim = "2026-12-11" }
$ano[2027] = Api POST "/anos-letivos" @{ ano = 2027; dataInicio = "2027-02-01"; dataFim = "2027-12-10" }
Api PATCH "/anos-letivos/$($ano[2025].id)/ativar" | Out-Null
Write-Host "  2025, 2026 e 2027 criados; 2025 ativo por enquanto (para gerar histórico)"

Etapa "Turmas"
$turma = @{}
$turma["2025-7A"] = Api POST "/turmas" @{ nome = "7º A"; anoLetivoId = $ano[2025].id; turno = "MANHA"; sala = "Sala 3" }
$turma["6A"] = Api POST "/turmas" @{ nome = "6º A"; anoLetivoId = $ano[2026].id; turno = "MANHA"; sala = "Sala 1" }
$turma["6B"] = Api POST "/turmas" @{ nome = "6º B"; anoLetivoId = $ano[2026].id; turno = "TARDE"; sala = "Sala 1" }
$turma["7A"] = Api POST "/turmas" @{ nome = "7º A"; anoLetivoId = $ano[2026].id; turno = "MANHA"; sala = "Sala 3" }
$turma["8A"] = Api POST "/turmas" @{ nome = "8º A"; anoLetivoId = $ano[2026].id; turno = "TARDE"; sala = "Sala 4" }
$turma["2027-7A"] = Api POST "/turmas" @{ nome = "7º A"; anoLetivoId = $ano[2027].id; turno = "MANHA"; sala = "Sala 3" }
Write-Host "  2025: 7º A | 2026: 6º A, 6º B, 7º A, 8º A | 2027: 7º A"

# ---------- Alocações (6º B fica sem professor: pendência no dashboard) ----------
Etapa "Alocações"
foreach ($a in @(
  @("2025-7A", "ana", "port"),
  @("6A", "ana", "port"), @("6A", "carlos", "mat"), @("6A", "fernanda", "cien"), @("6A", "bia", "edf"),
  @("7A", "ana", "port"), @("7A", "carlos", "mat"), @("7A", "ricardo", "hist"), @("7A", "roberto", "arte"),
  @("8A", "carlos", "mat"), @("8A", "juliana", "geo"), @("8A", "marcos", "ing"), @("8A", "fernanda", "cien")
)) {
  Api POST "/alocacoes" @{ turmaId = $turma[$a[0]].id; professorId = $prof[$a[1]].id; disciplinaId = $disc[$a[2]].id } | Out-Null
}
Write-Host "  13 alocações (6º B sem professor)"

# ---------- Alunos ----------
Etapa "Alunos"
$alunos = @(
  @{ chave = "a1"; turma = "6A"; dados = @{ nome = "Lucas Oliveira Santos"; email = "lucas.santos@email.com"; matricula = "2026-001"; cpf = "15881399803"; dataNascimento = "2014-03-12"; nomeResponsavel = "Patrícia Oliveira Santos"; telefone = "46969879730" } },
  @{ chave = "a2"; turma = "6A"; dados = @{ nome = "Maria Eduarda Costa"; email = "maria.costa@email.com"; matricula = "2026-002"; cpf = "91141707527"; dataNascimento = "2014-07-25"; nomeResponsavel = "Renata Costa"; telefone = "46936455681" } },
  @{ chave = "a3"; turma = "6A"; dados = @{ nome = "Gabriel Henrique Souza"; email = "gabriel.souza@email.com"; matricula = "2026-003"; cpf = "51884472907"; dataNascimento = "2014-01-30"; nomeResponsavel = "Marcelo Souza"; telefone = "46940557616" } },
  @{ chave = "a4"; turma = "6A"; dados = @{ nome = "Isabela Ferreira Lima"; email = "isabela.lima@email.com"; matricula = "2026-004"; cpf = "98716897641"; dataNascimento = "2014-09-08"; nomeResponsavel = "Cláudia Ferreira"; telefone = "46984697880" } },
  @{ chave = "a5"; turma = "6A"; dados = @{ nome = "João Pedro Almeida"; email = "joao.almeida@email.com"; matricula = "2026-005"; cpf = "93208196709"; dataNascimento = "2014-05-17"; nomeResponsavel = "Sandra Almeida"; telefone = "46927317784" } },
  @{ chave = "a6"; turma = "6A"; dados = @{ nome = "Laura Beatriz Martins"; email = "laura.martins@email.com"; matricula = "2026-006"; cpf = "86488766309"; dataNascimento = "2014-11-02"; nomeResponsavel = "Fernando Martins"; telefone = "46944002978" } },
  @{ chave = "a7"; turma = "6B"; dados = @{ nome = "Enzo Gabriel Ribeiro"; email = "enzo.ribeiro@email.com"; matricula = "2026-007"; cpf = "75347787600"; dataNascimento = "2014-02-14"; nomeResponsavel = "Aline Ribeiro"; telefone = "46980457178" } },
  @{ chave = "a8"; turma = "6B"; dados = @{ nome = "Sofia Carvalho Gomes"; email = "sofia.gomes@email.com"; matricula = "2026-008"; cpf = "47267147593"; dataNascimento = "2014-06-21"; nomeResponsavel = "Paulo Gomes"; telefone = "46913627010" } },
  @{ chave = "a9"; turma = "6B"; dados = @{ nome = "Miguel Araújo Pinto"; email = "miguel.pinto@email.com"; matricula = "2026-009"; cpf = "79819331960"; dataNascimento = "2014-08-03"; nomeResponsavel = "Luciana Araújo"; telefone = "46908452059" } },
  @{ chave = "a10"; turma = "6B"; dados = @{ nome = "Valentina Rocha Dias"; email = "valentina.dias@email.com"; matricula = "2026-010"; cpf = "97283792937"; dataNascimento = "2014-04-27"; nomeResponsavel = "Rogério Dias"; telefone = "46984162294" } },
  @{ chave = "a11"; turma = "6B"; dados = @{ nome = "Arthur Mendes Barbosa"; email = "arthur.barbosa@email.com"; matricula = "2026-011"; cpf = "86628360113"; dataNascimento = "2014-10-19"; nomeResponsavel = "Simone Mendes"; telefone = "46961055008" } },
  @{ chave = "a12"; turma = "7A"; dados = @{ nome = "Helena Cardoso Nunes"; email = "helena.nunes@email.com"; matricula = "2026-012"; cpf = "75475177902"; dataNascimento = "2013-03-05"; nomeResponsavel = "Adriana Cardoso"; telefone = "46992298369" } },
  @{ chave = "a13"; turma = "7A"; dados = @{ nome = "Davi Lucca Moreira"; email = "davi.moreira@email.com"; matricula = "2026-013"; cpf = "57931860349"; dataNascimento = "2013-07-11"; nomeResponsavel = "Eduardo Moreira"; telefone = "46920807370" } },
  @{ chave = "a14"; turma = "7A"; dados = @{ nome = "Alice Teixeira Freitas"; email = "alice.freitas@email.com"; matricula = "2026-014"; cpf = "28382226434"; dataNascimento = "2013-12-22"; nomeResponsavel = "Mônica Teixeira"; telefone = "46968616425" } },
  @{ chave = "a15"; turma = "7A"; dados = @{ nome = "Bernardo Castro Vieira"; email = "bernardo.vieira@email.com"; matricula = "2026-015"; cpf = "24776472538"; dataNascimento = "2013-05-09"; nomeResponsavel = "Ricardo Vieira"; telefone = "46987718841" } },
  @{ chave = "a16"; turma = "7A"; dados = @{ nome = "Manuela Duarte Lopes"; email = "manuela.lopes@email.com"; matricula = "2026-016"; cpf = "33017568245"; dataNascimento = "2013-09-15"; nomeResponsavel = "Juliana Duarte"; telefone = "46905258983" } },
  @{ chave = "a17"; turma = "8A"; dados = @{ nome = "Heitor Batista Correia"; email = "heitor.correia@email.com"; matricula = "2026-017"; cpf = "19489394955"; dataNascimento = "2012-02-28"; nomeResponsavel = "Vanessa Batista"; telefone = "46948214162" } },
  @{ chave = "a18"; turma = "8A"; dados = @{ nome = "Lívia Monteiro Ramos"; email = "livia.ramos@email.com"; matricula = "2026-018"; cpf = "10521854954"; dataNascimento = "2012-06-06"; nomeResponsavel = "Sérgio Ramos"; telefone = "46914524410" } },
  @{ chave = "a19"; turma = "8A"; dados = @{ nome = "Rafael Antunes Cunha"; email = "rafael.cunha@email.com"; matricula = "2026-019"; cpf = "64600130472"; dataNascimento = "2012-10-13"; nomeResponsavel = "Daniela Antunes"; telefone = "46911895579" } },
  @{ chave = "a20"; turma = "8A"; dados = @{ nome = "Giovanna Pires Machado"; email = "giovanna.machado@email.com"; matricula = "2026-020"; cpf = "90659397684"; dataNascimento = "2012-01-24"; nomeResponsavel = "André Machado"; telefone = "46915846450" } },
  @{ chave = "a21"; turma = "8A"; dados = @{ nome = "Matheus Campos Farias"; email = "matheus.farias@email.com"; matricula = "2026-021"; cpf = "60454146590"; dataNascimento = "2012-08-30"; nomeResponsavel = "Elaine Campos"; telefone = "46990853801" } },
  @{ chave = "a22"; turma = "-"; dados = @{ nome = "Beatriz Siqueira Prado"; email = "beatriz.prado@email.com"; matricula = "2026-022"; cpf = "29110285970"; dataNascimento = "2014-12-01"; nomeResponsavel = "Márcia Siqueira"; telefone = "46940692566" } },
  @{ chave = "a23"; turma = "-"; dados = @{ nome = "Nicolas Fonseca Leal"; email = "nicolas.leal@email.com"; matricula = "2026-023"; cpf = "63632280851"; dataNascimento = "2013-04-18"; nomeResponsavel = "Rodrigo Leal"; telefone = "46986423004" } },
  @{ chave = "a24"; turma = "2025"; dados = @{ nome = "Pedro Henrique Azevedo"; email = "pedro.azevedo@email.com"; matricula = "2025-024"; cpf = "87645291265"; dataNascimento = "2012-03-23"; nomeResponsavel = "Carla Azevedo"; telefone = "46980845850" } }
)
$aluno = @{}
foreach ($x in $alunos) {
  $aluno[$x.chave] = Api POST "/alunos" $x.dados
}
Write-Host "  $($alunos.Count) alunos"

# ---------- Histórico de 2025 ----------
Etapa "Histórico de 2025"
$pedro = $aluno["a24"]
Api POST "/matriculas" @{ alunoId = $pedro.id; turmaId = $turma["2025-7A"].id } | Out-Null
Api PATCH "/alunos/$($pedro.id)/ativo" @{ ativo = $false } | Out-Null
Write-Host "  $($pedro.nome): matriculado no 7º A de 2025 e inativado (matrícula SUSPENSA)"

Api PATCH "/anos-letivos/$($ano[2026].id)/ativar" | Out-Null
Write-Host "  2026 ativado: 2025 passa a ser encerrado"

# ---------- Matrículas de 2026 ----------
Etapa "Matrículas de 2026"
$mat = @{}
foreach ($x in $alunos) {
  if ($turma.ContainsKey($x.turma)) {
    $mat[$x.chave] = Api POST "/matriculas" @{ alunoId = $aluno[$x.chave].id; turmaId = $turma[$x.turma].id }
  }
}
Write-Host "  $($mat.Count) matrículas ativas"

# Transferência: um aluno do 6º A vai para o 6º B
$nova = Api POST "/matriculas/$($mat["a6"].id)/transferir" @{ turmaDestinoId = $turma["6B"].id }
Write-Host "  $($aluno["a6"].nome): transferido do 6º A para o 6º B"

# Cancelamento
Api PATCH "/matriculas/$($mat["a11"].id)/cancelar" | Out-Null
Write-Host "  $($aluno["a11"].nome): matrícula cancelada"

# Inativação durante o ano (matrícula vira SUSPENSA)
Api PATCH "/alunos/$($aluno["a21"].id)/ativo" @{ ativo = $false } | Out-Null
Write-Host "  $($aluno["a21"].nome): inativado (matrícula SUSPENSA)"

# Rematrícula antecipada em 2027
Api POST "/matriculas" @{ alunoId = $aluno["a1"].id; turmaId = $turma["2027-7A"].id } | Out-Null
Write-Host "  $($aluno["a1"].nome): rematrícula antecipada no 7º A de 2027"

# ---------- Professor inativo ----------
Etapa "Professor inativo"
Api PATCH "/professores/$($prof.roberto.id)/ativo" @{ ativo = $false } | Out-Null
Write-Host "  Roberto Silva Mendes inativado (a alocação de Arte no 7º A fica no histórico)"

# ---------- Contas de acesso ----------
Etapa "Contas de acesso"
Api POST "/usuarios" @{ nome = "Coordenação Pedagógica"; email = "coordenacao@skolla.edu.br"; senha = $SenhaDemo; papel = "GESTOR" } | Out-Null
Api POST "/usuarios" @{ nome = "Ana Paula Ferreira"; email = "ana.ferreira@skolla.edu.br"; senha = $SenhaDemo; papel = "PROFESSOR" } | Out-Null
Write-Host "  coordenacao@skolla.edu.br (Gestor) e ana.ferreira@skolla.edu.br (Professor), senha: $SenhaDemo"

# ---------- Resumo ----------
Etapa "Pronto"
Write-Host @"
Base de apresentação criada.

Casos prontos para demonstrar:
  - Dashboard 2026: gráfico por turma; pendências (6º B sem professor, alunos sem matrícula)
  - Paginação: 24 alunos (22 ativos)
  - Transferência no histórico: $($aluno["a6"].nome) (6º A -> 6º B)
  - Matrícula cancelada: $($aluno["a11"].nome)
  - Aluno inativo com matrícula suspensa: $($aluno["a21"].nome)
  - Reativação que mantém suspensa (ano encerrado): $($pedro.nome)
  - Rematrícula antecipada em 2027: $($aluno["a1"].nome)
  - Professor inativo: Roberto Silva Mendes | Disciplina inativa: Ensino Religioso
  - Login de professor recusado: ana.ferreira@skolla.edu.br / $SenhaDemo
  - Para matricular ao vivo: Beatriz Siqueira Prado ou Nicolas Fonseca Leal
"@
