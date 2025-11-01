## 🐳 Docker Deployment

### Quick Start

**Production Mode:**
```bash
docker-compose up -d
```

**Development Mode:**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Using Helper Scripts

**Windows:**
```powershell
.\docker-start.ps1
```

**Linux/Mac:**
```bash
chmod +x docker-start.sh
./docker-start.sh
```

**Using Make:**
```bash
make help          # Show all available commands
make prod          # Start production mode
make dev           # Start development mode
make logs          # View logs
make clean         # Stop and clean up
```

### Access Points

After starting the containers:

- **Frontend (Production)**: http://localhost:3000
- **Frontend (Development)**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Configuration

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit environment variables** (optional):
   ```env
   VITE_API_URL=http://localhost:8000
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   DATABASE_URL=sqlite:///./data/virtual_mirror.db
   ```

### Docker Services

- **Frontend**: Vite React app with nginx (production) or dev server (development)
- **Backend**: FastAPI with uvicorn, auto-reload enabled
- **Database**: SQLite with persistent volume

### Common Commands

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop containers
docker-compose down

# Remove everything including volumes
docker-compose down -v

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d
```

### Full Documentation

For detailed instructions, troubleshooting, and advanced usage, see:
- **[DOCKER.md](./DOCKER.md)** - Complete Docker guide
- **[docker/README.md](./docker/README.md)** - Docker files overview

---
