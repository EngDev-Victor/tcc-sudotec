param([string]$Api = "http://localhost:3000/api")

$senha = Read-Host "Senha do Gestor"
$sfx = Get-Date -Format "HHmmss"
$script:passou = 0
$script:falhou = 0

# Envia a requisição em UTF-8 e devolve Status + Dados (sem lançar exceção em 4xx)
function Req {
  param($Metodo, $Caminho, $Corpo = $null, $Token = $null)
  $p = @{ Method = $Metodo; Uri = "$Api$Caminho"; UseBasicParsing = $true }
  if ($Token) { $p.Headers = @{ Authorization = "Bearer $Token" } }
  if ($null -ne $Corpo) {
    $p.Body = [Text.Encoding]::UTF8.GetBytes(($Corpo | ConvertTo-Json -Depth 5))
    $p.ContentType = "application/json; charset=utf-8"
  }
  try {
    $r = Invoke-WebRequest @p
    $dados = $null
    if ($r.Content) { $dados = $r.Content | ConvertFrom-Json }
    return [pscustomobject]@{ Status = [int]$r.StatusCode; Dados = $dados }
  } catch {
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    return [pscustomobject]@{ Status = $status; Dados = $null }
  }
}

function Verificar {
  param($Nome, [bool]$Condicao)
  if ($Condicao) {
    $script:passou++
    Write-Host "[PASSOU] $Nome" -ForegroundColor Green
  } else {
    $script:falhou++
    Write-Host "[FALHOU] $Nome" -ForegroundColor Red
  }
}

function EstaEm($lista, $id) {
  return (@($lista | Where-Object { $_.id -eq $id })).Count -gt 0
}

function Painel { return (Req GET "/dashboard/gestor" $null $tk).Dados }

# ---------- A. Autenticação ----------
Write-Host "`n== Autenticação ==" -ForegroundColor Cyan
$login = Req POST "/auth/login" @{ email = "gestor@skolla.com"; senha = $senha }
Verificar "login do gestor -> 200" ($login.Status -eq 200 -and [bool]$login.Dados.token)
if ($login.Status -ne 200) { Write-Host "Sem login, abortando." -ForegroundColor Yellow; return }
$tk = $login.Dados.token

Verificar "sem token -> 401" ((Req GET "/turmas").Status -eq 401)
Verificar "senha errada -> 401" ((Req POST "/auth/login" @{ email = "gestor@skolla.com"; senha = "errada-123" }).Status -eq 401)
Verificar "/auth/me com token -> 200" ((Req GET "/auth/me" $null $tk).Status -eq 200)

# ---------- B. Dashboard: estrutura ----------
Write-Host "`n== Dashboard ==" -ForegroundColor Cyan
$p0 = Painel
Verificar "dashboard responde" ($null -ne $p0)

if (-not $p0.anoLetivo) {
  Write-Host "Nenhum ano letivo ativo. Ative um (PATCH /anos-letivos/:id/ativar) e rode de novo." -ForegroundColor Yellow
} else {
  $anoId = $p0.anoLetivo.id
  $base = $p0.matriculas
  $semMatBase = $p0.pendencias.alunosSemMatriculaAtiva.total
  Verificar "turmas do dashboard batem com ocupacaoPorTurma" ($p0.totais.turmas -eq @($p0.ocupacaoPorTurma).Count)

  # ---------- C. Fluxo com antes/depois no dashboard ----------
  Write-Host "`n== Fluxo: turma, aluno, matricula, professor ==" -ForegroundColor Cyan
  $t = Req POST "/turmas" @{ nome = "teste-$sfx"; anoLetivoId = $anoId } $tk
  Verificar "criar turma -> 201" ($t.Status -eq 201)
  $tid = $t.Dados.id

  $p1 = Painel
  Verificar "turma nova aparece sem professor" (EstaEm $p1.pendencias.turmasSemProfessor $tid)
  Verificar "turma nova aparece sem alunos" (EstaEm $p1.pendencias.turmasSemAlunos $tid)
  Verificar "total de turmas subiu 1" ($p1.totais.turmas -eq ($p0.totais.turmas + 1))

  $a = Req POST "/alunos" @{ nome = "Aluno Teste $sfx"; email = "aluno$sfx@teste.com"; matricula = "T$sfx" } $tk
  Verificar "criar aluno -> 201" ($a.Status -eq 201)
  $aid = $a.Dados.id
  $m = Req POST "/matriculas" @{ alunoId = $aid; turmaId = $tid } $tk
  Verificar "matricular -> 201" ($m.Status -eq 201)

  $p2 = Painel
  $ocup = @($p2.ocupacaoPorTurma | Where-Object { $_.turmaId -eq $tid })[0]
  Verificar "turma com 1 aluno ativo" ($ocup.alunosAtivos -eq 1)
  Verificar "turma saiu de 'sem alunos'" (-not (EstaEm $p2.pendencias.turmasSemAlunos $tid))
  Verificar "matriculas ATIVA subiu 1" ($p2.matriculas.ATIVA -eq ($base.ATIVA + 1))

  $prof = Req POST "/professores" @{ nome = "Prof Teste $sfx"; email = "prof$sfx@teste.com"; especialidade = "Teste" } $tk
  $disc = Req POST "/disciplinas" @{ nome = "Disc Teste $sfx"; cargaHoraria = 40 } $tk
  $al = Req POST "/alocacoes" @{ professorId = $prof.Dados.id; turmaId = $tid; disciplinaId = $disc.Dados.id } $tk
  Verificar "alocar professor -> 201" ($al.Status -eq 201)
  Verificar "alocacao repetida -> 409" ((Req POST "/alocacoes" @{ professorId = $prof.Dados.id; turmaId = $tid; disciplinaId = $disc.Dados.id } $tk).Status -eq 409)

  $p3 = Painel
  Verificar "turma saiu de 'sem professor'" (-not (EstaEm $p3.pendencias.turmasSemProfessor $tid))

  $det = (Req GET "/turmas/$tid" $null $tk).Dados
  Verificar "detalhe da turma: 1 aluno" (@($det.alunos).Count -eq 1)
  Verificar "detalhe da turma: 1 professor" (@($det.professores).Count -eq 1)
  Verificar "filtro de alocacoes por turma" (@((Req GET "/alocacoes?turmaId=$tid" $null $tk).Dados).Count -eq 1)

  # ---------- D. Cancelamento, rematrícula e transferência ----------
  Write-Host "`n== Matriculas: cancelar, rematricular, transferir ==" -ForegroundColor Cyan
  $c = Req PATCH "/matriculas/$($m.Dados.id)/cancelar" $null $tk
  Verificar "cancelar matricula -> 200" ($c.Status -eq 200)

  $p4 = Painel
  Verificar "turma voltou a 'sem alunos'" (EstaEm $p4.pendencias.turmasSemAlunos $tid)
  Verificar "matriculas CANCELADA subiu 1" ($p4.matriculas.CANCELADA -eq ($base.CANCELADA + 1))
  Verificar "alunos sem matricula ativa subiu 1" ($p4.pendencias.alunosSemMatriculaAtiva.total -eq ($semMatBase + 1))

  $t2 = Req POST "/turmas" @{ nome = "teste-$sfx-b"; anoLetivoId = $anoId } $tk
  $tid2 = $t2.Dados.id
  $m1 = Req POST "/matriculas" @{ alunoId = $aid; turmaId = $tid } $tk
  Verificar "rematricular apos cancelamento -> 201" ($m1.Status -eq 201)
  Verificar "segunda matricula ativa no ano -> 409" ((Req POST "/matriculas" @{ alunoId = $aid; turmaId = $tid2 } $tk).Status -eq 409)

  $tr = Req POST "/matriculas/$($m1.Dados.id)/transferir" @{ turmaDestinoId = $tid2 } $tk
  Verificar "transferir de turma -> 201" ($tr.Status -eq 201)
  $hist = @((Req GET "/matriculas?alunoId=$aid" $null $tk).Dados)
  Verificar "historico com 3 matriculas (cancelada, transferida, ativa)" ($hist.Count -eq 3)
}

# ---------- E. Validações ----------
Write-Host "`n== Validações ==" -ForegroundColor Cyan
Verificar "turma sem ano -> 400" ((Req POST "/turmas" @{ nome = "x" } $tk).Status -eq 400)
Verificar "id invalido -> 400" ((Req GET "/turmas/abc" $null $tk).Status -eq 400)
Verificar "turma inexistente -> 404" ((Req GET "/turmas/999999" $null $tk).Status -eq 404)
Verificar "ano com datas invertidas -> 400" ((Req POST "/anos-letivos" @{ ano = 2099; dataInicio = "2099-12-01"; dataFim = "2099-02-01" } $tk).Status -eq 400)
Verificar "aluno com e-mail invalido -> 400" ((Req POST "/alunos" @{ nome = "Beto"; email = "sem-arroba"; matricula = "X1" } $tk).Status -eq 400)
Verificar "disciplina com carga negativa -> 400" ((Req POST "/disciplinas" @{ nome = "Fisica"; cargaHoraria = -5 } $tk).Status -eq 400)
Verificar "turma com ano inexistente -> 404" ((Req POST "/turmas" @{ nome = "9Z"; anoLetivoId = 999999 } $tk).Status -eq 404)

# ---------- F. RBAC ----------
Write-Host "`n== Controle de acesso (RBAC) ==" -ForegroundColor Cyan
$emailProf = "prof-rbac$sfx@teste.com"
$u = Req POST "/usuarios" @{ nome = "Prof RBAC"; email = $emailProf; senha = "senha12345"; papel = "PROFESSOR" } $tk
Verificar "criar usuario professor -> 201" ($u.Status -eq 201)
Verificar "resposta nao expoe senhaHash" ($null -eq $u.Dados.senhaHash)

$lp = Req POST "/auth/login" @{ email = $emailProf; senha = "senha12345" }
$tp = $lp.Dados.token
Verificar "professor: /auth/me -> 200" ((Req GET "/auth/me" $null $tp).Status -eq 200)
Verificar "professor: /turmas -> 403" ((Req GET "/turmas" $null $tp).Status -eq 403)
Verificar "professor: /dashboard/gestor -> 403" ((Req GET "/dashboard/gestor" $null $tp).Status -eq 403)

# ---------- Resumo ----------
Write-Host ""
$cor = "Green"
if ($script:falhou -gt 0) { $cor = "Red" }
Write-Host "Resultado: $($script:passou) passaram, $($script:falhou) falharam." -ForegroundColor $cor