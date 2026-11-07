# Roda o testar-api.ps1 num banco de teste descartável (backend\test.db), sem tocar no dev.db.
#
#   cd backend
#   powershell -ExecutionPolicy Bypass -File .\scripts\testar-com-banco-teste.ps1
#
# Passos: confere caminhos -> guarda o SHA-256 do dev.db -> recria o test.db (migrations + seed)
# -> sobe a API na porta 3001 apontando para o test.db -> cria e ativa o ano letivo
# -> roda os testes -> derruba a API -> confere que o dev.db não mudou.
# Não altera o .env, não usa migrate reset e não faz commits.

$ErrorActionPreference = 'Stop'

$Porta = 3001
$SenhaTeste = 'senha-teste-123'   # vale só para o gestor do test.db
$EmailTeste = 'gestor@skolla.com' # o testar-api.ps1 faz login com este e-mail

function Etapa($texto) { Write-Host "`n>> $texto" -ForegroundColor Cyan }
function Falhar($texto) { Write-Host "`n[ERRO] $texto" -ForegroundColor Red; exit 1 }

# ---------- 1. Caminhos ----------
Etapa 'Conferindo caminhos'
$backend = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$devDb   = [IO.Path]::GetFullPath((Join-Path $backend 'dev.db'))
$testDb  = [IO.Path]::GetFullPath((Join-Path $backend 'test.db'))

if (-not (Test-Path -LiteralPath (Join-Path $backend 'package.json'))) { Falhar "package.json não encontrado em $backend" }
if ([IO.Path]::GetFileName($testDb) -ne 'test.db') { Falhar "Caminho do banco de teste inesperado: $testDb" }
if ([IO.Path]::GetDirectoryName($testDb) -ne $backend) { Falhar "O test.db precisa ficar em $backend" }
if ($testDb -ieq $devDb) { Falhar 'O banco de teste não pode ser o dev.db' }
Write-Host "backend : $backend"
Write-Host "dev.db  : $devDb (protegido)"
Write-Host "test.db : $testDb"

# ---------- 2. Porta livre ----------
$tcp = New-Object Net.Sockets.TcpClient
try { $tcp.Connect('127.0.0.1', $Porta); $ocupada = $true } catch { $ocupada = $false } finally { $tcp.Close() }
if ($ocupada) { Falhar "Já existe algo rodando na porta $Porta. Feche e rode de novo." }

# ---------- 3. SHA-256 do dev.db (antes) ----------
Etapa 'Guardando o SHA-256 do dev.db'
$hashAntes = $null
if (Test-Path -LiteralPath $devDb) {
  $hashAntes = (Get-FileHash -LiteralPath $devDb -Algorithm SHA256).Hash
  Write-Host "dev.db antes : $hashAntes"
} else {
  Write-Host 'dev.db não existe nesta pasta (nada a proteger).'
}

# Variáveis só desta sessão do PowerShell; o dotenv não sobrescreve variáveis já definidas
$nomesEnv = 'DATABASE_URL', 'PORT', 'SEED_GESTOR_NOME', 'SEED_GESTOR_EMAIL', 'SEED_GESTOR_SENHA'
$envAntes = @{}
foreach ($n in $nomesEnv) { $envAntes[$n] = [Environment]::GetEnvironmentVariable($n, 'Process') }

$servidor = $null
$codigo = 1
Push-Location $backend
try {
  $env:DATABASE_URL = 'file:' + ($testDb -replace '\\', '/')
  $env:PORT = "$Porta"
  $env:SEED_GESTOR_NOME = 'Gestor Teste'
  $env:SEED_GESTOR_EMAIL = $EmailTeste
  $env:SEED_GESTOR_SENHA = $SenhaTeste
  if ($env:DATABASE_URL -notmatch '/test\.db$') { Falhar "DATABASE_URL inesperada: $env:DATABASE_URL" }
  Write-Host "DATABASE_URL (só nesta execução) = $env:DATABASE_URL"

  # ---------- 4. Recriar o test.db ----------
  Etapa 'Recriando o test.db'
  foreach ($sufixo in '', '-wal', '-shm', '-journal') {
    $alvo = "$testDb$sufixo"
    if (Test-Path -LiteralPath $alvo) {
      Remove-Item -LiteralPath $alvo -Force
      Write-Host "removido: $alvo"
    }
  }

  # O Prisma e o npm escrevem avisos em stderr (ex.: "Loaded Prisma config from prisma.config.js.").
  # Com 'Stop', o PowerShell 5.1 trata essas linhas como erro quando a saída está redirecionada.
  # O resultado vem do $LASTEXITCODE.
  $ErrorActionPreference = 'Continue'
  & npx prisma migrate deploy
  $codMigrate = $LASTEXITCODE
  & npm run seed
  $codSeed = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
  if ($codMigrate -ne 0) { Falhar 'prisma migrate deploy falhou' }
  if ($codSeed -ne 0) { Falhar 'seed falhou' }

  # ---------- 5. Subir a API na porta de teste ----------
  Etapa "Subindo a API na porta $Porta"
  $logOut = Join-Path $env:TEMP 'skolla-teste-saida.log'
  $logErr = Join-Path $env:TEMP 'skolla-teste-erros.log'
  $servidor = Start-Process -FilePath 'npm.cmd' -ArgumentList 'start' -WorkingDirectory $backend `
    -PassThru -WindowStyle Hidden -RedirectStandardOutput $logOut -RedirectStandardError $logErr

  $noAr = $false
  for ($i = 0; $i -lt 60; $i++) {
    try { Invoke-RestMethod -Uri "http://localhost:$Porta/" -TimeoutSec 2 | Out-Null; $noAr = $true; break }
    catch { Start-Sleep -Milliseconds 500 }
  }
  if (-not $noAr) {
    Write-Host '--- log da API ---' -ForegroundColor Yellow
    if (Test-Path $logOut) { Get-Content $logOut -Tail 20 }
    if (Test-Path $logErr) { Get-Content $logErr -Tail 20 }
    Falhar "A API não respondeu na porta $Porta em 30 segundos"
  }
  Write-Host 'API no ar.'

  # ---------- 6. Ano letivo ativo ----------
  Etapa 'Criando e ativando o ano letivo'
  $api = "http://localhost:$Porta/api"
  $corpoLogin = @{ email = $EmailTeste; senha = $SenhaTeste } | ConvertTo-Json
  $tk = (Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType 'application/json' -Body $corpoLogin).token
  $h = @{ Authorization = "Bearer $tk" }
  $anoAtual = (Get-Date).Year
  $corpoAno = @{ ano = $anoAtual; dataInicio = "$anoAtual-02-01"; dataFim = "$anoAtual-12-15" } | ConvertTo-Json
  $ano = Invoke-RestMethod -Method Post -Uri "$api/anos-letivos" -Headers $h -ContentType 'application/json' -Body $corpoAno
  Invoke-RestMethod -Method Patch -Uri "$api/anos-letivos/$($ano.id)/ativar" -Headers $h | Out-Null
  Write-Host "Ano letivo $anoAtual ativo (id $($ano.id))."

  # ---------- 7. Testes ----------
  Etapa 'Rodando testar-api.ps1 no banco de teste'
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'testar-api.ps1') -Api $api -SenhaGestor $SenhaTeste
  $codigo = $LASTEXITCODE
}
finally {
  # ---------- 8. Derrubar a API e restaurar as variáveis ----------
  if ($servidor) {
    cmd /c "taskkill /PID $($servidor.Id) /T /F >nul 2>&1"
    Write-Host "`nAPI de teste encerrada."
  }
  foreach ($n in $nomesEnv) { [Environment]::SetEnvironmentVariable($n, $envAntes[$n], 'Process') }
  Pop-Location

  # ---------- 9. SHA-256 do dev.db (depois) ----------
  if ($hashAntes) {
    $hashDepois = (Get-FileHash -LiteralPath $devDb -Algorithm SHA256).Hash
    Write-Host "dev.db depois: $hashDepois"
    if ($hashDepois -eq $hashAntes) {
      Write-Host 'dev.db intacto (SHA-256 igual).' -ForegroundColor Green
    } else {
      Write-Host 'ALERTA: o dev.db mudou durante o teste! Restaure a partir da cópia de segurança.' -ForegroundColor Red
      $codigo = 2
    }
  }
}

if ($codigo -eq 0) {
  Write-Host "`nTodos os testes passaram no banco de teste." -ForegroundColor Green
} elseif ($codigo -eq 1) {
  Write-Host "`nHá testes falhando. Veja as linhas [FALHOU] acima." -ForegroundColor Red
}
exit $codigo