#Requires -Version 5.1
<#
.SYNOPSIS
    Start backend and frontend servers locally

.PARAMETER BackendPort
    Port for Django backend (default: 8000)

.PARAMETER FrontendPort
    Port for React frontend (default: 3000)
#>

[CmdletBinding()]
param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000
)

$ROOT = $PSScriptRoot

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Starting Manga Rental System (Local)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
if (-not (Test-Path "$ROOT\backend\venv")) {
    Write-Host "[ERROR] Virtual environment not found. Please run .\setup_local.ps1 first" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "$ROOT\frontend\node_modules")) {
    Write-Host "[ERROR] Frontend dependencies not installed. Please run .\setup_local.ps1 first" -ForegroundColor Red
    exit 1
}

$pythonExe = "$ROOT\backend\venv\Scripts\python.exe"
$managepy  = "$ROOT\backend\manage.py"

# Start backend in a new window
Write-Host "==> Starting Django backend on port $BackendPort..." -ForegroundColor Yellow
$backendProc = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/k title Django Backend && `"$pythonExe`" `"$managepy`" runserver $BackendPort" `
    -PassThru

Write-Host "  [OK] Backend window opened (PID: $($backendProc.Id))" -ForegroundColor Green

# Start frontend in a new window
Write-Host ""
Write-Host "==> Starting React frontend on port $FrontendPort..." -ForegroundColor Yellow
$frontendProc = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/k title React Frontend && cd /d `"$ROOT\frontend`" && npm run dev" `
    -PassThru

Write-Host "  [OK] Frontend window opened (PID: $($frontendProc.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " Servers started in separate windows!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend: http://localhost:$FrontendPort" -ForegroundColor White
Write-Host "  Backend:  http://localhost:$BackendPort/api/" -ForegroundColor White
Write-Host "  Admin:    http://localhost:$BackendPort/admin/" -ForegroundColor White
Write-Host ""
Write-Host "Close the server windows to stop them." -ForegroundColor Yellow
Write-Host ""
