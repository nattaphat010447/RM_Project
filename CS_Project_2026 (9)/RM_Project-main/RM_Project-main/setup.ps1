#Requires -Version 5.1
<#
.SYNOPSIS
    First-time setup script for the Manga Rental System (Docker).

.PARAMETER BackendPort
    Host port for the Django backend (default: 8000)

.PARAMETER FrontendPort
    Host port for the React frontend (default: 3000)

.PARAMETER PostgresPort
    Host port for PostgreSQL (default: 5433)

.PARAMETER SkipSeed
    Skip inserting sample manga data

.PARAMETER SkipSuperuser
    Skip admin user creation (creates admin01/123456789 by default)

.PARAMETER NoBuild
    Skip the --build flag (use existing images if available)

.PARAMETER CleanVolumes
    Remove existing Docker volumes before starting (fresh reset)

.EXAMPLE
    .\setup.ps1

.EXAMPLE
    .\setup.ps1 -CleanVolumes   # fresh reset, wipes database volume
#>

param(
    [int]$BackendPort    = 8000,
    [int]$FrontendPort   = 3000,
    [int]$PostgresPort   = 5433,
    [switch]$SkipSeed,
    [switch]$SkipSuperuser,
    [switch]$NoBuild,
    [switch]$CleanVolumes
)

$ErrorActionPreference = 'Stop'
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ROOT

# ==========================================
# Helpers
# ==========================================
function Write-Step    { param([string]$m); Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Success { param([string]$m); Write-Host "  [OK] $m" -ForegroundColor Green }
function Write-Warn    { param([string]$m); Write-Host "  [!]  $m" -ForegroundColor Yellow }
function Write-Fail    { param([string]$m); Write-Host "  [X]  $m" -ForegroundColor Red; exit 1 }

function New-RandomSecretKey {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%^&*(-_=+)'
    $bytes = New-Object byte[] 50
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

function Set-EnvValue {
    param([string]$Path, [string]$Key, [string]$Value)
    $content = Get-Content $Path -ErrorAction SilentlyContinue
    if ($null -eq $content) { $content = @() }
    if ($content -match "^$Key=") {
        $content = $content -replace "^$Key=.*", "$Key=$Value"
    } else {
        $content += "$Key=$Value"
    }
    Set-Content -Path $Path -Value $content
}

function Invoke-Compose {
    param([string[]]$CmdArgs, [string]$StdinInput = $null)
    if ($StdinInput -ne $null) {
        if ($script:useNewCompose) { $StdinInput | & docker compose @CmdArgs }
        else                       { $StdinInput | & docker-compose @CmdArgs }
    } elseif ($script:useNewCompose) { & docker compose @CmdArgs }
    else                             { & docker-compose @CmdArgs }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Manga Rental System - Docker Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# ==========================================
# 1. Check prerequisites
# ==========================================
Write-Step "Checking prerequisites..."

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fail "Docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
}

$savedPref = $ErrorActionPreference
$ErrorActionPreference = "Continue"
docker info 2>&1 | Out-Null
$ErrorActionPreference = $savedPref
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Docker is not running. Please start Docker Desktop and try again."
}

$script:useNewCompose = $false
$ErrorActionPreference = "Continue"
docker compose version 2>&1 | Out-Null
$ErrorActionPreference = $savedPref
if ($LASTEXITCODE -eq 0) {
    $script:useNewCompose = $true
} elseif (-not (Get-Command "docker-compose" -ErrorAction SilentlyContinue)) {
    Write-Fail "Docker Compose not found. Install Docker Desktop and try again."
}

$composeLabel = if ($script:useNewCompose) { "docker compose" } else { "docker-compose" }
Write-Success "Docker is running ($composeLabel)"

# ==========================================
# 2. Configure .env
# ==========================================
Write-Step "Checking environment configuration..."

$envPath    = Join-Path $ROOT ".env"
$envExample = Join-Path $ROOT ".env.example"

if (-not (Test-Path $envPath)) {
    if (-not (Test-Path $envExample)) {
        Write-Fail ".env.example not found. Cannot create .env automatically."
    }
    Copy-Item $envExample $envPath
    $secretKey = New-RandomSecretKey
    (Get-Content $envPath) -replace 'SECRET_KEY=.*', "SECRET_KEY=$secretKey" | Set-Content $envPath
    Write-Success "Created .env with a generated SECRET_KEY"
    Write-Warn "Review .env and update POSTGRES_PASSWORD before deploying to production."
} else {
    Write-Success ".env already exists - keeping current values"
}

Set-EnvValue $envPath "BACKEND_PORT"       $BackendPort
Set-EnvValue $envPath "FRONTEND_PORT"      $FrontendPort
Set-EnvValue $envPath "POSTGRES_HOST_PORT" $PostgresPort
Set-EnvValue $envPath "VITE_API_BASE_URL"  "http://localhost:$BackendPort"

Write-Success "Ports - backend:$BackendPort  frontend:$FrontendPort  postgres:$PostgresPort"

# ==========================================
# 3. Handle stale volumes
# ==========================================
$volumeName   = "rm_project_postgres_data"
$savedPref    = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$volumeExists = docker volume ls --quiet 2>&1 | Where-Object { $_ -eq $volumeName }
$ErrorActionPreference = $savedPref

if (-not $CleanVolumes -and $volumeExists) {
    Write-Warn "Existing database volume '$volumeName' detected."
    Write-Warn "If your .env password differs from the original setup, the container may fail to start."
    Write-Host ""
    $answer = Read-Host "  Remove the old volume for a clean start? (y/N)"
    if ($answer -match '^[Yy]') { $CleanVolumes = $true }
}

if ($CleanVolumes) {
    Write-Step "Removing existing containers and volumes..."
    Invoke-Compose @("down", "--volumes", "--remove-orphans")
    Write-Success "Old containers and volumes removed"
}

# ==========================================
# 4. Build and start containers
# ==========================================
Write-Step "Building and starting containers (first run may take a few minutes)..."

$upArgs = @("up", "-d")
if (-not $NoBuild) { $upArgs += "--build" }
Invoke-Compose $upArgs
if ($LASTEXITCODE -ne 0) { Write-Fail "docker compose up failed - see output above." }
Write-Success "Containers started"

# ==========================================
# 5. Wait for database to be healthy
# ==========================================
Write-Step "Waiting for the database to become healthy..."

$maxWait = 90
$elapsed = 0
$healthy = $false
while ($elapsed -lt $maxWait) {
    $savedPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $status = docker inspect --format='{{.State.Health.Status}}' manga_postgres 2>$null
    $ErrorActionPreference = $savedPref
    if ($status -eq "healthy") { $healthy = $true; break }
    Write-Host "  Waiting... ($elapsed/$maxWait s)" -ForegroundColor Gray
    Start-Sleep -Seconds 3
    $elapsed += 3
}

if ($healthy) { Write-Success "Database is healthy" }
else { Write-Fail "Database did not become healthy after ${maxWait}s. Run '$composeLabel logs db_postgres' to investigate." }

# ==========================================
# 5b. Wait for backend to be ready (HTTP)
# ==========================================
Write-Step "Waiting for backend to be ready..."

# entrypoint.sh runs 'migrate' then starts runserver — we poll HTTP so we
# know migrations are done before we attempt seed/superuser steps.
$maxWaitBackend = 180
$elapsed = 0
$backendReady = $false
while ($elapsed -lt $maxWaitBackend) {
    $savedPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/" `
                    -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        $backendReady = $true
    } catch {
        # Any HTTP response (4xx/5xx) still means Django is serving
        if ($null -ne $_.Exception.Response) { $backendReady = $true }
    }
    $ErrorActionPreference = $savedPref
    if ($backendReady) { break }
    Write-Host "  Waiting for HTTP... ($elapsed/$maxWaitBackend s)" -ForegroundColor Gray
    Start-Sleep -Seconds 3
    $elapsed += 3
}

if ($backendReady) { Write-Success "Backend is ready" }
else { Write-Warn "Backend readiness check timed out - proceeding anyway..." }

# ==========================================
# 6. Verify migrations (entrypoint.sh already ran them)
# ==========================================
Write-Step "Verifying database migrations..."

Invoke-Compose @("exec", "-T", "backend", "python", "manage.py", "showmigrations", "--list")
Write-Success "Migrations verified"

# ==========================================
# 7. Seed data
# ==========================================
if (-not $SkipSeed) {
    Write-Step "Seeding manga data..."

    Invoke-Compose @("exec", "-T", "backend", "python", "seed.py")
    if ($LASTEXITCODE -eq 0) { Write-Success "seed.py done" }
    else { Write-Warn "seed.py failed or already seeded - continuing." }

    Invoke-Compose @("exec", "-T", "backend", "python", "seed_manga_from_anilist.py")
    if ($LASTEXITCODE -eq 0) { Write-Success "seed_manga_from_anilist.py done" }
    else { Write-Warn "AniList seed failed or already seeded - continuing." }

    Write-Step "Seeding example_user01 (runs after manga data is ready)..."
    Invoke-Compose @("exec", "-T", "backend", "python", "manage.py", "seed_example_user")
    if ($LASTEXITCODE -eq 0) { Write-Success "example_user01 seeded with preferences and rental history" }
    else { Write-Warn "seed_example_user failed or already seeded - continuing." }
} else {
    Write-Warn "Skipped seeding (-SkipSeed)"
}

# ==========================================
# 8. Create admin user
# ==========================================
if (-not $SkipSuperuser) {
    Write-Step "Creating Django admin user..."
    Write-Host "  Username: admin01" -ForegroundColor Gray
    Write-Host "  Password: 123456789" -ForegroundColor Gray

    # Use double quotes outside, single quotes inside for Python
    $pythonScript = "import sys,os;os.environ.setdefault('DJANGO_SETTINGS_MODULE','core.settings');import django;django.setup();from django.contrib.auth import get_user_model;User=get_user_model();User.objects.create_superuser('admin01','admin@example.com','123456789') if not User.objects.filter(username='admin01').exists() else None;print('OK')"

    Invoke-Compose @("exec", "-T", "backend", "python", "-c", $pythonScript)

    if ($LASTEXITCODE -eq 0) { Write-Success "Admin user ready (admin01 / 123456789)" }
    else { Write-Warn "Admin creation failed. Create manually: $composeLabel exec backend python manage.py createsuperuser" }
} else {
    Write-Warn "Skipped admin user creation (-SkipSuperuser)"
}

# ==========================================
# 9. Done
# ==========================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " Setup complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:   http://localhost:$FrontendPort" -ForegroundColor White
Write-Host "  Backend:    http://localhost:$BackendPort/api/" -ForegroundColor White
Write-Host "  Admin:      http://localhost:$BackendPort/admin/" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  Stop all:       $composeLabel down"
Write-Host "  Stop + wipe DB: $composeLabel down --volumes"
Write-Host "  View logs:      $composeLabel logs -f"
Write-Host "  Restart:        $composeLabel restart backend"
Write-Host ""
