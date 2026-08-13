#Requires -Version 5.1
<#
.SYNOPSIS
    First-time setup script for the Manga Rental System (RM_Project).

.DESCRIPTION
    Sets up .env, builds and starts backend + frontend + database via Docker Compose,
    runs migrations, optionally seeds sample data, and optionally creates an admin user.

.PARAMETER BackendPort
    Host port for the Django backend (default: 8000)

.PARAMETER FrontendPort
    Host port for the React frontend (default: 3000)

.PARAMETER PostgresPort
    Host port for PostgreSQL (default: 5433)

.PARAMETER SkipSeed
    Skip inserting sample manga data

.PARAMETER SkipSuperuser
    Skip the admin user creation step

.PARAMETER NoBuild
    Skip the --build flag (use existing images if available)

.PARAMETER CleanVolumes
    Remove existing Docker volumes before starting (use when re-cloning or resetting)

.EXAMPLE
    .\setup.ps1

.EXAMPLE
    .\setup.ps1 -BackendPort 8080 -FrontendPort 3001

.EXAMPLE
    .\setup.ps1 -CleanVolumes   # fresh reset, wipes database volume
#>

param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000,
    [int]$PostgresPort = 5433,
    [switch]$SkipSeed,
    [switch]$SkipSuperuser,
    [switch]$NoBuild,
    [switch]$CleanVolumes
)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot

# ==========================================
# Helpers
# ==========================================
function Write-Step   { param([string]$m); Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Success { param([string]$m); Write-Host "[OK] $m" -ForegroundColor Green }
function Write-Warn   { param([string]$m); Write-Host "[!] $m" -ForegroundColor Yellow }
function Write-Fail   { param([string]$m); Write-Host "[X] $m" -ForegroundColor Red; exit 1 }

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
    param([string[]]$CmdArgs)
    if ($script:useNewCompose) {
        & docker compose @CmdArgs
    } else {
        & docker-compose @CmdArgs
    }
}

# ==========================================
# 1. Check prerequisites
# ==========================================
Write-Step "Checking prerequisites..."

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fail "Docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
}

docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Docker is not running. Please start Docker Desktop and try again."
}

$script:useNewCompose = $false
docker compose version 2>&1 | Out-Null
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

$envPath     = Join-Path $scriptRoot ".env"
$envExample  = Join-Path $scriptRoot ".env.example"

if (-not (Test-Path $envPath)) {
    if (-not (Test-Path $envExample)) {
        Write-Fail ".env.example not found. Cannot create .env automatically."
    }
    Copy-Item $envExample $envPath
    $secretKey = New-RandomSecretKey
    (Get-Content $envPath) -replace 'SECRET_KEY=.*', "SECRET_KEY=$secretKey" | Set-Content $envPath
    Write-Success "Created .env with a generated SECRET_KEY"
    Write-Warn "Review .env and change POSTGRES_PASSWORD before deploying to production."
} else {
    Write-Success ".env already exists -- keeping current values"
}

# Apply port overrides
Set-EnvValue $envPath "BACKEND_PORT"      $BackendPort
Set-EnvValue $envPath "FRONTEND_PORT"     $FrontendPort
Set-EnvValue $envPath "POSTGRES_HOST_PORT" $PostgresPort
Set-EnvValue $envPath "VITE_API_BASE_URL" "http://localhost:$BackendPort"

Write-Success "Ports set -> backend:$BackendPort  frontend:$FrontendPort  postgres:$PostgresPort"

# ==========================================
# 3. Handle stale volumes (optional)
# ==========================================

# Auto-detect existing postgres volume even if -CleanVolumes wasn't passed
$volumeName = (Split-Path -Leaf $scriptRoot).ToLower() + "_postgres_data"
$volumeExists = docker volume ls --quiet | Where-Object { $_ -eq $volumeName }

if (-not $CleanVolumes -and $volumeExists) {
    Write-Warn "Existing database volume '$volumeName' detected."
    Write-Warn "If your .env password differs from the original setup, the container will fail to authenticate."
    Write-Host ""
    $answer = Read-Host "  Remove the old volume for a clean start? (y/N)"
    if ($answer -match '^[Yy]') {
        $CleanVolumes = $true
    }
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

if ($LASTEXITCODE -ne 0) { Write-Fail "docker compose up failed -- see output above." }
Write-Success "Containers started"

# ==========================================
# 5. Wait for database to be healthy
# ==========================================
Write-Step "Waiting for the database to become healthy..."

$maxWait = 90
$elapsed = 0
$healthy = $false
while ($elapsed -lt $maxWait) {
    $status = docker inspect --format='{{.State.Health.Status}}' manga_postgres 2>$null
    if ($status -eq "healthy") { $healthy = $true; break }
    Start-Sleep -Seconds 3
    $elapsed += 3
}

if ($healthy) {
    Write-Success "Database is healthy"
} else {
    Write-Fail "Database did not become healthy after ${maxWait}s. Run 'docker compose logs db_postgres' to investigate."
}

# ==========================================
# 6. Run migrations
# ==========================================
Write-Step "Running database migrations..."

Invoke-Compose @("exec", "-T", "backend", "python", "manage.py", "makemigrations")
if ($LASTEXITCODE -ne 0) { Write-Fail "makemigrations failed" }

Invoke-Compose @("exec", "-T", "backend", "python", "manage.py", "migrate")
if ($LASTEXITCODE -ne 0) { Write-Fail "migrate failed" }

Write-Success "Migrations applied"

# ==========================================
# 7. Seed sample data (optional)
# ==========================================
if (-not $SkipSeed) {
    Write-Step "Inserting sample manga data..."
    Invoke-Compose @("exec", "-T", "backend", "python", "seed.py")
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Sample data inserted"
    } else {
        Write-Warn "Seeding skipped or already done -- continuing."
    }
} else {
    Write-Warn "Skipped sample data seeding (-SkipSeed)"
}

# ==========================================
# 8. Create admin user (prompt in PowerShell,
#    pass via env vars + --noinput to avoid
#    TTY issues with docker exec)
# ==========================================
if (-not $SkipSuperuser) {
    Write-Step "Create an admin account"
    Write-Host "  Enter credentials for the admin user." -ForegroundColor Gray
    Write-Host ""

    do {
        $adminUser = Read-Host "  Username"
    } while ([string]::IsNullOrWhiteSpace($adminUser))

    $adminEmail = Read-Host "  Email (optional, press Enter to skip)"
    if ([string]::IsNullOrWhiteSpace($adminEmail)) { $adminEmail = "" }

    do {
        $adminPass1 = Read-Host "  Password" -AsSecureString
        $adminPass2 = Read-Host "  Confirm password" -AsSecureString
        $p1 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
                  [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPass1))
        $p2 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
                  [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPass2))
        if ($p1 -ne $p2) { Write-Warn "Passwords do not match -- try again." }
        if ($p1.Length -lt 8) { Write-Warn "Password must be at least 8 characters."; $p1 = "" }
    } while ($p1 -ne $p2 -or $p1.Length -lt 8)

    # Use DJANGO_SUPERUSER_* env vars + --noinput to avoid TTY requirement
    $createArgs = @(
        "exec", "-T",
        "-e", "DJANGO_SUPERUSER_USERNAME=$adminUser",
        "-e", "DJANGO_SUPERUSER_EMAIL=$adminEmail",
        "-e", "DJANGO_SUPERUSER_PASSWORD=$p1",
        "backend",
        "python", "manage.py", "createsuperuser", "--noinput"
    )
    Invoke-Compose $createArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Admin user '$adminUser' created"
    } else {
        Write-Warn "Admin creation failed (user may already exist). Create manually:"
        Write-Host "    $composeLabel exec backend python manage.py createsuperuser" -ForegroundColor Gray
    }
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
Write-Host "  Frontend (React UI):   http://localhost:$FrontendPort" -ForegroundColor White
Write-Host "  Backend API:           http://localhost:$BackendPort/api/" -ForegroundColor White
Write-Host "  Django Admin Panel:    http://localhost:$BackendPort/admin/" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  Stop all:              $composeLabel down"
Write-Host "  Stop + wipe DB:        $composeLabel down --volumes"
Write-Host "  View logs:             $composeLabel logs -f"
Write-Host "  Restart backend:       $composeLabel restart backend"
Write-Host "  Create admin later:    $composeLabel exec backend python manage.py createsuperuser"
Write-Host ""
