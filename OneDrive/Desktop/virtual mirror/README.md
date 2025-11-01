# Virtual Mirror

A full-stack pose assessment system with React + TypeScript frontend and FastAPI backend. Real-time pose detection using MediaPipe BlazePose with automated risk scoring and metrics analysis.

## Features
- **Vite + React + TypeScript** project scaffold
- **Material UI** for clean UI components
- **React Router** for navigation
- **Webcam Access** via `getUserMedia` API
- **Real-time Pose Detection** using MediaPipe BlazePose
  - Skeleton overlay with color-coded joints
  - Shoulder (red), Elbow (teal), Knee (mint), Ankle (yellow)
  - ~30 FPS pose tracking
- **Animated Cartoon Assistant** with Lottie animations
  - Text-to-Speech with audio API integration (`/api/tts`)
  - Amplitude-based lip sync (mouth moves with audio)
  - Falls back to Web Speech API if TTS endpoint unavailable
  - Positioned in corner with speaker button for manual playback
- **One-Leg Stance Assessment Task**
  - Arabic instruction display and audio
  - Automatic pose detection (detects when one foot is lifted)
  - 10-second countdown timer
  - Success/fail indicators with visual feedback
- **Camera Permission Handling** with user-friendly error messages
- Landing page with "Start Assessment" button routing to `/session`
- Session page with live pose detection and skeleton visualization

## Quick start (PowerShell)

### Frontend

1. Install dependencies:

```powershell
npm install
```

2. Start dev server:

```powershell
npm run dev
```

3. Open http://localhost:5173 in your browser.

### Backend (Optional - for metrics storage)

1. Navigate to backend folder:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Start FastAPI server:

```powershell
python main.py
```

3. Backend API available at http://localhost:8000
4. API docs at http://localhost:8000/docs

### Usage

1. Click "Start Assessment" to navigate to the pose detection session
2. Click "Start Camera" to enable webcam
3. Click "Begin Task" to start one-leg stance assessment
4. Listen to cartoon assistant's Arabic instruction
5. Stand on one leg for 10 seconds
6. View success/fail indicator and metrics

## Project Structure

```
.
├── src/                          # Frontend (React + TypeScript)
│   ├── main.tsx                  # App entry point with routing
│   ├── App.tsx                   # Route definitions
│   ├── index.css                 # Global styles
│   ├── pages/
│   │   ├── Landing.tsx           # Landing page with start button
│   │   └── Session.tsx           # One-leg stance task page
│   ├── components/
│   │   ├── CameraFeed.tsx        # Webcam access component (standalone)
│   │   ├── PoseDetector.tsx      # MediaPipe pose detection with skeleton overlay
│   │   ├── OneLegStanceTask.tsx  # Complete one-leg stance assessment with timer
│   │   ├── CartoonAssistant.tsx  # Lottie animation with lip sync
│   │   └── AssistantController.tsx # Controller wrapper for assistant
│   └── utils/
│       └── audioUtils.ts         # TTS API helper and audio amplitude analyzer
│
└── backend/                      # Backend (FastAPI + SQLite)
    ├── main.py                   # FastAPI application with all endpoints
    ├── models.py                 # SQLAlchemy database models
    ├── schemas.py                # Pydantic request/response schemas
    ├── database.py               # Database connection and session management
    ├── analysis.py               # Pose metrics calculation (stability, balance, risk)
    ├── requirements.txt          # Python dependencies
    └── README.md                 # Backend API documentation
```

## Technologies

- **Frontend**: React 18, TypeScript
- **Build Tool**: Vite 5
- **UI Framework**: Material UI (MUI) 5
- **Routing**: React Router 6
- **Pose Detection**: MediaPipe Tasks Vision (BlazePose)
- **Animation**: Lottie React
- **Audio**: Web Audio API (amplitude analysis), Web Speech API (TTS fallback)

## TTS API Integration

The cartoon assistant uses `playInstruction(text)` helper which:
1. First attempts to call `/api/tts?text={text}&lang={lang}` endpoint
2. Falls back to Web Speech API if endpoint is unavailable
3. Returns audio buffer for amplitude-based lip sync analysis

To integrate a real TTS API:
- Implement `/api/tts` endpoint that returns audio file (MP3, WAV, etc.)
- Or replace the `playInstruction` function in `src/utils/audioUtils.ts`
- The lip sync will automatically adapt to the audio amplitude

## Notes / Assumptions
- Requires Node.js and npm installed on your machine.
- Uses modern browser APIs (getUserMedia, Canvas, WebGL for MediaPipe, Web Audio API).
- Camera permission must be granted for pose detection to work.
- MediaPipe model files are loaded from CDN (requires internet connection on first run).
- TTS API endpoint is optional - falls back to browser's built-in speech synthesis.

