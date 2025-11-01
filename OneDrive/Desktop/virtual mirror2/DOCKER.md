# Virtual Mirror - Docker Setup Guide

This guide explains how to run the Virtual Mirror application using Docker.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose

Install Docker: https://docs.docker.com/get-docker/

## Quick Start

### 1. Clone and Navigate
```bash
cd virtual-mirror2
```

### 2. Create Environment File
Copy the example environment file and configure it:
```bash
cp .env.example .env
```

Edit `.env` to set your configuration (optional, defaults work fine).

### 3. Build and Run

#### Production Mode
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

#### Development Mode (with hot-reload)
```bash
# Build and start development services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### 4. Access the Application

- **Frontend**: http://localhost:3000 (production) or http://localhost:5173 (development)
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Services

### Frontend (Vite React App)
- **Port**: 3000 (production) / 5173 (development)
- **Technology**: React 19, TypeScript, Material UI
- **Features**: Pose detection, real-time analysis, session management

### Backend (FastAPI)
- **Port**: 8000
- **Technology**: Python 3.11, FastAPI
- **Features**: Movement analysis, PDF reports, TTS

### Database (SQLite)
- **Type**: File-based SQLite database
- **Location**: Docker volume `backend-data`
- **File**: `/app/data/virtual_mirror.db`

## Docker Commands

### View Running Containers
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Stop and Remove
```bash
# Stop containers
docker-compose stop

# Stop and remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v
```

### Rebuild Containers
```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build backend

# Rebuild and restart
docker-compose up -d --build
```

### Execute Commands in Container
```bash
# Access backend shell
docker-compose exec backend bash

# Access frontend shell
docker-compose exec frontend sh

# Run backend tests
docker-compose exec backend pytest

# Install new npm package
docker-compose exec frontend npm install <package-name>
```

## Volume Management

### List Volumes
```bash
docker volume ls | grep virtual-mirror
```

### Inspect Volume
```bash
docker volume inspect virtual-mirror2_backend-data
```

### Backup Database
```bash
# Copy database from volume to host
docker cp virtual-mirror-backend:/app/data/virtual_mirror.db ./backup.db
```

### Restore Database
```bash
# Copy database from host to container
docker cp ./backup.db virtual-mirror-backend:/app/data/virtual_mirror.db
```

## Environment Variables

### Frontend (VITE_*)
- `VITE_API_URL`: Backend API URL (default: http://localhost:8000)

### Backend
- `DATABASE_URL`: SQLite database path
- `CORS_ORIGINS`: Allowed frontend origins (comma-separated)
- `ENVIRONMENT`: production/development
- `MAX_UPLOAD_SIZE`: Maximum file upload size in bytes
- `TTS_ENABLED`: Enable text-to-speech (true/false)

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```bash
# Change ports in docker-compose.yml
ports:
  - "3001:80"  # Change 3000 to 3001
```

Or stop the conflicting service:
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :8000
kill -9 <PID>
```

### Container Won't Start
```bash
# Check logs
docker-compose logs backend

# Remove and rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database Issues
```bash
# Reset database
docker-compose down -v  # Removes volumes
docker-compose up -d
```

### Frontend Build Fails
```bash
# Clear npm cache
docker-compose exec frontend npm cache clean --force
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

### Backend Import Errors
```bash
# Reinstall dependencies
docker-compose exec backend pip install -r requirements.txt --force-reinstall
```

## Production Deployment

### 1. Update Environment Variables
```bash
# Set production values in .env
ENVIRONMENT=production
CORS_ORIGINS=https://yourdomain.com
```

### 2. Build Optimized Images
```bash
docker-compose build --no-cache
```

### 3. Run with Production Settings
```bash
docker-compose up -d
```

### 4. Set Up Reverse Proxy (Optional)
Use nginx or Apache to:
- Enable HTTPS/SSL
- Add domain name
- Improve security

### 5. Monitor Logs
```bash
docker-compose logs -f
```

## Performance Optimization

### Reduce Image Size
Already optimized:
- Multi-stage builds for frontend
- Alpine Linux base images
- Minimal dependencies

### Improve Build Speed
```bash
# Use BuildKit
DOCKER_BUILDKIT=1 docker-compose build
```

### Scale Services
```bash
# Run multiple backend instances
docker-compose up -d --scale backend=3
```

## Development Workflow

1. **Make code changes** (files are mounted in dev mode)
2. **Changes auto-reload** (hot module replacement)
3. **Test in browser** at http://localhost:5173
4. **View logs** with `docker-compose logs -f`
5. **Commit changes** when ready

## Health Checks

All services include health checks:
- Frontend: http://localhost:3000/health
- Backend: http://localhost:8000/health

Docker automatically restarts unhealthy containers.

## Security Considerations

1. **Never commit `.env` file** (contains secrets)
2. **Use secrets management** in production
3. **Update CORS_ORIGINS** for production domains
4. **Enable HTTPS** with reverse proxy
5. **Regular updates** of base images and dependencies

## Additional Resources

- Docker Documentation: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/
- FastAPI: https://fastapi.tiangolo.com/
- Vite: https://vitejs.dev/

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables
3. Ensure ports are available
4. Rebuild containers: `docker-compose up -d --build`

---

Last Updated: 2025
