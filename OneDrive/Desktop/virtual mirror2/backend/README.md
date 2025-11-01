# Virtual Mirror Backend

FastAPI backend for the Virtual Mirror application - Early detection of motor weakness in children.

## Features

- **Session Analysis**: Analyze movement data and generate comprehensive reports
- **PDF Reports**: Generate professional biomechanical assessment reports
- **Text-to-Speech**: Optional Arabic voice feedback using Google TTS
- **RESTful API**: Clean API design with automatic documentation

## Setup

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the Server

```bash
# Development mode with auto-reload
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Access API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### 1. POST /api/analyze

Analyze session metrics and generate summary.

**Request Body:**
```json
{
  "patient_name": "John Doe",
  "patient_age": 8,
  "duration": 120,
  "joint_angles": [
    {
      "leftShoulder": 145.5,
      "rightShoulder": 148.2,
      "leftElbow": 165.3,
      "rightElbow": 167.1,
      "leftHip": 175.8,
      "rightHip": 176.2,
      "leftKnee": 172.4,
      "rightKnee": 173.1,
      "timestamp": 1698854400000
    }
  ],
  "raise_hand_results": {
    "leftSuccess": true,
    "rightSuccess": true,
    "overallSuccess": true
  },
  "balance_results": {
    "stabilityScore": 85.5,
    "balanceLevel": "good"
  }
}
```

**Response:**
```json
{
  "session_id": "uuid-here",
  "summary": {
    "statistics": {...},
    "symmetry": {...}
  },
  "recommendations": [
    "Movement patterns appear normal.",
    "Continue regular physical activity."
  ],
  "risk_level": "low",
  "timestamp": "2025-11-01T12:00:00"
}
```

### 2. GET /api/report/{session_id}

Generate and download PDF report.

**Response:** PDF file download

### 3. POST /api/tts

Generate Arabic speech from text (requires gtts).

**Request Body:**
```json
{
  "text": "شاطر! ممتاز!",
  "language": "ar",
  "slow": false
}
```

**Response:** MP3 audio file

## Data Storage

The backend stores data in the following structure:

```
backend/
├── data/
│   ├── sessions/     # JSON session data
│   ├── reports/      # Generated PDF reports
│   └── audio/        # TTS audio files
```

## Analysis Features

- **Symmetry Analysis**: Compares left/right side movements
- **Range of Motion**: Calculates joint ROM statistics
- **Risk Assessment**: Automatic risk level determination (low/moderate/high)
- **Recommendations**: Generates personalized exercise recommendations
- **Task Results**: Analyzes specific movement tasks

## Security Notes

For production deployment:
1. Add authentication (JWT tokens)
2. Configure proper CORS origins
3. Add rate limiting
4. Use environment variables for configuration
5. Set up HTTPS
6. Implement data encryption for sensitive patient information

## Technology Stack

- **FastAPI**: Modern Python web framework
- **ReportLab**: PDF generation
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation
- **gTTS**: Google Text-to-Speech (optional)

## License

MIT License
