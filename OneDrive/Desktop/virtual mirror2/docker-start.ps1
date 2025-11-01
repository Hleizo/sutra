# Virtual Mirror - Quick Start Scripts for Windows

# Production Mode
Write-Host "Virtual Mirror - Docker Setup" -ForegroundColor Cyan
Write-Host ""

$action = Read-Host "Choose action: (1) Production (2) Development (3) Stop (4) Clean (5) Logs"

switch ($action) {
    "1" {
        Write-Host "Starting production mode..." -ForegroundColor Green
        docker-compose up -d --build
        Write-Host ""
        Write-Host "Application started!" -ForegroundColor Green
        Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
        Write-Host "Backend: http://localhost:8000" -ForegroundColor Yellow
        Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
    }
    "2" {
        Write-Host "Starting development mode..." -ForegroundColor Green
        docker-compose -f docker-compose.dev.yml up -d --build
        Write-Host ""
        Write-Host "Application started in dev mode!" -ForegroundColor Green
        Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
        Write-Host "Backend: http://localhost:8000" -ForegroundColor Yellow
        Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
    }
    "3" {
        Write-Host "Stopping containers..." -ForegroundColor Yellow
        docker-compose down
        docker-compose -f docker-compose.dev.yml down
        Write-Host "Containers stopped" -ForegroundColor Green
    }
    "4" {
        Write-Host "Cleaning up (removing volumes)..." -ForegroundColor Yellow
        docker-compose down -v
        docker-compose -f docker-compose.dev.yml down -v
        Write-Host "Cleanup complete" -ForegroundColor Green
    }
    "5" {
        Write-Host "Showing logs (Ctrl+C to exit)..." -ForegroundColor Yellow
        docker-compose logs -f
    }
    default {
        Write-Host "Invalid option" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
