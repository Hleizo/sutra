# Docker Compose Helper Script for Virtual Mirror (PowerShell)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

# Function to check if Docker is running
function Test-Docker {
    try {
        docker info | Out-Null
        Write-Success "Docker is running"
        return $true
    }
    catch {
        Write-Error-Custom "Docker is not running. Please start Docker Desktop first."
        return $false
    }
}

# Function to build all services
function Build-All {
    Write-Info "Building all Docker images..."
    docker-compose build
    Write-Success "All images built successfully"
}

# Function to start all services
function Start-All {
    Write-Info "Starting all services..."
    docker-compose up -d
    Write-Success "All services started"
    Write-Info "Waiting for services to be healthy..."
    Start-Sleep -Seconds 10
    docker-compose ps
}

# Function to stop all services
function Stop-All {
    Write-Info "Stopping all services..."
    docker-compose down
    Write-Success "All services stopped"
}

# Function to restart all services
function Restart-All {
    Write-Info "Restarting all services..."
    docker-compose restart
    Write-Success "All services restarted"
}

# Function to view logs
function View-Logs {
    param([string]$Service)
    
    if ([string]::IsNullOrEmpty($Service)) {
        Write-Info "Showing logs for all services..."
        docker-compose logs -f
    }
    else {
        Write-Info "Showing logs for $Service..."
        docker-compose logs -f $Service
    }
}

# Function to check service health
function Test-Health {
    Write-Info "Checking service health..."
    docker-compose ps
    Write-Host ""
    
    Write-Info "Backend health:"
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
        $response | ConvertTo-Json
    }
    catch {
        Write-Warning-Custom "Backend not responding"
    }
    
    Write-Host ""
    Write-Info "Frontend health:"
    try {
        Invoke-WebRequest -Uri "http://localhost:3000/health" -Method Get | Out-Null
        Write-Success "Frontend is responding"
    }
    catch {
        Write-Warning-Custom "Frontend not responding"
    }
}

# Function to clean up everything
function Remove-All {
    Write-Warning-Custom "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    $response = Read-Host
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Info "Stopping and removing containers..."
        docker-compose down -v
        Write-Info "Removing images..."
        docker-compose down --rmi all
        Write-Success "Cleanup completed"
    }
    else {
        Write-Info "Cleanup cancelled"
    }
}

# Function to initialize MinIO buckets
function Initialize-Minio {
    Write-Info "Initializing MinIO buckets..."
    docker-compose exec minio mc alias set myminio http://localhost:9000 minio_admin minio_password
    docker-compose exec minio mc mb myminio/virtual-mirror --ignore-existing
    docker-compose exec minio mc policy set public myminio/virtual-mirror
    Write-Success "MinIO initialized"
}

# Function to run database migrations
function Start-Migrations {
    Write-Info "Running database migrations..."
    docker-compose exec backend alembic upgrade head
    Write-Success "Migrations completed"
}

# Function to create database backup
function Backup-Database {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "backup_$timestamp.sql"
    
    Write-Info "Creating database backup: $backupFile"
    docker-compose exec -T db pg_dump -U postgres virtual_mirror | Out-File -FilePath $backupFile -Encoding UTF8
    Write-Success "Backup created: $backupFile"
}

# Function to restore database from backup
function Restore-Database {
    param([string]$BackupFile)
    
    if ([string]::IsNullOrEmpty($BackupFile)) {
        Write-Error-Custom "Please provide backup file path"
        return
    }
    
    if (-not (Test-Path $BackupFile)) {
        Write-Error-Custom "Backup file not found: $BackupFile"
        return
    }
    
    Write-Warning-Custom "This will overwrite the current database. Continue? (y/N)"
    $response = Read-Host
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Info "Restoring database from $BackupFile..."
        Get-Content $BackupFile | docker-compose exec -T db psql -U postgres virtual_mirror
        Write-Success "Database restored"
    }
    else {
        Write-Info "Restore cancelled"
    }
}

# Function to show help
function Show-Help {
    Write-Host @"
Virtual Mirror Docker Management Script (PowerShell)

Usage: .\docker-helper.ps1 [COMMAND] [OPTIONS]

Commands:
    build           Build all Docker images
    start           Start all services
    stop            Stop all services
    restart         Restart all services
    logs [service]  View logs (all services or specific service)
    health          Check health of all services
    cleanup         Remove all containers, volumes, and images
    init-minio      Initialize MinIO buckets
    migrate         Run database migrations
    backup          Create database backup
    restore [file]  Restore database from backup file
    help            Show this help message

Examples:
    .\docker-helper.ps1 build
    .\docker-helper.ps1 start
    .\docker-helper.ps1 logs backend
    .\docker-helper.ps1 health

"@
}

# Main script logic
if (-not (Test-Docker)) {
    exit 1
}

$command = $args[0]
$option = $args[1]

switch ($command) {
    "build" {
        Build-All
    }
    "start" {
        Start-All
    }
    "stop" {
        Stop-All
    }
    "restart" {
        Restart-All
    }
    "logs" {
        View-Logs -Service $option
    }
    "health" {
        Test-Health
    }
    "cleanup" {
        Remove-All
    }
    "init-minio" {
        Initialize-Minio
    }
    "migrate" {
        Start-Migrations
    }
    "backup" {
        Backup-Database
    }
    "restore" {
        Restore-Database -BackupFile $option
    }
    "help" {
        Show-Help
    }
    default {
        Write-Error-Custom "Unknown command: $command"
        Write-Host ""
        Show-Help
        exit 1
    }
}
