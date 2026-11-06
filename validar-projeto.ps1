#requires -Version 5.1
<#
    validar-projeto.ps1 - validacao final do SKOLLA

    Executa, em processos separados e sem parar no primeiro erro:
      1. TypeScript do frontend  (npm run typecheck)
      2. Build do frontend       (npm run build)
      3. API integrada           (backend/scripts/testar-com-banco-teste.ps1, banco de teste)

    O resultado de cada etapa vem SOMENTE do codigo de saida real do processo.
    Texto em stderr (avisos do Vite, "Loaded Prisma config...", codigos ANSI) nao e falha.

    Uso, na raiz do repositorio:
        powershell -NoProfile -ExecutionPolicy Bypass -File .\validar-projeto.ps1

    Salve este arquivo em UTF-8 COM BOM (o Windows PowerShell 5.1 precisa disso para os acentos).
#>
[CmdletBinding()]
param(
    [int]$TimeoutMinutos = 15,

    # Pasta de trabalho do script de testes da API (relativa a raiz). Ajuste se o script esperar outra.
    [string]$PastaTestesApi = 'backend',

    # Regras para contar verificacoes no log da API. Ajuste ao formato que o testar-api.ps1 imprime.
    [string]$RegexAprovado  = '(?mi)^\s*\[?\s*(OK|PASSOU|PASS)\s*\]?(\s|:|-|$)',
    [string]$RegexReprovado = '(?mi)^\s*\[?\s*(FALHA|FALHOU|FAIL|ERRO)\s*\]?(\s|:|-|$)'
)

# Nunca 'Stop': com 'Stop', o PowerShell 5.1 transforma a primeira linha de stderr
# de um programa externo em excecao (NativeCommandError). Essa era a causa do "999".
$ErrorActionPreference = 'Continue'

$raiz      = $PSScriptRoot
$frontend  = Join-Path $raiz 'frontend'
$backend   = Join-Path $raiz 'backend'
$relatorio = Join-Path $raiz 'relatorio-validacao.txt'
$scriptApi = Join-Path $backend 'scripts\testar-com-banco-teste.ps1'
$hostPs    = (Get-Process -Id $PID).Path      # powershell.exe ou pwsh.exe, o mesmo que esta rodando

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ('skolla-validacao-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

# ESC [ ... letra  -> remove cores/cursor ANSI do texto registrado
$regexAnsi = [regex]::new([string][char]27 + '\[[0-9;?]*[ -/]*[@-~]')
function Remove-Ansi([string]$texto) {
    if ([string]::IsNullOrEmpty($texto)) { return '' }
    return $regexAnsi.Replace($texto, '')
}

function Read-Arquivo([string]$caminho) {
    if (Test-Path -LiteralPath $caminho) {
        $t = [System.IO.File]::ReadAllText($caminho)
        if ($null -ne $t) { return $t }
    }
    return ''
}

function Get-HashDevDb {
    # So leitura: confere se algum dev.db mudou durante os testes.
    $candidatos = @(
        (Join-Path $backend 'dev.db'),
        (Join-Path $backend 'prisma\dev.db')
    ) | Where-Object { Test-Path -LiteralPath $_ }

    $hashes = [ordered]@{}
    foreach ($c in $candidatos) {
        try   { $hashes[$c] = (Get-FileHash -LiteralPath $c -Algorithm SHA256).Hash }
        catch { $hashes[$c] = "ERRO AO LER: $($_.Exception.Message)" }
    }
    return $hashes
}

function Invoke-Etapa {
    param(
        [string]$Nome,
        [string]$Executavel,
        [string]$Argumentos,          # string unica, ja com aspas onde precisa
        [string]$Pasta,
        [string[]]$PreRequisitos = @()
    )

    $r = [ordered]@{
        Nome     = $Nome
        Status   = 'NÃO EXECUTADO'
        Codigo   = $null
        Motivo   = ''
        Comando  = "$Executavel $Argumentos"
        Pasta    = $Pasta
        Duracao  = ''
        Stdout   = ''
        Stderr   = ''
    }

    foreach ($p in (@($Pasta) + $PreRequisitos)) {
        if (-not (Test-Path -LiteralPath $p)) {
            $r.Motivo = "Pré-requisito não encontrado: $p"
            return [pscustomobject]$r
        }
    }

    $cmd = Get-Command $Executavel -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $cmd) {
        $r.Motivo = "Comando não encontrado no PATH: $Executavel"
        return [pscustomobject]$r
    }

    $id  = [guid]::NewGuid().ToString('N')
    $out = Join-Path $tmp "$id.stdout.txt"
    $err = Join-Path $tmp "$id.stderr.txt"
    $cronometro = [System.Diagnostics.Stopwatch]::StartNew()

    try {
        # Processo separado com stdout e stderr redirecionados para arquivos pelo sistema operacional:
        # nada passa pelo fluxo de erros do PowerShell, e o ExitCode e o real.
        $proc = Start-Process -FilePath $cmd.Source -ArgumentList $Argumentos -WorkingDirectory $Pasta `
                    -NoNewWindow -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
        $null = $proc.Handle   # sem isso, o ExitCode pode vir vazio (comportamento conhecido do Start-Process)

        if (-not $proc.WaitForExit($TimeoutMinutos * 60 * 1000)) {
            & taskkill.exe /PID $proc.Id /T /F 2>&1 | Out-Null
            $proc.WaitForExit()
            $r.Status = 'FALHOU'
            $r.Motivo = "Tempo limite de $TimeoutMinutos min excedido; processo encerrado."
        }
        else {
            $proc.WaitForExit()   # garante que os arquivos de saida foram gravados
            $r.Codigo = $proc.ExitCode
            if ($proc.ExitCode -eq 0) { $r.Status = 'PASSOU' }
            else                      { $r.Status = 'FALHOU'; $r.Motivo = "Código de saída $($proc.ExitCode)." }
        }
    }
    catch {
        $r.Status = 'NÃO EXECUTADO'
        $r.Motivo = "Não foi possível iniciar o processo: $($_.Exception.Message)"
    }
    finally {
        $cronometro.Stop()
        $r.Duracao = '{0:N1} s' -f $cronometro.Elapsed.TotalSeconds
        $r.Stdout  = Remove-Ansi (Read-Arquivo $out)
        $r.Stderr  = Remove-Ansi (Read-Arquivo $err)
    }

    return [pscustomobject]$r
}

# Sem cores na saida dos processos filhos (o log fica limpo).
$envAnterior = @{ NO_COLOR = $env:NO_COLOR; FORCE_COLOR = $env:FORCE_COLOR; CI = $env:CI }
$env:NO_COLOR = '1'; $env:FORCE_COLOR = '0'; $env:CI = 'true'

$resultados = @()
$devDbAntes = $null
$devDbDepois = $null
$contagem = $null

try {
    Write-Host '1/3 TypeScript (frontend)...'
    $resultados += Invoke-Etapa -Nome 'TypeScript (frontend)' -Executavel 'npm.cmd' -Argumentos 'run typecheck' `
                        -Pasta $frontend -PreRequisitos @((Join-Path $frontend 'package.json'), (Join-Path $frontend 'node_modules'))

    Write-Host '2/3 Build Vite (frontend)...'
    $resultados += Invoke-Etapa -Nome 'Build Vite (frontend)' -Executavel 'npm.cmd' -Argumentos 'run build' `
                        -Pasta $frontend -PreRequisitos @((Join-Path $frontend 'package.json'), (Join-Path $frontend 'node_modules'))

    Write-Host '3/3 API integrada (banco de teste)...'
    # Dependencias do back-end: em backend\node_modules ou, com npm workspaces, em node_modules na raiz.
    $nodeModulesApi = @((Join-Path $backend 'node_modules'), (Join-Path $raiz 'node_modules')) |
                          Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $nodeModulesApi) { $nodeModulesApi = Join-Path $backend 'node_modules' }   # gera o NAO EXECUTADO com o caminho esperado

    $devDbAntes = Get-HashDevDb
    $api = Invoke-Etapa -Nome 'API integrada (banco de teste)' -Executavel $hostPs `
                -Argumentos ('-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $scriptApi) `
                -Pasta (Join-Path $raiz $PastaTestesApi) -PreRequisitos @($scriptApi, $nodeModulesApi)
    if ($api.Status -eq 'NÃO EXECUTADO' -and $api.Motivo -like '*node_modules*') {
        $api.Motivo += ' Rode "npm install" dentro de backend (não altera o dev.db).'
    }
    $devDbDepois = Get-HashDevDb

    # Protecao extra: se algum dev.db mudou, a etapa falha, mesmo com codigo 0.
    foreach ($k in $devDbAntes.Keys) {
        if ($devDbDepois[$k] -ne $devDbAntes[$k]) {
            $api.Status = 'FALHOU'
            $api.Motivo = (($api.Motivo + " dev.db ALTERADO durante os testes: $k").Trim())
        }
    }

    if ($api.Status -ne 'NÃO EXECUTADO') {
        $logApi = $api.Stdout + "`n" + $api.Stderr
        # Linha final do testar-api.ps1: "Resultado: X passaram, Y falharam."
        $mResumo = [regex]::Match($logApi, 'Resultado:\s*(\d+)\s*passaram,\s*(\d+)\s*falharam')
        $aprov  = ([regex]::Matches($logApi, '(?m)^\s*\[PASSOU\]')).Count
        $reprov = ([regex]::Matches($logApi, '(?m)^\s*\[FALHOU\]')).Count
        if ($mResumo.Success) { $contagem = "$($mResumo.Groups[1].Value) aprovadas, $($mResumo.Groups[2].Value) reprovadas" }
        elseif (($aprov + $reprov) -gt 0) { $contagem = "$aprov aprovadas, $reprov reprovadas (contadas pelas linhas)" }
        else { $contagem = 'não identificada (os testes não chegaram a rodar; veja o log da etapa)' }
    }
    $resultados += $api
}
finally {
    foreach ($k in $envAnterior.Keys) { Set-Item -Path "env:$k" -Value $envAnterior[$k] -ErrorAction SilentlyContinue }
    if ($null -eq $envAnterior.NO_COLOR)    { Remove-Item env:NO_COLOR    -ErrorAction SilentlyContinue }
    if ($null -eq $envAnterior.FORCE_COLOR) { Remove-Item env:FORCE_COLOR -ErrorAction SilentlyContinue }
    if ($null -eq $envAnterior.CI)          { Remove-Item env:CI          -ErrorAction SilentlyContinue }
}

# ---------- Relatorio ----------
$sb = New-Object System.Text.StringBuilder
$linha = '=' * 78
$nodeVersao = (& node --version 2>$null)
[void]$sb.AppendLine('RELATÓRIO DE VALIDAÇÃO - SKOLLA')
[void]$sb.AppendLine("Data: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')")
[void]$sb.AppendLine("PowerShell: $($PSVersionTable.PSVersion)   Node: $nodeVersao")
[void]$sb.AppendLine("Raiz: $raiz")
[void]$sb.AppendLine('')
[void]$sb.AppendLine('RESUMO')
foreach ($r in $resultados) {
    $cod = if ($null -ne $r.Codigo) { " (código $($r.Codigo))" } else { '' }
    [void]$sb.AppendLine(('  {0,-34} {1}{2}' -f ($r.Nome + ':'), $r.Status, $cod))
}
if ($contagem) { [void]$sb.AppendLine("  Verificações da API: $contagem") }
if ($devDbAntes) {
    [void]$sb.AppendLine('  dev.db (SHA-256 antes -> depois):')
    if ($devDbAntes.Count -eq 0) { [void]$sb.AppendLine('    nenhum dev.db encontrado em backend\ ou backend\prisma\') }
    foreach ($k in $devDbAntes.Keys) {
        $igual = if ($devDbAntes[$k] -eq $devDbDepois[$k]) { 'INTACTO' } else { 'ALTERADO' }
        [void]$sb.AppendLine("    $k : $igual")
    }
}

foreach ($r in $resultados) {
    [void]$sb.AppendLine('')
    [void]$sb.AppendLine($linha)
    [void]$sb.AppendLine("ETAPA: $($r.Nome)")
    [void]$sb.AppendLine("Status: $($r.Status)")
    [void]$sb.AppendLine("Código de saída: $(if ($null -ne $r.Codigo) { $r.Codigo } else { '-' })")
    [void]$sb.AppendLine("Comando: $($r.Comando)")
    [void]$sb.AppendLine("Pasta: $($r.Pasta)")
    [void]$sb.AppendLine("Duração: $($r.Duracao)")
    if ($r.Motivo) { [void]$sb.AppendLine("Motivo: $($r.Motivo)") }
    [void]$sb.AppendLine('--- stdout ---')
    [void]$sb.AppendLine($r.Stdout.TrimEnd())
    [void]$sb.AppendLine('--- stderr (avisos aqui não significam falha) ---')
    [void]$sb.AppendLine($r.Stderr.TrimEnd())
}

[System.IO.File]::WriteAllText($relatorio, $sb.ToString(), (New-Object System.Text.UTF8Encoding($true)))
Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue

# ---------- Console ----------
Write-Host ''
foreach ($r in $resultados) {
    $cor = switch ($r.Status) { 'PASSOU' { 'Green' } 'FALHOU' { 'Red' } default { 'Yellow' } }
    $extra = if ($r.Status -ne 'PASSOU' -and $r.Motivo) { "  - $($r.Motivo)" } else { '' }
    Write-Host ('{0,-34} {1}{2}' -f ($r.Nome + ':'), $r.Status, $extra) -ForegroundColor $cor
}
if ($contagem) { Write-Host "Verificações da API: $contagem" }
Write-Host "Relatório completo: $relatorio"

$todasPassaram = @($resultados | Where-Object { $_.Status -ne 'PASSOU' }).Count -eq 0
if ($todasPassaram) { exit 0 } else { exit 1 }