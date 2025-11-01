# Makefile for Virtual Mirror Docker Operations

.PHONY: help build up down restart logs clean dev prod test shell

# Default target
help:
	@echo "Virtual Mirror - Docker Commands"
	@echo ""
	@echo "Production:"
	@echo "  make prod          - Build and start production containers"
	@echo "  make up            - Start production containers"
	@echo "  make down          - Stop and remove containers"
	@echo ""
	@echo "Development:"
	@echo "  make dev           - Build and start development containers"
	@echo "  make dev-up        - Start development containers"
	@echo "  make dev-down      - Stop development containers"
	@echo ""
	@echo "Management:"
	@echo "  make build         - Build all containers"
	@echo "  make rebuild       - Rebuild containers from scratch"
	@echo "  make restart       - Restart all containers"
	@echo "  make logs          - View logs (all services)"
	@echo "  make logs-backend  - View backend logs"
	@echo "  make logs-frontend - View frontend logs"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean         - Remove containers and volumes"
	@echo "  make clean-all     - Remove everything including images"
	@echo "  make ps            - Show running containers"
	@echo "  make shell-backend - Access backend shell"
	@echo "  make shell-frontend- Access frontend shell"
	@echo ""
	@echo "Database:"
	@echo "  make db-backup     - Backup database"
	@echo "  make db-restore    - Restore database from backup"
	@echo ""
	@echo "Testing:"
	@echo "  make test          - Run tests"
	@echo "  make test-backend  - Run backend tests"
	@echo "  make test-frontend - Run frontend tests"

# Production commands
prod: build up

up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose build

rebuild:
	docker-compose build --no-cache

restart:
	docker-compose restart

# Development commands
dev: dev-build dev-up

dev-up:
	docker-compose -f docker-compose.dev.yml up -d

dev-down:
	docker-compose -f docker-compose.dev.yml down

dev-build:
	docker-compose -f docker-compose.dev.yml build

dev-rebuild:
	docker-compose -f docker-compose.dev.yml build --no-cache

dev-restart:
	docker-compose -f docker-compose.dev.yml restart

# Logs
logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Status
ps:
	docker-compose ps

# Shell access
shell-backend:
	docker-compose exec backend bash

shell-frontend:
	docker-compose exec frontend sh

dev-shell-backend:
	docker-compose -f docker-compose.dev.yml exec backend-dev bash

dev-shell-frontend:
	docker-compose -f docker-compose.dev.yml exec frontend-dev sh

# Cleanup
clean:
	docker-compose down -v

clean-all:
	docker-compose down -v --rmi all

# Database operations
db-backup:
	docker cp virtual-mirror-backend:/app/data/virtual_mirror.db ./backup_$(shell date +%Y%m%d_%H%M%S).db
	@echo "Database backed up to backup_$(shell date +%Y%m%d_%H%M%S).db"

db-restore:
	@echo "Enter backup filename:"
	@read filename; docker cp $$filename virtual-mirror-backend:/app/data/virtual_mirror.db
	@echo "Database restored"

# Testing
test:
	@echo "Running all tests..."
	$(MAKE) test-backend
	$(MAKE) test-frontend

test-backend:
	docker-compose exec backend pytest

test-frontend:
	docker-compose exec frontend npm test

dev-test-frontend:
	docker-compose -f docker-compose.dev.yml exec frontend-dev npm test

# Install dependencies
install-backend:
	docker-compose exec backend pip install -r requirements.txt

install-frontend:
	docker-compose exec frontend npm install

# Health check
health:
	@echo "Checking health..."
	@curl -f http://localhost:8000/health || echo "Backend: DOWN"
	@curl -f http://localhost:3000/health || echo "Frontend: DOWN"

# Update dependencies
update-backend:
	docker-compose exec backend pip install --upgrade -r requirements.txt

update-frontend:
	docker-compose exec frontend npm update
