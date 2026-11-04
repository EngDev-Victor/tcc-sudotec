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

# Gera um CPF válido (9 dígitos aleatórios + 2 dígitos verificadores)
function NovoCpf {
  do {
    $d = @(1..9 | ForEach-Object { Get-Random -Minimum 0 -Maximum 10 })
  } while (($d | Select-Object -Unique).Count -eq 1)
  foreach ($n in 10, 11) {
    $soma = 0
    for ($i = 0; $i -lt $d.Count; $i++) { $soma += $d[$i] * ($n - $i) }
    $resto = ($soma * 10) % 11
    if ($resto -eq 10) { $resto = 0 }
    $d += $resto
  }
  return ($d -join "")
}

function MascararCpf($c) {
  return "$($c.Substring(0,3)).$($c.Substring(3,3)).$($c.Substring(6,3))-$($c.Substring(9,2))"
}

# Aluno válido; sobrescreva campos com $Extra
function CorpoAluno($Sufixo, $Extra = @{}) {
  $corpo = @{
    nome = "Aluno Teste $Sufixo"
    email = "aluno$Sufixo@teste.com"
    matricula = "T$Sufixo"
    cpf = (NovoCpf)
    dataNascimento = "2012-05-20"
    nomeResponsavel = "Responsavel Teste"
    telefone = "(46) 99999-0000"
  }
  foreach ($k in $Extra.Keys) { $corpo[$k] = $Extra[$k] }
  return $corpo
}

# Junta duas hashtables; os valores de $extra sobrescrevem os de $base
function Mesclar($base, $extra) {
  $r = @{} + $base
  foreach ($k in $extra.Keys) { $r[$k] = $extra[$k] }
  return $r
}

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
  $t = Req POST "/turmas" @{ nome = "teste-$sfx"; anoLetivoId = $anoId; turno = "MANHA"; sala = "Sala 1" } $tk
  Verificar "criar turma -> 201" ($t.Status -eq 201)
  $tid = $t.Dados.id

  $p1 = Painel
  Verificar "turma nova aparece sem professor" (EstaEm $p1.pendencias.turmasSemProfessor $tid)
  Verificar "turma nova aparece sem alunos" (EstaEm $p1.pendencias.turmasSemAlunos $tid)
  Verificar "total de turmas subiu 1" ($p1.totais.turmas -eq ($p0.totais.turmas + 1))

  $a = Req POST "/alunos" (CorpoAluno $sfx) $tk
  Verificar "criar aluno -> 201" ($a.Status -eq 201)
  $aid = $a.Dados.id
  $m = Req POST "/matriculas" @{ alunoId = $aid; turmaId = $tid } $tk
  Verificar "matricular -> 201" ($m.Status -eq 201)

  $p2 = Painel
  $ocup = @($p2.ocupacaoPorTurma | Where-Object { $_.turmaId -eq $tid })[0]
  Verificar "turma com 1 aluno ativo" ($ocup.alunosAtivos -eq 1)
  Verificar "turma saiu de 'sem alunos'" (-not (EstaEm $p2.pendencias.turmasSemAlunos $tid))
  Verificar "matriculas ATIVA subiu 1" ($p2.matriculas.ATIVA -eq ($base.ATIVA + 1))

  $prof = Req POST "/professores" @{ nome = "Prof Teste $sfx"; email = "prof$sfx@teste.com"; especialidade = "Teste"; telefone = "(46) 3555-0000"; titulacao = "GRADUACAO" } $tk
  Verificar "criar professor -> 201" ($prof.Status -eq 201)
  $disc = Req POST "/disciplinas" @{ nome = "Disc Teste $sfx"; cargaHoraria = 40 } $tk
  $al = Req POST "/alocacoes" @{ professorId = $prof.Dados.id; turmaId = $tid; disciplinaId = $disc.Dados.id } $tk
  Verificar "alocar professor -> 201" ($al.Status -eq 201)
  Verificar "alocacao repetida -> 409" ((Req POST "/alocacoes" @{ professorId = $prof.Dados.id; turmaId = $tid; disciplinaId = $disc.Dados.id } $tk).Status -eq 409)

  $p3 = Painel
  Verificar "turma saiu de 'sem professor'" (-not (EstaEm $p3.pendencias.turmasSemProfessor $tid))

  $det = (Req GET "/turmas/$tid" $null $tk).Dados
  Verificar "detalhe da turma: 1 aluno" (@($det.alunos).Count -eq 1)
  Verificar "detalhe da turma: 1 professor" (@($det.professores).Count -eq 1)
  Verificar "detalhe da turma: turno e sala" ($det.turno -eq "MANHA" -and $det.sala -eq "Sala 1")
  Verificar "filtro de alocacoes por turma" (@((Req GET "/alocacoes?turmaId=$tid" $null $tk).Dados).Count -eq 1)

  # ---------- D. Cancelamento, rematrícula e transferência ----------
  Write-Host "`n== Matriculas: cancelar, rematricular, transferir ==" -ForegroundColor Cyan
  $c = Req PATCH "/matriculas/$($m.Dados.id)/cancelar" $null $tk
  Verificar "cancelar matricula -> 200" ($c.Status -eq 200)

  $p4 = Painel
  Verificar "turma voltou a 'sem alunos'" (EstaEm $p4.pendencias.turmasSemAlunos $tid)
  Verificar "matriculas CANCELADA subiu 1" ($p4.matriculas.CANCELADA -eq ($base.CANCELADA + 1))
  Verificar "alunos sem matricula ativa subiu 1" ($p4.pendencias.alunosSemMatriculaAtiva.total -eq ($semMatBase + 1))

  $t2 = Req POST "/turmas" @{ nome = "teste-$sfx-b"; anoLetivoId = $anoId; turno = "TARDE"; sala = "Sala 2" } $tk
  $tid2 = $t2.Dados.id
  $m1 = Req POST "/matriculas" @{ alunoId = $aid; turmaId = $tid } $tk
  Verificar "rematricular apos cancelamento -> 201" ($m1.Status -eq 201)
  Verificar "segunda matricula ativa no ano -> 409" ((Req POST "/matriculas" @{ alunoId = $aid; turmaId = $tid2 } $tk).Status -eq 409)

  $tr = Req POST "/matriculas/$($m1.Dados.id)/transferir" @{ turmaDestinoId = $tid2 } $tk
  Verificar "transferir de turma -> 201" ($tr.Status -eq 201)
  $hist = @((Req GET "/matriculas?alunoId=$aid" $null $tk).Dados.dados)
  Verificar "historico com 3 matriculas (cancelada, transferida, ativa)" ($hist.Count -eq 3)
}

# ---------- E. Validações gerais ----------
Write-Host "`n== Validações gerais ==" -ForegroundColor Cyan
Verificar "turma sem ano -> 400" ((Req POST "/turmas" @{ nome = "x"; turno = "MANHA"; sala = "S1" } $tk).Status -eq 400)
Verificar "id invalido -> 400" ((Req GET "/turmas/abc" $null $tk).Status -eq 400)
Verificar "turma inexistente -> 404" ((Req GET "/turmas/999999" $null $tk).Status -eq 404)
Verificar "ano com datas invertidas -> 400" ((Req POST "/anos-letivos" @{ ano = 2099; dataInicio = "2099-12-01"; dataFim = "2099-02-01" } $tk).Status -eq 400)
Verificar "disciplina com carga negativa -> 400" ((Req POST "/disciplinas" @{ nome = "Fisica"; cargaHoraria = -5 } $tk).Status -eq 400)
Verificar "turma com ano inexistente -> 404" ((Req POST "/turmas" @{ nome = "9Z"; anoLetivoId = 999999; turno = "MANHA"; sala = "S1" } $tk).Status -eq 404)

# ---------- F. Alunos: campos novos ----------
Write-Host "`n== Alunos: campos novos ==" -ForegroundColor Cyan
Verificar "aluno com e-mail invalido -> 400" ((Req POST "/alunos" (CorpoAluno "e$sfx" @{ email = "sem-arroba" }) $tk).Status -eq 400)

$semCpf = CorpoAluno "s$sfx"
$semCpf.Remove("cpf")
Verificar "aluno sem CPF -> 400" ((Req POST "/alunos" $semCpf $tk).Status -eq 400)
Verificar "aluno com CPF invalido (digitos repetidos) -> 400" ((Req POST "/alunos" (CorpoAluno "c1$sfx" @{ cpf = "11111111111" }) $tk).Status -eq 400)
Verificar "aluno com CPF de digito verificador errado -> 400" ((Req POST "/alunos" (CorpoAluno "c2$sfx" @{ cpf = "52998224726" }) $tk).Status -eq 400)
Verificar "aluno com data de nascimento futura -> 400" ((Req POST "/alunos" (CorpoAluno "d1$sfx" @{ dataNascimento = "2999-01-01" }) $tk).Status -eq 400)
Verificar "aluno com data inexistente (30/02) -> 400" ((Req POST "/alunos" (CorpoAluno "d2$sfx" @{ dataNascimento = "2015-02-30" }) $tk).Status -eq 400)
Verificar "aluno com telefone invalido -> 400" ((Req POST "/alunos" (CorpoAluno "t1$sfx" @{ telefone = "123" }) $tk).Status -eq 400)
Verificar "aluno sem nome do responsavel -> 400" ((Req POST "/alunos" (CorpoAluno "r1$sfx" @{ nomeResponsavel = "  " }) $tk).Status -eq 400)

$cpfMask = MascararCpf (NovoCpf)
$cpfSoDigitos = $cpfMask -replace '\D', ''
$ae = Req POST "/alunos" (CorpoAluno "m$sfx" @{ cpf = $cpfMask }) $tk
Verificar "aluno com CPF mascarado -> 201" ($ae.Status -eq 201)
Verificar "CPF guardado so com digitos" ($ae.Dados.cpf -eq $cpfSoDigitos)
Verificar "telefone guardado so com digitos" ($ae.Dados.telefone -eq "46999990000")
Verificar "aluno nasce ativo" ($ae.Dados.ativo -eq $true)
Verificar "data de nascimento devolvida" ($ae.Dados.dataNascimento -like "2012-05-20*")

Verificar "aluno com CPF duplicado -> 409" ((Req POST "/alunos" (CorpoAluno "dup$sfx" @{ cpf = $cpfSoDigitos }) $tk).Status -eq 409)

$up = Req PUT "/alunos/$($ae.Dados.id)" @{ telefone = "(46) 98888-7777" } $tk
Verificar "atualizar so o telefone -> 200 e normalizado" ($up.Status -eq 200 -and $up.Dados.telefone -eq "46988887777")
Verificar "campo ativo nao e alteravel via PUT -> 400" ((Req PUT "/alunos/$($ae.Dados.id)" @{ ativo = $false } $tk).Status -eq 400)

# ---------- G. Professores e turmas: campos novos ----------
Write-Host "`n== Professores e turmas: campos novos ==" -ForegroundColor Cyan
$dp = Req POST "/disciplinas" @{ nome = "DiscPrincipal $sfx"; cargaHoraria = 30 } $tk
$corpoProf = @{ nome = "Prof Campos $sfx"; email = "profcampos$sfx@teste.com"; especialidade = "Teste"; telefone = "(46) 99888-7766"; titulacao = "MESTRADO" }

Verificar "professor com titulacao invalida -> 400" ((Req POST "/professores" (Mesclar $corpoProf @{ email = "t$sfx@teste.com"; titulacao = "PHD" }) $tk).Status -eq 400)
Verificar "professor com telefone invalido -> 400" ((Req POST "/professores" (Mesclar $corpoProf @{ email = "p$sfx@teste.com"; telefone = "abc" }) $tk).Status -eq 400)
Verificar "professor com disciplina principal inexistente -> 404" ((Req POST "/professores" (Mesclar $corpoProf @{ email = "q$sfx@teste.com"; disciplinaPrincipalId = 999999 }) $tk).Status -eq 404)

$pc = Req POST "/professores" (Mesclar $corpoProf @{ disciplinaPrincipalId = $dp.Dados.id }) $tk
Verificar "professor com disciplina principal -> 201" ($pc.Status -eq 201)
Verificar "professor devolve a disciplina principal" ($pc.Dados.disciplinaPrincipal.id -eq $dp.Dados.id)
Verificar "professor nasce ativo" ($pc.Dados.ativo -eq $true)

$semDisc = Req POST "/professores" (Mesclar $corpoProf @{ email = "sd$sfx@teste.com" }) $tk
Verificar "professor sem disciplina principal -> 201 (opcional)" ($semDisc.Status -eq 201)

if ($anoId) {
  Verificar "turma com turno invalido -> 400" ((Req POST "/turmas" @{ nome = "tv$sfx"; anoLetivoId = $anoId; turno = "NOITE"; sala = "S1" } $tk).Status -eq 400)
  Verificar "turma sem sala -> 400" ((Req POST "/turmas" @{ nome = "ts$sfx"; anoLetivoId = $anoId; turno = "MANHA" } $tk).Status -eq 400)
  $tu = Req PUT "/turmas/$tid" @{ sala = "Sala 9" } $tk
  Verificar "atualizar so a sala -> 200" ($tu.Status -eq 200 -and $tu.Dados.sala -eq "Sala 9")
}

# ---------- H. RBAC ----------
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

# ---------- I. Inativação e exclusões ----------
Write-Host "`n== Inativação e exclusões ==" -ForegroundColor Cyan

# Alunos e professores não são apagados
$ax = Req POST "/alunos" (CorpoAluno "x$sfx") $tk
Verificar "criar aluno para teste de exclusao -> 201" ($ax.Status -eq 201)
Verificar "DELETE aluno -> 405" ((Req DELETE "/alunos/$($ax.Dados.id)" $null $tk).Status -eq 405)
Verificar "aluno continua existindo apos DELETE" ((Req GET "/alunos/$($ax.Dados.id)" $null $tk).Status -eq 200)
Verificar "DELETE professor -> 405" ((Req DELETE "/professores/$($pc.Dados.id)" $null $tk).Status -eq 405)
Verificar "inativar aluno inexistente -> 404" ((Req PATCH "/alunos/999999/ativo" @{ ativo = $false } $tk).Status -eq 404)
Verificar "inativar com valor invalido -> 400" ((Req PATCH "/alunos/$($ax.Dados.id)/ativo" @{ ativo = "sim" } $tk).Status -eq 400)

if ($anoId) {
  # Inativar aluno cancela as matrículas ativas e preserva o histórico
  $ai = Req POST "/alunos" (CorpoAluno "i$sfx") $tk
  $mi = Req POST "/matriculas" @{ alunoId = $ai.Dados.id; turmaId = $tid } $tk
  Verificar "matricular aluno para teste de inativacao -> 201" ($mi.Status -eq 201)

  $inat = Req PATCH "/alunos/$($ai.Dados.id)/ativo" @{ ativo = $false } $tk
  Verificar "inativar aluno -> 200 e ativo=false" ($inat.Status -eq 200 -and $inat.Dados.ativo -eq $false)
  Verificar "inativar cancela 1 matricula ativa" ($inat.Dados.matriculasCanceladas -eq 1)
  $hist1 = @((Req GET "/matriculas?alunoId=$($ai.Dados.id)" $null $tk).Dados.dados)
  Verificar "historico preservado (1 matricula CANCELADA)" ($hist1.Count -eq 1 -and $hist1[0].status -eq "CANCELADA")

  $reat = Req PATCH "/alunos/$($ai.Dados.id)/ativo" @{ ativo = $true } $tk
  Verificar "reativar aluno -> 200 e ativo=true" ($reat.Status -eq 200 -and $reat.Dados.ativo -eq $true)
  $hist2 = @((Req GET "/matriculas?alunoId=$($ai.Dados.id)" $null $tk).Dados.dados)
  Verificar "reativar nao recria matricula" ($hist2.Count -eq 1 -and $hist2[0].status -eq "CANCELADA")

  # Inativar professor mantém as alocações existentes
  $pinat = Req PATCH "/professores/$($prof.Dados.id)/ativo" @{ ativo = $false } $tk
  Verificar "inativar professor -> 200 e ativo=false" ($pinat.Status -eq 200 -and $pinat.Dados.ativo -eq $false)
  Verificar "alocacoes do professor inativo preservadas" (@((Req GET "/alocacoes?professorId=$($prof.Dados.id)" $null $tk).Dados).Count -eq 1)
  $preat = Req PATCH "/professores/$($prof.Dados.id)/ativo" @{ ativo = $true } $tk
  Verificar "reativar professor -> 200 e ativo=true" ($preat.Status -eq 200 -and $preat.Dados.ativo -eq $true)

  # Exclusões que comprometeriam relacionamentos e histórico
  Verificar "DELETE turma com matriculas -> 409" ((Req DELETE "/turmas/$tid" $null $tk).Status -eq 409)
  Verificar "DELETE disciplina alocada -> 409" ((Req DELETE "/disciplinas/$($disc.Dados.id)" $null $tk).Status -eq 409)
  Verificar "DELETE disciplina principal de professor -> 409" ((Req DELETE "/disciplinas/$($dp.Dados.id)" $null $tk).Status -eq 409)
  Verificar "DELETE ano letivo ativo -> 409" ((Req DELETE "/anos-letivos/$anoId" $null $tk).Status -eq 409)

  # Ano letivo de teste: com turma bloqueia; sem turma, apaga
  $usados = @((Req GET "/anos-letivos" $null $tk).Dados | ForEach-Object { $_.ano })
  $anoTeste = 2060
  while ($usados -contains $anoTeste) { $anoTeste++ }
  $anoX = Req POST "/anos-letivos" @{ ano = $anoTeste; dataInicio = "$anoTeste-02-01"; dataFim = "$anoTeste-12-01" } $tk
  Verificar "criar ano letivo de teste -> 201" ($anoX.Status -eq 201)
  $turmaX = Req POST "/turmas" @{ nome = "ex-$sfx"; anoLetivoId = $anoX.Dados.id; turno = "TARDE"; sala = "Sala 3" } $tk
  Verificar "DELETE ano letivo com turmas -> 409" ((Req DELETE "/anos-letivos/$($anoX.Dados.id)" $null $tk).Status -eq 409)
  Verificar "DELETE turma sem vinculos -> 204" ((Req DELETE "/turmas/$($turmaX.Dados.id)" $null $tk).Status -eq 204)
  Verificar "DELETE ano letivo sem turmas -> 204" ((Req DELETE "/anos-letivos/$($anoX.Dados.id)" $null $tk).Status -eq 204)

  # Alocação pode ser removida (desfazer um engano)
  Verificar "DELETE alocacao -> 204 (permitido)" ((Req DELETE "/alocacoes/$($al.Dados.id)" $null $tk).Status -eq 204)
}

Verificar "matricula nao tem DELETE -> 404" ((Req DELETE "/matriculas/1" $null $tk).Status -eq 404)

# ---------- J. Regras de matrícula e alocação ----------
Write-Host "`n== Regras de matrícula e alocação ==" -ForegroundColor Cyan

if ($anoId) {
  # Aluno inativo, aluno ou turma inexistentes
  $aj = Req POST "/alunos" (CorpoAluno "j$sfx") $tk
  Req PATCH "/alunos/$($aj.Dados.id)/ativo" @{ ativo = $false } $tk | Out-Null
  Verificar "matricular aluno inativo -> 409" ((Req POST "/matriculas" @{ alunoId = $aj.Dados.id; turmaId = $tid } $tk).Status -eq 409)
  Verificar "matricular aluno inexistente -> 404" ((Req POST "/matriculas" @{ alunoId = 999999; turmaId = $tid } $tk).Status -eq 404)
  Verificar "matricular em turma inexistente -> 404" ((Req POST "/matriculas" @{ alunoId = $ai.Dados.id; turmaId = 999999 } $tk).Status -eq 404)

  # Cancelar e transferir só valem para matrícula ativa
  Verificar "cancelar matricula ja cancelada -> 409" ((Req PATCH "/matriculas/$($mi.Dados.id)/cancelar" $null $tk).Status -eq 409)
  Verificar "cancelar matricula inexistente -> 404" ((Req PATCH "/matriculas/999999/cancelar" $null $tk).Status -eq 404)
  Verificar "transferir matricula ja transferida -> 409" ((Req POST "/matriculas/$($m1.Dados.id)/transferir" @{ turmaDestinoId = $tid } $tk).Status -eq 409)
  Verificar "transferir para a mesma turma -> 400" ((Req POST "/matriculas/$($tr.Dados.id)/transferir" @{ turmaDestinoId = $tid2 } $tk).Status -eq 400)
  Verificar "transferir para turma inexistente -> 404" ((Req POST "/matriculas/$($tr.Dados.id)/transferir" @{ turmaDestinoId = 999999 } $tk).Status -eq 404)

  # Transferência entre anos letivos diferentes é bloqueada
  $usadosJ = @((Req GET "/anos-letivos" $null $tk).Dados | ForEach-Object { $_.ano })
  $anoY = 2060
  while ($usadosJ -contains $anoY) { $anoY++ }
  $anoYReq = Req POST "/anos-letivos" @{ ano = $anoY; dataInicio = "$anoY-02-01"; dataFim = "$anoY-12-01" } $tk
  Verificar "criar segundo ano letivo de teste -> 201" ($anoYReq.Status -eq 201)
  $turmaY = Req POST "/turmas" @{ nome = "y-$sfx"; anoLetivoId = $anoYReq.Dados.id; turno = "MANHA"; sala = "Sala 4" } $tk
  $ak = Req POST "/alunos" (CorpoAluno "k$sfx") $tk
  $mk = Req POST "/matriculas" @{ alunoId = $ak.Dados.id; turmaId = $tid } $tk
  Verificar "transferir para turma de outro ano letivo -> 409" ((Req POST "/matriculas/$($mk.Dados.id)/transferir" @{ turmaDestinoId = $turmaY.Dados.id } $tk).Status -eq 409)
  $hk = @((Req GET "/matriculas?alunoId=$($ak.Dados.id)" $null $tk).Dados.dados)
  Verificar "matricula original segue ativa e sem nova matricula" ($hk.Count -eq 1 -and $hk[0].status -eq "ATIVA" -and $hk[0].turmaId -eq $tid)
  Verificar "limpeza: DELETE turma do ano de teste -> 204" ((Req DELETE "/turmas/$($turmaY.Dados.id)" $null $tk).Status -eq 204)
  Verificar "limpeza: DELETE ano letivo de teste -> 204" ((Req DELETE "/anos-letivos/$($anoYReq.Dados.id)" $null $tk).Status -eq 204)

  # Só professor ativo recebe alocações
  $pj = Req POST "/professores" @{ nome = "Prof Ativo $sfx"; email = "pativo$sfx@teste.com"; especialidade = "Teste"; telefone = "(46) 3555-1111"; titulacao = "GRADUACAO" } $tk
  $alj = Req POST "/alocacoes" @{ professorId = $pj.Dados.id; turmaId = $tid; disciplinaId = $disc.Dados.id } $tk
  Verificar "alocar professor ativo -> 201" ($alj.Status -eq 201)

  Req PATCH "/professores/$($pj.Dados.id)/ativo" @{ ativo = $false } $tk | Out-Null
  Verificar "alocar professor inativo -> 409" ((Req POST "/alocacoes" @{ professorId = $pj.Dados.id; turmaId = $tid2; disciplinaId = $disc.Dados.id } $tk).Status -eq 409)
  Verificar "editar alocacao de professor inativo -> 409" ((Req PUT "/alocacoes/$($alj.Dados.id)" @{ turmaId = $tid2 } $tk).Status -eq 409)

  Req PATCH "/professores/$($pj.Dados.id)/ativo" @{ ativo = $true } $tk | Out-Null
  Verificar "editar alocacao apos reativar o professor -> 200" ((Req PUT "/alocacoes/$($alj.Dados.id)" @{ turmaId = $tid2 } $tk).Status -eq 200)

  # Duplicação via edição
  $alj2 = Req POST "/alocacoes" @{ professorId = $pj.Dados.id; turmaId = $tid; disciplinaId = $disc.Dados.id } $tk
  Verificar "criar segunda alocacao -> 201" ($alj2.Status -eq 201)
  Verificar "editar alocacao para duplicar outra -> 409" ((Req PUT "/alocacoes/$($alj2.Dados.id)" @{ turmaId = $tid2 } $tk).Status -eq 409)
}

# ---------- K. Dashboard: ativos, inativos e professores distintos ----------
Write-Host "`n== Dashboard: ativos, inativos e professores distintos ==" -ForegroundColor Cyan

if ($anoId) {
  $d0 = Painel
  Verificar "alunos: total = ativos + inativos" ($d0.alunos.total -eq ($d0.alunos.ativos + $d0.alunos.inativos))
  Verificar "professores: total = ativos + inativos" ($d0.professores.total -eq ($d0.professores.ativos + $d0.professores.inativos))
  Verificar "totais coerentes com os blocos de alunos e professores" ($d0.totais.alunos -eq $d0.alunos.total -and $d0.totais.professores -eq $d0.professores.total)
  Verificar "ha alunos inativos (criados nos testes anteriores)" ($d0.alunos.inativos -ge 1)

  # Turma nova com 2 professores distintos e 3 alocacoes (professor x disciplina)
  $tdash = Req POST "/turmas" @{ nome = "dash-$sfx"; anoLetivoId = $anoId; turno = "MANHA"; sala = "Sala 5" } $tk
  $tdId = $tdash.Dados.id
  $pa = Req POST "/professores" @{ nome = "Prof A $sfx"; email = "pa$sfx@teste.com"; especialidade = "Teste"; telefone = "(46) 3555-2222"; titulacao = "GRADUACAO" } $tk
  $pb = Req POST "/professores" @{ nome = "Prof B $sfx"; email = "pb$sfx@teste.com"; especialidade = "Teste"; telefone = "(46) 3555-3333"; titulacao = "GRADUACAO" } $tk
  Req POST "/alocacoes" @{ professorId = $pa.Dados.id; turmaId = $tdId; disciplinaId = $disc.Dados.id } $tk | Out-Null
  Req POST "/alocacoes" @{ professorId = $pa.Dados.id; turmaId = $tdId; disciplinaId = $dp.Dados.id } $tk | Out-Null
  Req POST "/alocacoes" @{ professorId = $pb.Dados.id; turmaId = $tdId; disciplinaId = $disc.Dados.id } $tk | Out-Null

  $d1 = Painel
  $o1 = @($d1.ocupacaoPorTurma | Where-Object { $_.turmaId -eq $tdId })[0]
  Verificar "turma: 3 alocacoes (professor x disciplina)" ($o1.alocacoes -eq 3)
  Verificar "turma: conta 2 professores distintos" ($o1.professores -eq 2)
  Verificar "turma: 2 professores ativos" ($o1.professoresAtivos -eq 2)
  Verificar "professores alocados no ano contam distintos (+2)" ($d1.professores.alocadosNoAno -eq ($d0.professores.alocadosNoAno + 2))
  Verificar "turma com professores nao esta em 'sem professor'" (-not (EstaEm $d1.pendencias.turmasSemProfessor $tdId))

  # Inativar um professor mantém a contagem de distintos; sem nenhum ativo a turma vira pendência
  Req PATCH "/professores/$($pb.Dados.id)/ativo" @{ ativo = $false } $tk | Out-Null
  $d2 = Painel
  $o2 = @($d2.ocupacaoPorTurma | Where-Object { $_.turmaId -eq $tdId })[0]
  Verificar "inativar professor: turma segue com 2 distintos e 1 ativo" ($o2.professores -eq 2 -and $o2.professoresAtivos -eq 1)
  Verificar "professores inativos subiu 1" ($d2.professores.inativos -eq ($d0.professores.inativos + 1))

  Req PATCH "/professores/$($pa.Dados.id)/ativo" @{ ativo = $false } $tk | Out-Null
  $d3 = Painel
  Verificar "sem professor ativo a turma entra em 'sem professor'" (EstaEm $d3.pendencias.turmasSemProfessor $tdId)

  # Alunos: matriculados no ano e pendências ignoram inativos
  $am = Req POST "/alunos" (CorpoAluno "dm$sfx") $tk
  Req POST "/matriculas" @{ alunoId = $am.Dados.id; turmaId = $tdId } $tk | Out-Null
  $d4 = Painel
  $o4 = @($d4.ocupacaoPorTurma | Where-Object { $_.turmaId -eq $tdId })[0]
  Verificar "turma com 1 aluno ativo" ($o4.alunosAtivos -eq 1)
  Verificar "alunos matriculados no ano subiu 1" ($d4.alunos.matriculadosNoAno -eq ($d0.alunos.matriculadosNoAno + 1))

  $s0 = $d4.pendencias.alunosSemMatriculaAtiva.total
  $an = Req POST "/alunos" (CorpoAluno "dn$sfx") $tk
  $s1 = (Painel).pendencias.alunosSemMatriculaAtiva.total
  Verificar "aluno ativo sem matricula entra nas pendencias" ($s1 -eq ($s0 + 1))
  Req PATCH "/alunos/$($an.Dados.id)/ativo" @{ ativo = $false } $tk | Out-Null
  $d5 = Painel
  Verificar "aluno inativo sai das pendencias" ($d5.pendencias.alunosSemMatriculaAtiva.total -eq $s0)
  Verificar "alunos inativos subiu 1 e total subiu 1" ($d5.alunos.inativos -eq ($d4.alunos.inativos + 1) -and $d5.alunos.total -eq ($d4.alunos.total + 1))
}

# ---------- L. Listagens: busca, filtros e paginacao ----------
Write-Host "`n== Listagens: busca, filtros e paginacao ==" -ForegroundColor Cyan

function Q($texto) { return [uri]::EscapeDataString($texto) }

if ($anoId) {
  $tok = "pgn$sfx"
  $ea = [char]0x00E9   # e com acento agudo
  $eu = [char]0x00C9   # E maiusculo com acento agudo
  $aa = [char]0x00C1   # A maiusculo com acento agudo
  $ia = [char]0x00ED   # i com acento agudo
  $qTok = Q $tok

  # Alunos com e sem acento, em maiusculas e minusculas
  $nomes = @("Jos$ea $tok Silva", "Jose $tok Souza", "ANA $tok Lima", "Zelia $tok Costa", "${aa}gata $tok Alves")
  $criados = @()
  for ($i = 0; $i -lt $nomes.Count; $i++) {
    $r = Req POST "/alunos" (CorpoAluno "pg$i$sfx" @{ nome = $nomes[$i] }) $tk
    $criados += $r.Dados
  }
  Verificar "criar 5 alunos para teste de busca" (@($criados | Where-Object { $_.id }).Count -eq 5)

  $q1 = Q "jose $tok"
  $q2 = Q "JOS$eu $tok"
  Verificar "busca sem acento encontra nomes com e sem acento (2)" ((Req GET "/alunos?busca=$q1" $null $tk).Dados.paginacao.total -eq 2)
  Verificar "busca com maiuscula e acento encontra os mesmos 2" ((Req GET "/alunos?busca=$q2" $null $tk).Dados.paginacao.total -eq 2)

  $todos = Req GET "/alunos?busca=$qTok&limite=10" $null $tk
  Verificar "busca pelo termo unico retorna os 5" ($todos.Dados.paginacao.total -eq 5)
  $nomesOrd = @($todos.Dados.dados | ForEach-Object { $_.nome })
  Verificar "ordem alfabetica ignora acento (primeiro Agata, ultimo Zelia)" ($nomesOrd[0] -like "*gata*" -and $nomesOrd[-1] -like "Zelia*")

  # Paginacao
  $pg1 = Req GET "/alunos?busca=$qTok&limite=2&pagina=1" $null $tk
  $pg3 = Req GET "/alunos?busca=$qTok&limite=2&pagina=3" $null $tk
  $pg4 = Req GET "/alunos?busca=$qTok&limite=2&pagina=4" $null $tk
  Verificar "pagina 1 com limite 2 -> 2 itens, total 5, 3 paginas" (@($pg1.Dados.dados).Count -eq 2 -and $pg1.Dados.paginacao.total -eq 5 -and $pg1.Dados.paginacao.totalPaginas -eq 3)
  Verificar "ultima pagina -> 1 item" (@($pg3.Dados.dados).Count -eq 1)
  Verificar "pagina alem do fim -> lista vazia (200)" ($pg4.Status -eq 200 -and @($pg4.Dados.dados).Count -eq 0)
  Verificar "padrao: pagina 1 e limite 20" ($todos.Dados.paginacao.pagina -eq 1 -and (Req GET "/alunos?busca=$qTok" $null $tk).Dados.paginacao.limite -eq 20)

  # Filtros de status e turma
  Req PATCH "/alunos/$($criados[3].id)/ativo" @{ ativo = $false } $tk | Out-Null
  Verificar "alunos: filtro ativo=false (1)" ((Req GET "/alunos?busca=$qTok&ativo=false" $null $tk).Dados.paginacao.total -eq 1)
  Verificar "alunos: filtro ativo=true (4)" ((Req GET "/alunos?busca=$qTok&ativo=true" $null $tk).Dados.paginacao.total -eq 4)

  Req POST "/matriculas" @{ alunoId = $criados[0].id; turmaId = $tid } $tk | Out-Null
  Req POST "/matriculas" @{ alunoId = $criados[2].id; turmaId = $tid } $tk | Out-Null
  Verificar "alunos: filtro por turma (matricula ativa) (2)" ((Req GET "/alunos?turmaId=$tid&busca=$qTok" $null $tk).Dados.paginacao.total -eq 2)

  # Parametros invalidos
  Verificar "limite 0 -> 400" ((Req GET "/alunos?limite=0" $null $tk).Status -eq 400)
  Verificar "limite acima do maximo -> 400" ((Req GET "/alunos?limite=101" $null $tk).Status -eq 400)
  Verificar "pagina 0 -> 400" ((Req GET "/alunos?pagina=0" $null $tk).Status -eq 400)
  Verificar "pagina em texto -> 400" ((Req GET "/alunos?pagina=abc" $null $tk).Status -eq 400)
  Verificar "ativo invalido -> 400" ((Req GET "/alunos?ativo=talvez" $null $tk).Status -eq 400)
  Verificar "turmaId invalido -> 400" ((Req GET "/alunos?turmaId=abc" $null $tk).Status -eq 400)

  # Professores
  $nomesP = @("Prof $tok Alfa", "Prof $tok Beta", "Mar${ia}lia $tok Gama")
  $profs = @()
  for ($i = 0; $i -lt $nomesP.Count; $i++) {
    $corpo = @{ nome = $nomesP[$i]; email = "pgp$i$sfx@teste.com"; especialidade = "Teste"; telefone = "(46) 3555-4444"; titulacao = "GRADUACAO" }
    if ($i -lt 2) { $corpo.disciplinaPrincipalId = $dp.Dados.id }
    $profs += (Req POST "/professores" $corpo $tk).Dados
  }
  Verificar "criar 3 professores para teste de busca" (@($profs | Where-Object { $_.id }).Count -eq 3)
  Req POST "/alocacoes" @{ professorId = $profs[0].id; turmaId = $tid; disciplinaId = $disc.Dados.id } $tk | Out-Null

  $qMar = Q "marilia $tok"
  Verificar "professores: busca pelo termo unico (3)" ((Req GET "/professores?busca=$qTok" $null $tk).Dados.paginacao.total -eq 3)
  Verificar "professores: busca sem acento (1)" ((Req GET "/professores?busca=$qMar" $null $tk).Dados.paginacao.total -eq 1)
  Verificar "professores: filtro por disciplina principal (2)" ((Req GET "/professores?busca=$qTok&disciplinaPrincipalId=$($dp.Dados.id)" $null $tk).Dados.paginacao.total -eq 2)
  Verificar "professores: filtro por turma alocada (1)" ((Req GET "/professores?busca=$qTok&turmaId=$tid" $null $tk).Dados.paginacao.total -eq 1)
  Verificar "professores: filtro por disciplina alocada (1)" ((Req GET "/professores?busca=$qTok&disciplinaId=$($disc.Dados.id)" $null $tk).Dados.paginacao.total -eq 1)
  Req PATCH "/professores/$($profs[2].id)/ativo" @{ ativo = $false } $tk | Out-Null
  Verificar "professores: filtro ativo=false (1)" ((Req GET "/professores?busca=$qTok&ativo=false" $null $tk).Dados.paginacao.total -eq 1)
  Verificar "professores: paginacao (pagina 2 com limite 2 -> 1 item)" (@((Req GET "/professores?busca=$qTok&limite=2&pagina=2" $null $tk).Dados.dados).Count -eq 1)

  # Matriculas
  $mp = Req GET "/matriculas?turmaId=$tid&limite=1" $null $tk
  Verificar "matriculas: paginadas (limite 1, total >= 2)" ($mp.Status -eq 200 -and @($mp.Dados.dados).Count -eq 1 -and $mp.Dados.paginacao.total -ge 2)
  $ma = @((Req GET "/matriculas?turmaId=$tid&status=ATIVA&limite=100" $null $tk).Dados.dados)
  Verificar "matriculas: filtro status=ATIVA" ($ma.Count -ge 2 -and @($ma | Where-Object { $_.status -ne "ATIVA" }).Count -eq 0)
  Verificar "matriculas: status invalido -> 400" ((Req GET "/matriculas?status=XYZ" $null $tk).Status -eq 400)
  $mano = @((Req GET "/matriculas?anoLetivoId=$anoId&limite=100" $null $tk).Dados.dados)
  Verificar "matriculas: filtro por ano letivo" ($mano.Count -ge 1 -and @($mano | Where-Object { $_.turma.anoLetivoId -ne $anoId }).Count -eq 0)

  # Turmas: filtro por ano letivo (com uma turma de outro ano para provar a exclusao)
  $usadosL = @((Req GET "/anos-letivos" $null $tk).Dados | ForEach-Object { $_.ano })
  $anoZ = 2060
  while ($usadosL -contains $anoZ) { $anoZ++ }
  $anoZr = Req POST "/anos-letivos" @{ ano = $anoZ; dataInicio = "$anoZ-02-01"; dataFim = "$anoZ-12-01" } $tk
  $turmaZ = Req POST "/turmas" @{ nome = "z-$sfx"; anoLetivoId = $anoZr.Dados.id; turno = "MANHA"; sala = "Sala 6" } $tk
  $tZ = @((Req GET "/turmas?anoLetivoId=$($anoZr.Dados.id)" $null $tk).Dados)
  Verificar "turmas: filtro por ano letivo devolve so as do ano" ($tZ.Count -eq 1 -and $tZ[0].id -eq $turmaZ.Dados.id)
  $tA = @((Req GET "/turmas?anoLetivoId=$anoId" $null $tk).Dados)
  Verificar "turmas: ano ativo nao inclui turma de outro ano" (@($tA | Where-Object { $_.id -eq $turmaZ.Dados.id }).Count -eq 0)
  Req DELETE "/turmas/$($turmaZ.Dados.id)" $null $tk | Out-Null
  Req DELETE "/anos-letivos/$($anoZr.Dados.id)" $null $tk | Out-Null
}

# ---------- Resumo ----------
Write-Host ""
$cor = "Green"
if ($script:falhou -gt 0) { $cor = "Red" }
Write-Host "Resultado: $($script:passou) passaram, $($script:falhou) falharam." -ForegroundColor $cor