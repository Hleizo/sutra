#!/bin/bash

# Docker Compose Helper Script for Virtual Mirror

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to build all services
build_all() {
    print_info "Building all Docker images..."
    docker-compose build
    print_success "All images built successfully"
}

# Function to start all services
start_all() {
    print_info "Starting all services..."
    docker-compose up -d
    print_success "All services started"
    print_info "Waiting for services to be healthy..."
    sleep 10
    docker-compose ps
}

# Function to stop all services
stop_all() {
    print_info "Stopping all services..."
    docker-compose down
    print_success "All services stopped"
}

# Function to restart all services
restart_all() {
    print_info "Restarting all services..."
    docker-compose restart
    print_success "All services restarted"
}

# Function to view logs
view_logs() {
    if [ -z "$1" ]; then
        print_info "Showing logs for all services..."
        docker-compose logs -f
    else
        print_info "Showing logs for $1..."
        docker-compose logs -f "$1"
    fi
}

# Function to check service health
check_health() {
    print_info "Checking service health..."
    docker-compose ps
    echo ""
    print_info "Backend health:"
    curl -s http://localhost:8000/health | jq . || echo "Backend not responding"
    echo ""
    print_info "Frontend health:"
    curl -s http://localhost:3000/health || echo "Frontend not responding"
}

# Function to clean up everything
cleanup() {
    print_warning "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "Stopping and removing containers..."
        docker-compose down -v
        print_info "Removing images..."
        docker-compose down --rmi all
        print_success "Cleanup completed"
    else
        print_info "Cleanup cancelled"
    fi
}

# Function to initialize MinIO buckets
init_minio() {
    print_info "Initializing MinIO buckets..."
    docker-compose exec minio mc alias set myminio http://localhost:9000 minio_admin minio_password
    docker-compose exec minio mc mb myminio/virtual-mirror --ignore-existing
    docker-compose exec minio mc policy set public myminio/virtual-mirror
    print_success "MinIO initialized"
}

# Function to run database migrations
run_migrations() {
    print_info "Running database migrations..."
    docker-compose exec backend alembic upgrade head
    print_success "Migrations completed"
}

# Function to create database backup
backup_db() {
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    print_info "Creating database backup: $BACKUP_FILE"
    docker-compose exec -T db pg_dump -U postgres virtual_mirror > "$BACKUP_FILE"
    print_success "Backup created: $BACKUP_FILE"
}

# Function to restore database from backup
restore_db() {
    if [ -z "$1" ]; then
        print_error "Please provide backup file path"
        exit 1
    fi
    print_warning "This will overwrite the current database. Continue? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "Restoring database from $1..."
        docker-compose exec -T db psql -U postgres virtual_mirror < "$1"
        print_success "Database restored"
    else
        print_info "Restore cancelled"
    fi
}

# Function to show help
show_help() {
    cat << EOF
Virtual Mirror Docker Management Script

Usage: ./docker-helper.sh [COMMAND] [OPTIONS]

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
    ./docker-helper.sh build
    ./docker-helper.sh start
    ./docker-helper.sh logs backend
    ./docker-helper.sh health

EOF
}

# Main script logic
check_docker

case "$1" in
    build)
        build_all
        ;;
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        restart_all
        ;;
    logs)
        view_logs "$2"
        ;;
    health)
        check_health
        ;;
    cleanup)
        cleanup
        ;;
    init-minio)
        init_minio
        ;;
    migrate)
        run_migrations
        ;;
    backup)
        backup_db
        ;;
    restore)
        restore_db "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
