#Requires -Version 5.1
<#
.SYNOPSIS
    Local setup script for the Manga Rental System (no Docker required).

.DESCRIPTION
    Sets up the project to run locally:
    - Checks for Python, Node.js, and PostgreSQL
    - Creates Python virtual environment
    - Installs backend dependencies
    - Installs frontend dependencies
    - Sets up .env files
    - Runs migrations
    - Optionally seeds sample data
    - Starts backend and frontend servers

.PARAMETER SkipSeed
    Skip inserting sample manga data

.PARAMETER SkipSuperuser
    Skip the admin user creation step

.PARAMETER BackendPort
    Port for Django backend (default: 8000)

.PARAMETER FrontendPort
    Port for React frontend (default: 3000)

.EXAMPLE
    .\setup_local.ps1

.EXAMPLE
    .\setup_local.ps1 -SkipSeed -BackendPort 8080
#>

[CmdletBinding()]
param(
    [switch]$SkipSeed,
    [switch]$SkipSuperuser,
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000,
    [string]$PgPassword = "postgres",
    [string]$PgUser = "postgres"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Manga Rental System - Local Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "==> Checking prerequisites..." -ForegroundColor Yellow

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  [OK] Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Python not found. Please install Python 3.8+ from https://www.python.org/" -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Host "  [OK] Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check PostgreSQL
$pgInstalled = $false
try {
    $pgVersion = & psql --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] PostgreSQL: $pgVersion" -ForegroundColor Green
        $pgInstalled = $true
    }
} catch {
    # PostgreSQL not found
}

if (-not $pgInstalled) {
    Write-Host "  [WARNING] PostgreSQL not found" -ForegroundColor Yellow

    # Ask user if they want to install PostgreSQL
    $installPG = Read-Host "  Do you want to install PostgreSQL automatically via Chocolatey? (y/n)"

    if ($installPG -eq 'y' -or $installPG -eq 'Y') {
        Write-Host ""
        Write-Host "==> Installing PostgreSQL..." -ForegroundColor Yellow

        # Check if Chocolatey is installed
        try {
            & choco --version 2>&1 | Out-Null
        } catch {
            Write-Host "  Installing Chocolatey package manager..." -ForegroundColor Cyan
            Set-ExecutionPolicy Bypass -Scope Process -Force
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
            Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

            # Refresh environment variables
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        }

        # Install PostgreSQL
        Write-Host "  Installing PostgreSQL 16 (this may take a few minutes)..." -ForegroundColor Cyan
        choco install postgresql16 --params '/Password:postgres' -y

        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

        Write-Host "  [OK] PostgreSQL installed" -ForegroundColor Green
        $pgInstalled = $true

        # Wait for PostgreSQL to start
        Write-Host "  Waiting for PostgreSQL service to start..." -ForegroundColor Cyan
        Start-Sleep -Seconds 10
    } else {
        Write-Host "  [WARNING] Please install PostgreSQL manually from https://www.postgresql.org/download/" -ForegroundColor Yellow
        Write-Host "  After installation, create a database named 'manga_rental' and update backend/.env with credentials" -ForegroundColor Yellow
    }
}

# Setup backend
Write-Host ""
Write-Host "==> Setting up backend..." -ForegroundColor Yellow

# Create virtual environment
$venvPath = Join-Path $PSScriptRoot "backend\venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "  Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv $venvPath
}

# Activate virtual environment
Write-Host "  Activating virtual environment..." -ForegroundColor Cyan
$venvActivate = Join-Path $venvPath "Scripts\Activate.ps1"
if (Test-Path $venvActivate) {
    . $venvActivate
} else {
    Write-Host "  [ERROR] Virtual environment activation script not found" -ForegroundColor Red
    exit 1
}

# Install backend dependencies
Write-Host "  Installing backend dependencies..." -ForegroundColor Cyan
& "$venvPath\Scripts\python.exe" -m pip install --quiet --upgrade pip
& "$venvPath\Scripts\pip.exe" install --quiet -r "$PSScriptRoot\backend\requirements.txt"

# Check database connection — verify password first (prompt if default fails)
Write-Host "  Checking database connection..." -ForegroundColor Cyan

if ($pgInstalled) {
    # Temporarily allow errors so psql auth failure doesn't abort the script
    $savedPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    $env:PGPASSWORD = $PgPassword
    $null = & psql -U $PgUser -d postgres -c "SELECT 1;" 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [WARNING] Could not connect with password '$PgPassword'" -ForegroundColor Yellow
        $PgPassword = Read-Host "  Enter PostgreSQL password for user '$PgUser'"
        $env:PGPASSWORD = $PgPassword
        $null = & psql -U $PgUser -d postgres -c "SELECT 1;" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [ERROR] Still cannot connect to PostgreSQL. Check that the service is running and credentials are correct." -ForegroundColor Red
            exit 1
        }
    }

    $ErrorActionPreference = $savedPref
    Write-Host "  [OK] PostgreSQL connection successful" -ForegroundColor Green

    # Drop and recreate database (fresh setup)
    Write-Host "  Resetting database 'manga_rental' (drop + create)..." -ForegroundColor Cyan
    $savedPref2 = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $null = & psql -U $PgUser -d postgres -c "DROP DATABASE IF EXISTS manga_rental;" 2>&1
    $null = & psql -U $PgUser -d postgres -c "CREATE DATABASE manga_rental;" 2>&1
    $ErrorActionPreference = $savedPref2

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Database 'manga_rental' ready" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Could not create database manga_rental" -ForegroundColor Red
        exit 1
    }
}

# Always overwrite .env so password stays in sync with what was verified above
Write-Host "  Writing backend .env file..." -ForegroundColor Cyan
$envContent = @"
SECRET_KEY=django-insecure-local-dev-key-replace-in-production-12345
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

POSTGRES_DB=manga_rental
POSTGRES_USER=$PgUser
POSTGRES_PASSWORD=$PgPassword
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:$FrontendPort,http://127.0.0.1:$FrontendPort
"@
Set-Content -Path "$PSScriptRoot\backend\.env" -Value $envContent
Write-Host "  [OK] backend/.env written" -ForegroundColor Green

# Run migrations
Write-Host "  Running database migrations..." -ForegroundColor Cyan
& "$venvPath\Scripts\python.exe" "$PSScriptRoot\backend\manage.py" migrate

# Seed data
if (-not $SkipSeed) {
    Write-Host "  Seeding sample manga data..." -ForegroundColor Cyan
    & "$venvPath\Scripts\python.exe" "$PSScriptRoot\backend\seed.py"
    Write-Host "  Seeding AniList manga (100 titles)..." -ForegroundColor Cyan
    & "$venvPath\Scripts\python.exe" "$PSScriptRoot\backend\seed_manga_from_anilist.py"
}

# Create superuser
if (-not $SkipSuperuser) {
    Write-Host ""
    Write-Host "==> Creating Django admin user..." -ForegroundColor Yellow
    Write-Host "  Username: admin01 / Password: 123456789" -ForegroundColor Gray

    $createSuperuser = @"
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'manga_rental.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin01').exists():
    User.objects.create_superuser('admin01', 'admin@example.com', '123456789')
    print('Superuser created successfully')
else:
    print('Superuser already exists')
"@

    $createSuperuser | & "$venvPath\Scripts\python.exe"
    Write-Host "  [OK] Admin user ready (username: admin01, password: 123456789)" -ForegroundColor Green
}

# Setup frontend
Write-Host ""
Write-Host "==> Setting up frontend..." -ForegroundColor Yellow

# Install frontend dependencies
Write-Host "  Installing frontend dependencies..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\frontend"
npm install
Pop-Location

# Create .env file if not exists
if (-not (Test-Path "$PSScriptRoot\frontend\.env")) {
    Write-Host "  Creating frontend .env file..." -ForegroundColor Cyan
    Set-Content -Path "$PSScriptRoot\frontend\.env" -Value "VITE_API_BASE_URL=http://localhost:$BackendPort"
    Write-Host "  [OK] Created frontend/.env" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " Setup complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the servers:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Start backend (in terminal 1):" -ForegroundColor White
Write-Host "     cd backend" -ForegroundColor Gray
Write-Host "     .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "     python manage.py runserver $BackendPort" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Start frontend (in terminal 2):" -ForegroundColor White
Write-Host "     cd frontend" -ForegroundColor Gray
Write-Host "     npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Then access:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:$FrontendPort" -ForegroundColor White
Write-Host "  Backend:  http://localhost:$BackendPort/api/" -ForegroundColor White
Write-Host "  Admin:    http://localhost:$BackendPort/admin/" -ForegroundColor White
Write-Host ""
Write-Host "Or run both servers with:" -ForegroundColor Cyan
Write-Host "  .\start_local.ps1" -ForegroundColor White
Write-Host ""
