# Virtual Mirror - Docker Setup

This document explains how to run the Virtual Mirror application using Docker.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)
- At least 4GB of available RAM
- Ports 3000, 8000, 5432, 6379, 9000, 9001 available

## Architecture

The application consists of 5 main services:

1. **Frontend** (React) - Port 3000
2. **Backend** (FastAPI) - Port 8000
3. **PostgreSQL** - Port 5432
4. **Redis** (Celery broker) - Port 6379
5. **MinIO** (Object storage) - Ports 9000 (API), 9001 (Console)

Additional services:
- **Celery Worker** - Background task processing
- **Celery Beat** - Task scheduler

## Quick Start

### Using PowerShell (Windows)

```powershell
# Build all images
.\docker-helper.ps1 build

# Start all services
.\docker-helper.ps1 start

# Check service health
.\docker-helper.ps1 health

# View logs
.\docker-helper.ps1 logs

# Stop all services
.\docker-helper.ps1 stop
```

### Using Bash (Linux/Mac)

```bash
# Make script executable
chmod +x docker-helper.sh

# Build all images
./docker-helper.sh build

# Start all services
./docker-helper.sh start

# Check service health
./docker-helper.sh health

# View logs
./docker-helper.sh logs

# Stop all services
./docker-helper.sh stop
```

### Manual Docker Compose Commands

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Service URLs

After starting the services:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Backend Docs**: http://localhost:8000/docs
- **MinIO Console**: http://localhost:9001 (user: minio_admin, pass: minio_password)
- **PostgreSQL**: localhost:5432 (user: postgres, pass: postgres_password, db: virtual_mirror)
- **Redis**: localhost:6379

## Configuration

### Environment Variables

Edit `.env.docker` to customize configuration:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres_password@db:5432/virtual_mirror

# Redis
REDIS_URL=redis://redis:6379/0

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minio_admin
MINIO_SECRET_KEY=minio_password
MINIO_BUCKET_NAME=virtual-mirror
MINIO_USE_SSL=false

# Application
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=your-secret-key-change-in-production
```

**⚠️ Important**: Change `SECRET_KEY` and database passwords in production!

## Health Checks

All services include health checks:

```bash
# Backend health
curl http://localhost:8000/health

# Frontend health
curl http://localhost:3000/health

# Check all services status
docker-compose ps
```

## Data Persistence

Data is persisted in Docker volumes:

- `postgres_data`: PostgreSQL database
- `redis_data`: Redis data
- `minio_data`: MinIO object storage
- `backend_uploads`: Backend file uploads

### Backup Database

```powershell
# PowerShell
.\docker-helper.ps1 backup

# Bash
./docker-helper.sh backup
```

### Restore Database

```powershell
# PowerShell
.\docker-helper.ps1 restore backup_20231030_120000.sql

# Bash
./docker-helper.sh restore backup_20231030_120000.sql
```

## Development Mode

For development with hot-reload:

1. **Backend**: Mount local directory as volume (already configured in docker-compose.yml)
2. **Frontend**: Use development Dockerfile or run `npm start` locally

## Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker info

# Check port conflicts
netstat -ano | findstr "3000 8000 5432 6379 9000"

# View detailed logs
docker-compose logs -f [service_name]
```

### Database connection issues

```bash
# Check database is healthy
docker-compose exec db pg_isready -U postgres

# Restart database
docker-compose restart db
```

### Reset everything

```powershell
# PowerShell - removes all containers, volumes, and images
.\docker-helper.ps1 cleanup

# Bash
./docker-helper.sh cleanup
```

### MinIO initialization

```bash
# Initialize MinIO buckets
.\docker-helper.ps1 init-minio
```

### View specific service logs

```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# Database logs
docker-compose logs -f db
```

## Production Deployment

For production:

1. Change all passwords in `.env.docker`
2. Set `DEBUG=false`
3. Use strong `SECRET_KEY`
4. Enable SSL/TLS for MinIO (`MINIO_USE_SSL=true`)
5. Use proper domain names instead of localhost
6. Set up proper CORS origins
7. Configure reverse proxy (Nginx/Traefik) for SSL termination
8. Set up database backups
9. Configure log aggregation
10. Monitor service health

### Production Docker Compose Override

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    environment:
      DEBUG: "false"
      ENVIRONMENT: production
    restart: always
    
  frontend:
    environment:
      NODE_ENV: production
    restart: always
    
  db:
    restart: always
    volumes:
      - /path/to/backup:/backup
      
  redis:
    restart: always
    
  minio:
    restart: always
```

Run with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Resource Limits

To limit resource usage, add to `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          memory: 512M
```

## Monitoring

### Service Status

```bash
docker-compose ps
```

### Resource Usage

```bash
docker stats
```

### Disk Usage

```bash
docker system df
```

## Cleanup

```bash
# Remove stopped containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Remove everything including images
docker-compose down -v --rmi all

# Prune unused Docker resources
docker system prune -a
```

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Verify health: `.\docker-helper.ps1 health`
3. Check documentation: http://localhost:8000/docs
