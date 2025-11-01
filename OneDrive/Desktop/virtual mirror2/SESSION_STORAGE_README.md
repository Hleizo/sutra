# Session Storage System

## Overview

The Virtual Mirror application uses **IndexedDB** for persistent client-side storage of movement assessment sessions. This allows users to:
- Save assessment sessions locally in the browser
- Review past sessions at any time
- Track progress over time
- Export/import session data
- Maintain privacy (all data stored locally)

## Architecture

### Core Components

1. **sessionStorage.ts** - Core service handling all IndexedDB operations
2. **useSessionStorage.ts** - React hooks for easy integration
3. **SessionHistory.tsx** - UI component for viewing/managing sessions
4. **SessionPage.tsx** - Auto-saves sessions after completion
5. **ResultsPage.tsx** - Updates sessions with analysis results

### Database Schema

**Database Name:** `VirtualMirrorDB`  
**Object Store:** `sessions`

**Indexes:**
- `date` - Session date (ISO string)
- `timestamp` - Unix timestamp for sorting
- `patientName` - Patient identifier
- `patientAge` - Age for filtering
- `risk_level` - Analysis risk level

## Data Structure

### StoredSession

```typescript
interface StoredSession {
  id: string;                    // Unique session ID
  patientName?: string;          // Optional patient name
  patientAge?: number;           // Patient age in years
  date: string;                  // ISO date string
  timestamp: number;             // Unix timestamp (ms)
  duration: number;              // Session duration (seconds)
  dataPoints: number;            // Number of pose data points collected
  metrics: SessionMetrics;       // Raw measurement data
  analysisResults?: AnalysisResults;  // Backend analysis results
  notes?: string;                // Optional notes
  videoThumbnail?: string;       // Base64 thumbnail (future)
}
```

### SessionMetrics

```typescript
interface SessionMetrics {
  poseData?: any[];              // Raw pose landmark data
  
  // Task-specific metrics
  raiseHandMetrics?: {...};
  balanceMetrics?: {...};
  walkMetrics?: {...};
  jumpMetrics?: {...};
  
  // Computed metrics
  romData?: {...};
  symmetryData?: {...};
}
```

### AnalysisResults

```typescript
interface AnalysisResults {
  risk_level: string;            // 'low' | 'moderate' | 'high'
  classification: string;        // Clinical classification
  confidence: number;            // Confidence score (0-100)
  flags: string[];               // Areas of concern
  recommendations: string[];     // Clinical recommendations
  detailed_metrics?: any;        // Detailed analysis data
}
```

## Usage

### 1. Saving a Session (SessionPage)

```typescript
import sessionStorage from '../services/sessionStorage';

const sessionId = await sessionStorage.saveSession(
  {
    poseData: collectedData,
    raiseHandMetrics: {...},
    balanceMetrics: {...}
  },
  {
    patientAge: 10,
    duration: 120,
    dataPoints: 500,
    notes: 'First assessment'
  }
);
```

### 2. Using React Hooks

```typescript
import { useSessionStorage } from '../hooks/useSessionStorage';

function MyComponent() {
  const { 
    sessions, 
    loading, 
    saveSession, 
    deleteSession,
    getStatistics 
  } = useSessionStorage();

  useEffect(() => {
    loadSessions();
  }, []);

  // Use sessions...
}
```

### 3. Viewing Session History

Navigate to `/history` to see the SessionHistory component with:
- Searchable table of all sessions
- Filter by risk level
- Statistics cards (total, weekly, monthly)
- Export/import functionality
- Delete individual or all sessions

### 4. Updating with Analysis Results

```typescript
// After backend analysis
await sessionStorage.updateSession(sessionId, {
  analysisResults: {
    risk_level: 'low',
    classification: 'Normal',
    confidence: 92,
    flags: [],
    recommendations: ['Continue regular activity']
  }
});
```

## API Reference

### Core Methods

#### `saveSession(metrics, options)`
Save a new session to IndexedDB.

**Parameters:**
- `metrics`: SessionMetrics object with measurement data
- `options`: Object with patientName, patientAge, duration, dataPoints, etc.

**Returns:** Promise<string> - The generated session ID

#### `getSession(sessionId)`
Retrieve a single session by ID.

**Returns:** Promise<StoredSession | null>

#### `getAllSessions(options?)`
Get all sessions with optional filtering and sorting.

**Options:**
- `limit`: Number of results
- `offset`: Pagination offset
- `sortBy`: 'date' | 'timestamp'
- `sortOrder`: 'asc' | 'desc'
- `filterByPatientName`: Filter by patient
- `filterByAge`: Filter by age
- `filterByRiskLevel`: Filter by risk

**Returns:** Promise<StoredSession[]>

#### `updateSession(sessionId, updates)`
Update an existing session.

#### `deleteSession(sessionId)`
Delete a single session.

#### `deleteSessions(sessionIds[])`
Delete multiple sessions.

#### `clearAllSessions()`
Delete all sessions (with confirmation).

#### `getSessionCount()`
Get total number of stored sessions.

#### `getStatistics()`
Get statistics about stored sessions:
- Total sessions
- Sessions this week/month
- Average duration
- Risk level distribution
- Age distribution

#### `exportSessions()`
Export all sessions as JSON string.

#### `importSessions(jsonData)`
Import sessions from JSON string.

#### `searchSessions(query)`
Search sessions by keywords.

## Features

### 1. Automatic Saving
- Sessions are automatically saved when user clicks "Stop"
- No manual save required
- Saves in background without blocking UI

### 2. Analysis Integration
- Analysis results from backend automatically appended to session
- Risk level, classification, recommendations stored
- Maintains full history of assessments

### 3. Data Portability
- **Export**: Download all sessions as JSON file
- **Import**: Upload previously exported sessions
- Format: `sessions-export-YYYY-MM-DD.json`

### 4. Privacy First
- All data stored locally in browser (IndexedDB)
- No data sent to external servers (except during analysis)
- User has full control to delete data
- Survives page refreshes

### 5. Search & Filter
- Full-text search across all session fields
- Filter by risk level (low/moderate/high)
- Sort by date or timestamp
- Patient-specific filtering

### 6. Statistics Dashboard
- Total session count
- Recent activity (this week, this month)
- Average session duration
- Risk level distribution
- Age group distribution

## Browser Compatibility

IndexedDB is supported in all modern browsers:
- ✅ Chrome 24+
- ✅ Firefox 16+
- ✅ Safari 10+
- ✅ Edge 12+
- ✅ Opera 15+

## Storage Limits

- **Chrome/Edge**: ~60% of disk space
- **Firefox**: 10% of disk space (max 2GB per origin)
- **Safari**: 1GB limit

Each session with 500 data points ≈ 100-200 KB  
Expected capacity: ~5,000-10,000 sessions

## Best Practices

### 1. Session Management
```typescript
// Always handle errors
try {
  await sessionStorage.saveSession(metrics, options);
} catch (error) {
  console.error('Failed to save session:', error);
  // Show user-friendly error message
}
```

### 2. Performance
```typescript
// Use pagination for large datasets
const sessions = await sessionStorage.getAllSessions({
  limit: 50,
  offset: 0,
  sortOrder: 'desc'
});
```

### 3. Data Cleanup
```typescript
// Periodically clean old sessions
const oldSessions = sessions.filter(s => 
  Date.now() - s.timestamp > 90 * 24 * 60 * 60 * 1000  // 90 days
);
await sessionStorage.deleteSessions(oldSessions.map(s => s.id));
```

### 4. Backup Reminders
```typescript
// Prompt users to export data periodically
const stats = await sessionStorage.getStatistics();
if (stats.totalSessions > 50) {
  // Show export reminder
}
```

## Future Enhancements

- [ ] Video thumbnail capture
- [ ] Cloud sync (optional)
- [ ] Offline PDF generation
- [ ] Session comparison tool
- [ ] Progress tracking charts
- [ ] Multi-patient management
- [ ] Session templates
- [ ] Custom notes with rich text
- [ ] Automatic old session cleanup
- [ ] Data encryption option

## Troubleshooting

### Issue: Sessions not saving
**Solution:** Check browser's IndexedDB quota and permissions

### Issue: Slow performance with many sessions
**Solution:** Use pagination and implement archiving for old sessions

### Issue: Data lost after browser update
**Solution:** Implement regular export reminders and backup system

## Examples

### Complete Session Workflow

```typescript
// 1. Start session
const startTime = Date.now();
const poseData: JointAngles[] = [];

// 2. Collect data during session
onPoseDetected((angles) => {
  poseData.push(angles);
});

// 3. Stop and save
const duration = (Date.now() - startTime) / 1000;
const sessionId = await sessionStorage.saveSession(
  { poseData },
  { duration, dataPoints: poseData.length, patientAge: 9 }
);

// 4. Get analysis from backend
const analysis = await analyzeSession(poseData);

// 5. Update session with results
await sessionStorage.updateSession(sessionId, {
  analysisResults: analysis
});

// 6. Navigate to results
navigate(`/results?sessionId=${sessionId}`);
```

## Security Considerations

1. **No server storage** - All data remains on client
2. **No third-party access** - IndexedDB isolated per origin
3. **User control** - Complete data deletion capability
4. **Local processing** - Analysis happens on backend during session only
5. **Privacy mode** - Works in incognito (but data clears on close)

## Related Files

- `src/services/sessionStorage.ts` - Core storage service
- `src/hooks/useSessionStorage.ts` - React hooks
- `src/pages/SessionHistory.tsx` - History viewer UI
- `src/pages/SessionPage.tsx` - Session recording
- `src/pages/ResultsPage.tsx` - Results display and update

---

**Last Updated:** November 1, 2025  
**Version:** 1.0.0
