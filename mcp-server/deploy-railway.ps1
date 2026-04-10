# Deploy this directory (mcp-server) to Railway using a project token (non-interactive).
#
# 1) Railway dashboard → your project → Settings → Tokens → New project token
# 2) In PowerShell (same session as this script):
#    $env:RAILWAY_TOKEN = "your-token-here"
# 3) Optional overrides:
#    $env:RAILWAY_PROJECT_ID = "..."   # default: memforme project from docs
#    $env:RAILWAY_ENVIRONMENT = "production"
#    $env:RAILWAY_SERVICE = "mcp-server"   # default; override if your Railway service name differs
#
# 4) Run: .\deploy-railway.ps1

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not $env:RAILWAY_TOKEN -or $env:RAILWAY_TOKEN.Trim().Length -eq 0) {
  Write-Host ""
  Write-Host "RAILWAY_TOKEN is not set." -ForegroundColor Yellow
  Write-Host "Create a project token: Railway - Project - Settings - Tokens - New Token"
  Write-Host "Then run:  `$env:RAILWAY_TOKEN = '...' ; .\deploy-railway.ps1"
  Write-Host ""
  exit 1
}

$projectId = if ($env:RAILWAY_PROJECT_ID) { $env:RAILWAY_PROJECT_ID } else { '8918b87f-d79a-4382-b951-3c6a0d8bf6d3' }
$environment = if ($env:RAILWAY_ENVIRONMENT) { $env:RAILWAY_ENVIRONMENT } else { 'production' }

$service = if ($env:RAILWAY_SERVICE -and $env:RAILWAY_SERVICE.Trim().Length -gt 0) {
  $env:RAILWAY_SERVICE.Trim()
} else {
  'mcp-server'
}
$args = @('up', '-d', '--ci', '-p', $projectId, '-e', $environment, '-s', $service)

Write-Host "Deploying mcp-server to Railway (project $projectId, env $environment, service $service)..." -ForegroundColor Cyan
& railway @args
exit $LASTEXITCODE
