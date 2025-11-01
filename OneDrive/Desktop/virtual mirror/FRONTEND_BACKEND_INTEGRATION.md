# Virtual Mirror - Frontend Backend Integration

## Overview
The Virtual Mirror frontend is now fully integrated with the FastAPI backend for pose assessment and risk analysis.

## Features Integrated

### 1. **Real-time Pose Recording**
- MediaPipe pose landmarks are captured at 30 FPS during the one-leg stance task
- All 33 body landmarks are recorded with timestamps

### 2. **Backend Communication**
- Automatic session creation when task completes
- Pose data upload to backend for analysis
- Risk assessment calculations using rule-based logic

### 3. **Results Display**
- **Stability Score**: Measure of body steadiness
- **Balance Score**: Weight distribution analysis
- **Risk Score**: 0-100 scale fall risk indicator
- **Risk Level**: High/Medium/Normal classification with color coding

### 4. **PDF Report Generation**
- Downloadable professional PDF reports
- Color-coded risk levels (Red=High, Orange=Medium, Green=Normal)
- Complete session metadata and performance metrics
- Abnormal flags table and interpretation guide

### 5. **Assessment History**
- View all previous sessions
- Sort and filter by date, risk level
- Download historical reports
- Delete old sessions

## Architecture

```
Frontend (React + TypeScript)
    ↓
API Service Layer (src/services/api.ts)
    ↓
FastAPI Backend (Python)
    ↓
Risk Assessment Module (rule-based logic)
    ↓
PDF Generator (ReportLab)
```

## File Structure

```
src/
├── services/
│   └── api.ts                    # Backend API integration
├── pages/
│   ├── Landing.tsx               # Home page with navigation
│   ├── Session.tsx               # Assessment session page
│   └── Results.tsx               # Assessment history
└── components/
    └── OneLegStanceTask.tsx      # Main assessment component (updated)
```

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sessions/` | POST | Create new session |
| `/api/sessions/{id}/process` | POST | Upload pose data for analysis |
| `/api/sessions/{id}/results` | GET | Get analysis results |
| `/api/sessions/` | GET | List all sessions |
| `/api/sessions/{id}` | DELETE | Delete session |
| `/api/sessions/{id}/report.pdf` | GET | Download PDF report |

## Data Flow

1. **User starts assessment** → Camera activates, MediaPipe loads
2. **User performs one-leg stance** → Pose landmarks recorded at 30 FPS
3. **Task completes (10 seconds)** → Data sent to backend
4. **Backend processes data** → Risk assessment calculated
5. **Results displayed** → Scores, risk level, and download button shown
6. **User downloads report** → PDF generated and downloaded

## Risk Assessment Logic

The backend uses rule-based thresholds:

- **One-leg stance < 3 seconds** → Abnormal flag
- **Symmetry difference > 15%** → Abnormal flag
- **2+ abnormal flags** → High risk
- **1 abnormal flag** → Medium risk
- **0 abnormal flags** → Normal risk

Risk score = 100 * (abnormal_flags / total_checks)

## Setup Instructions

### 1. Start the Backend

```powershell
cd "backend"
& "..\\.venv\Scripts\python.exe" -m uvicorn main:app --reload
```

Backend runs on: http://127.0.0.1:8000

### 2. Start the Frontend

```powershell
npm run dev
```

Frontend runs on: http://localhost:5173

### 3. Verify Connection

- Check the "Backend Connected" chip in the assessment page
- Green = Connected, Red = Offline

## Components Modified

### `OneLegStanceTask.tsx`
**New Features:**
- Pose frame recording during task
- Backend API integration
- Results display with scores and risk levels
- PDF download button
- API connection status indicator

**New State:**
```typescript
const [isProcessing, setIsProcessing] = useState(false)
const [sessionResults, setSessionResults] = useState<api.SessionResponse | null>(null)
const [apiConnected, setApiConnected] = useState(false)
```

**New Functions:**
- `recordPoseFrame()` - Captures pose landmarks
- `sendToBackend()` - Uploads data and processes
- `downloadPDFReport()` - Downloads PDF

### `Results.tsx` (New)
**Features:**
- Table view of all sessions
- Sort by date, risk level
- Download PDF for any session
- Delete sessions
- Refresh data

## Color Coding

- **🔴 Red (High Risk)**: Risk score 67-100
- **🟠 Orange (Medium Risk)**: Risk score 34-66
- **🟢 Green (Normal Risk)**: Risk score 0-33

## Testing

### Manual Test Flow

1. **Test Connection**
   - Open http://localhost:5173
   - Navigate to "Start Assessment"
   - Verify green "Backend Connected" chip

2. **Test Assessment**
   - Click "Start Camera"
   - Click "Begin Task"
   - Stand on one leg for 10 seconds
   - Wait for "Success!" message

3. **Test Results**
   - Verify "Analyzing your performance..." appears
   - Check that scores display (Stability, Balance, Risk)
   - Verify risk level chip shows correct color

4. **Test PDF Download**
   - Click "Download PDF Report"
   - Verify PDF downloads with session data

5. **Test History**
   - Navigate to "View History"
   - Verify session appears in table
   - Test download from history
   - Test delete session

### Demo Script

Run the automated demo:

```powershell
cd backend
& "..\\.venv\Scripts\python.exe" demo_test.py
```

This simulates a complete workflow with synthetic data.

## Troubleshooting

### Backend Not Connected

**Problem**: Red "Backend Offline" chip

**Solutions**:
1. Start backend server: `uvicorn main:app --reload`
2. Check backend is running on http://127.0.0.1:8000
3. Verify CORS is enabled in backend
4. Check browser console for errors

### No Results After Task

**Problem**: Task completes but no results appear

**Solutions**:
1. Check browser console for API errors
2. Verify pose data was recorded (check `recordedFramesRef`)
3. Ensure backend processed data successfully
4. Check network tab for failed requests

### PDF Download Fails

**Problem**: Click download but no PDF

**Solutions**:
1. Check session was processed (status = "processed")
2. Verify ReportLab is installed: `pip install reportlab`
3. Check backend logs for PDF generation errors
4. Ensure `reports/` directory exists

### CORS Errors

**Problem**: Cross-origin request blocked

**Solution**: Update backend `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Next Steps

### Planned Enhancements

1. **Real-time feedback during task**
   - Show risk indicators while performing stance
   - Provide corrective guidance

2. **Multiple task types**
   - Sit-to-stand test
   - Walking assessment
   - Reach test

3. **Historical trends**
   - Graph risk scores over time
   - Compare sessions
   - Progress tracking

4. **Advanced analytics**
   - Machine learning risk prediction
   - Personalized recommendations
   - Fall prevention exercises

5. **User accounts**
   - Login/registration
   - Patient profiles
   - Clinician dashboard

## API Documentation

Full API docs available at:
- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

## Support

For issues or questions:
1. Check browser console for errors
2. Check backend terminal for logs
3. Review this documentation
4. Test with demo script first
