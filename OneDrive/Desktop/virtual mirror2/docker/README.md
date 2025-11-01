# Docker Configuration Files

This directory contains Docker configuration files for containerizing the Virtual Mirror application.

## Files Created

### 1. Dockerfile.frontend
Production-optimized multi-stage Docker build for the Vite React frontend:
- Stage 1: Build the React application
- Stage 2: Serve with nginx
- Includes nginx configuration for SPA routing

### 2. Dockerfile.backend
Docker image for the FastAPI backend:
- Python 3.11 slim base
- Installs all Python dependencies
- Exposes port 8000
- Auto-reload support in development

### 3. docker-compose.yml
Production orchestration file:
- Frontend service (port 3000)
- Backend service (port 8000)
- Persistent volumes for database and reports
- Health checks
- Network isolation

### 4. docker-compose.dev.yml
Development orchestration with hot-reload:
- Frontend dev server (port 5173)
- Backend with auto-reload
- Volume mounts for live code updates

### 5. nginx.conf
Nginx configuration for frontend:
- SPA routing support
- Static asset caching
- Gzip compression
- Security headers
- Optional API proxy

### 6. .dockerignore
Excludes unnecessary files from Docker builds:
- node_modules
- Python cache
- IDE files
- Documentation

### 7. .env.example
Template for environment variables:
- Frontend: VITE_API_URL
- Backend: DATABASE_URL, CORS_ORIGINS, etc.

## Usage

### Quick Start (Production)
```bash
docker-compose up -d
```

### Quick Start (Development)
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Using Scripts

**Windows (PowerShell):**
```powershell
.\docker-start.ps1
```

**Linux/Mac:**
```bash
chmod +x docker-start.sh
./docker-start.sh
```

**Make commands:**
```bash
make help          # Show all commands
make prod          # Start production
make dev           # Start development
make logs          # View logs
make clean         # Clean up
```

## Features

✅ **Multi-stage builds** for optimized image sizes
✅ **Hot-reload** support in development mode
✅ **Volume persistence** for database and reports
✅ **Health checks** for automatic recovery
✅ **CORS configuration** via environment variables
✅ **Network isolation** between services
✅ **Security headers** in nginx
✅ **Gzip compression** for assets
✅ **SPA routing** support

## Ports

- **Frontend (Prod)**: 3000
- **Frontend (Dev)**: 5173
- **Backend**: 8000

## Volumes

- `backend-data`: SQLite database
- `backend-reports`: Generated PDF reports

## Environment Variables

See `.env.example` for all available configuration options.

## Documentation

Full documentation available in `DOCKER.md`

---

For detailed instructions and troubleshooting, see [DOCKER.md](./DOCKER.md)
