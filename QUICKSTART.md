# Quick Start Guide

## Running with Docker (Recommended)

```powershell
# Build and start all services
.\docker-helper.ps1 build
.\docker-helper.ps1 start

# Check health
.\docker-helper.ps1 health

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
# MinIO Console: http://localhost:9001
```

See [DOCKER.md](DOCKER.md) for detailed Docker documentation.

## Manual Setup (Development)

### Backend Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Setup

```powershell
npm install
npm start
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   React     │────▶│   FastAPI   │────▶│  PostgreSQL  │
│  Frontend   │     │   Backend   │     │   Database   │
│  (Port 3000)│     │  (Port 8000)│     │  (Port 5432) │
└─────────────┘     └─────────────┘     └──────────────┘
                           │
                           │
                    ┌──────┴──────┐
                    │             │
              ┌─────▼─────┐ ┌────▼─────┐
              │   Redis   │ │  MinIO   │
              │ (Celery)  │ │ (Object  │
              │ Port 6379 │ │ Storage) │
              └───────────┘ └──────────┘
```

## Testing

```powershell
cd backend
pytest test_metrics.py test_risk_assessment.py -v
```

**Test Results**: ✅ 90 tests passing
- 38 metrics tests (angle calculation, stance duration, symmetry)
- 52 risk assessment tests (classification rules, thresholds, scoring)

## Features

### Admin Dashboard
- Session table with pagination and filtering
- 4 chart types (Radar, Area, Bar, Line) with Recharts
- Session detail view with pose replay

### Pose Replay
- Load JSON pose data
- Canvas-based skeleton animation
- Synchronized with timestamps
- Playback controls (play/pause, speed adjustment)

### Risk Assessment
- Rule-based classification (Normal/High)
- Threshold-based metrics (one-leg stance, symmetry)
- PDF report generation
- Score progression visualization

## Environment Variables

Create `.env` file:

```env
DATABASE_URL=sqlite:///./test.db
REDIS_URL=redis://localhost:6379/0
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minio_admin
MINIO_SECRET_KEY=minio_password
```

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | React application |
| Backend | 8000 | FastAPI REST API |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Celery broker |
| MinIO | 9000, 9001 | Object storage |

## Helper Scripts

### PowerShell (Windows)
```powershell
.\docker-helper.ps1 [command]
```

### Bash (Linux/Mac)
```bash
./docker-helper.sh [command]
```

**Commands**: build, start, stop, restart, logs, health, backup, restore, cleanup

## Documentation

- [Docker Setup](DOCKER.md) - Complete Docker documentation
- [API Docs](http://localhost:8000/docs) - Interactive API documentation
- [Test Coverage](backend/test_metrics.py) - Unit test suite

## Development

### Backend
- FastAPI with async support
- SQLAlchemy ORM
- Pytest for testing
- Celery for background tasks

### Frontend
- React 18 with TypeScript
- Material-UI components
- Recharts for visualizations
- Canvas API for pose replay

## License

MIT
