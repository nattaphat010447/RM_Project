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
    Skip the interactive admin user creation step

.PARAMETER NoBuild
    Skip the --build flag (use existing images if available)

.EXAMPLE
    .\setup.ps1

.EXAMPLE
    .\setup.ps1 -BackendPort 8080 -FrontendPort 3001

.EXAMPLE
    .\setup.ps1 -SkipSeed -SkipSuperuser
#>

param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000,
    [int]$PostgresPort = 5433,
    [switch]$SkipSeed,
    [switch]$SkipSuperuser,
    [switch]$NoBuild
)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

function Write-ErrorAndExit {
    param([string]$Message)
    Write-Host "[X] $Message" -ForegroundColor Red
    exit 1
}

function New-RandomSecretKey {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%^&*(-_=+)'
    $bytes = New-Object byte[] 50
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

# ==========================================
# 1. Check prerequisites
# ==========================================
Write-Step "Checking prerequisites..."

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-ErrorAndExit "Docker is not installed or not on PATH. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
}

try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorAndExit "Docker is installed but not running. Please start Docker Desktop and try again."
    }
} catch {
    Write-ErrorAndExit "Could not reach the Docker daemon. Please start Docker Desktop and try again."
}

$composeCmd = $null
if (Get-Command "docker-compose" -ErrorAction SilentlyContinue) {
    $composeCmd = "docker-compose"
} else {
    docker compose version > $null 2>&1
    if ($LASTEXITCODE -eq 0) {
        $composeCmd = "docker compose"
    }
}
if (-not $composeCmd) {
    Write-ErrorAndExit "Docker Compose was not found. Install Docker Desktop (includes Compose) and try again."
}

Write-Success "Docker is installed and running ($composeCmd)"

# ==========================================
# 2. Create .env if missing
# ==========================================
Write-Step "Checking environment configuration..."

$envPath = Join-Path $scriptRoot ".env"
$envExamplePath = Join-Path $scriptRoot ".env.example"

if (-not (Test-Path $envPath)) {
    if (-not (Test-Path $envExamplePath)) {
        Write-ErrorAndExit ".env.example not found. Cannot create .env automatically."
    }

    Copy-Item $envExamplePath $envPath
    Write-Success "Created .env from .env.example"

    # Auto-generate a random SECRET_KEY instead of leaving the placeholder
    $secretKey = New-RandomSecretKey
    (Get-Content $envPath) -replace 'SECRET_KEY=.*', "SECRET_KEY=$secretKey" | Set-Content $envPath
    Write-Success "Generated a random SECRET_KEY"

    Write-Warn "Review .env and adjust POSTGRES_PASSWORD before using this in production."
} else {
    Write-Success ".env already exists, keeping current values"
}

# Apply port overrides to .env (append/replace BACKEND_PORT, FRONTEND_PORT, POSTGRES_HOST_PORT)
function Set-EnvValue {
    param([string]$Path, [string]$Key, [string]$Value)

    $content = Get-Content $Path -ErrorAction SilentlyContinue
    if ($null -eq $content) { $content = @() }

    $pattern = "^$Key="
    if ($content -match $pattern) {
        $content = $content -replace "$pattern.*", "$Key=$Value"
    } else {
        $content += "$Key=$Value"
    }
    Set-Content -Path $Path -Value $content
}

Set-EnvValue -Path $envPath -Key "BACKEND_PORT" -Value $BackendPort
Set-EnvValue -Path $envPath -Key "FRONTEND_PORT" -Value $FrontendPort
Set-EnvValue -Path $envPath -Key "POSTGRES_HOST_PORT" -Value $PostgresPort
Set-EnvValue -Path $envPath -Key "VITE_API_BASE_URL" -Value "http://localhost:$BackendPort"

Write-Success "Ports configured -> backend:$BackendPort frontend:$FrontendPort postgres:$PostgresPort"

# ==========================================
# 3. Build and start containers
# ==========================================
Write-Step "Building and starting containers (this may take a few minutes on first run)..."

$upArgs = @("up", "-d")
if (-not $NoBuild) { $upArgs += "--build" }

if ($composeCmd -eq "docker-compose") {
    & docker-compose @upArgs
} else {
    & docker compose @upArgs
}

if ($LASTEXITCODE -ne 0) {
    Write-ErrorAndExit "docker compose up failed. Check the output above for details."
}

Write-Success "Containers started"

# ==========================================
# 4. Wait for the database to be healthy
# ==========================================
Write-Step "Waiting for the database to become healthy..."

$maxWaitSeconds = 60
$elapsed = 0
$healthy = $false

while ($elapsed -lt $maxWaitSeconds) {
    $status = docker inspect --format='{{.State.Health.Status}}' manga_postgres 2>$null
    if ($status -eq "healthy") {
        $healthy = $true
        break
    }
    Start-Sleep -Seconds 2
    $elapsed += 2
}

if ($healthy) {
    Write-Success "Database is healthy"
} else {
    Write-Warn "Database health check timed out after ${maxWaitSeconds}s, continuing anyway..."
}

# ==========================================
# 5. Run migrations
# ==========================================
Write-Step "Running database migrations..."

function Invoke-Compose {
    param([string[]]$Args)
    if ($composeCmd -eq "docker-compose") {
        & docker-compose @Args
    } else {
        & docker compose @Args
    }
}

Invoke-Compose @("exec", "-T", "backend", "python", "manage.py", "makemigrations")
if ($LASTEXITCODE -ne 0) { Write-ErrorAndExit "makemigrations failed" }

Invoke-Compose @("exec", "-T", "backend", "python", "manage.py", "migrate")
if ($LASTEXITCODE -ne 0) { Write-ErrorAndExit "migrate failed" }

Write-Success "Migrations applied"

# ==========================================
# 6. Seed sample data (optional)
# ==========================================
if (-not $SkipSeed) {
    Write-Step "Inserting sample manga data..."
    Invoke-Compose @("exec", "-T", "backend", "python", "seed.py")
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Sample data inserted"
    } else {
        Write-Warn "Seeding failed or data already exists, continuing anyway..."
    }
} else {
    Write-Warn "Skipped sample data seeding (-SkipSeed)"
}

# ==========================================
# 7. Create admin user (optional, interactive)
# ==========================================
if (-not $SkipSuperuser) {
    Write-Step "Create an admin (superuser) account"
    Write-Host "You will be prompted for a username, email, and password." -ForegroundColor Gray

    if ($composeCmd -eq "docker-compose") {
        & docker-compose exec backend python manage.py createsuperuser
    } else {
        & docker compose exec backend python manage.py createsuperuser
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Superuser creation was skipped or failed. You can create one later with:"
        Write-Host "    $composeCmd exec backend python manage.py createsuperuser" -ForegroundColor Gray
    } else {
        Write-Success "Admin user created"
    }
} else {
    Write-Warn "Skipped admin user creation (-SkipSuperuser)"
}

# ==========================================
# 8. Done — print links
# ==========================================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " Setup complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host " Frontend (React UI):     http://localhost:$FrontendPort" -ForegroundColor White
Write-Host " Backend API (Django):    http://localhost:$BackendPort/api/" -ForegroundColor White
Write-Host " Django Admin Panel:      http://localhost:$BackendPort/admin/" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  Stop everything:        $composeCmd down"
Write-Host "  View logs:              $composeCmd logs -f"
Write-Host "  Restart backend only:   $composeCmd restart backend"
Write-Host "  Create admin later:     $composeCmd exec backend python manage.py createsuperuser"
Write-Host ""
