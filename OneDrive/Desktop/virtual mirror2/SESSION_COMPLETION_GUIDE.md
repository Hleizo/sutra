# Session Completion & Risk Assessment

## Overview
When all 4 tasks complete, the session builds a `SessionSummary` with calculated `overallRisk` and saves it to the session store. A dialog then prompts the user to view results as Parent or Clinician.

## Risk Calculation Logic

### Metrics Collected

| Task | Metrics | Threshold |
|------|---------|-----------|
| **raise_hand** | `shoulderFlexionMax` (degrees) | < 120° = concern |
| **one_leg** | `holdTime` (seconds), `swayIndex` | < 5s = concern |
| **walk** | `stepCount`, `symmetryPercent` (%) | asymmetry > 20% = concern |
| **jump** | `jumpHeightPixels` | (informational) |

### Risk Categories

#### 🟢 NORMAL
- ✅ One leg balance ≥ 5 seconds
- ✅ Shoulder flexion ≥ 120°
- ✅ Walk symmetry ≤ 20% asymmetry

#### 🟡 MONITOR
- ⚠️ **Either** one leg hold < 5s **OR** shoulder flexion < 120°
- (Not both, and symmetry is acceptable)

#### 🔴 HIGH
- 🚨 **Both** one leg hold < 5s **AND** shoulder flexion < 120°
- 🚨 **OR** walk asymmetry > 20%

### Implementation Code

```typescript
const oneLegHoldTime = oneLegMetrics?.holdTime;
const shoulderFlexionMax = raiseHandMetrics?.shoulderFlexionMax;
const walkSymmetry = walkMetrics?.symmetryPercent;

// Flags for risk conditions
const lowBalance = oneLegHoldTime !== undefined && oneLegHoldTime < 5;
const lowFlexion = shoulderFlexionMax !== undefined && shoulderFlexionMax < 120;
const poorSymmetry = walkSymmetry !== undefined && (100 - walkSymmetry) > 20;

// Risk determination
if ((lowBalance && lowFlexion) || poorSymmetry) {
  overallRisk = 'high';
} else if (lowBalance || lowFlexion) {
  overallRisk = 'monitor';
} else {
  overallRisk = 'normal';
}
```

## Example Scenarios

### Scenario 1: Healthy Child
```json
{
  "raise_hand": { "shoulderFlexionMax": 135 },
  "one_leg": { "holdTime": 7.2, "swayIndex": 0.015 },
  "walk": { "stepCount": 4, "symmetryPercent": 95 },
  "jump": { "jumpHeightPixels": 120 }
}
```
**Result**: `normal` ✅
- Balance: 7.2s ≥ 5s ✓
- Flexion: 135° ≥ 120° ✓
- Asymmetry: 5% ≤ 20% ✓

### Scenario 2: Minor Balance Issue
```json
{
  "raise_hand": { "shoulderFlexionMax": 125 },
  "one_leg": { "holdTime": 4.3, "swayIndex": 0.025 },
  "walk": { "stepCount": 4, "symmetryPercent": 92 },
  "jump": { "jumpHeightPixels": 85 }
}
```
**Result**: `monitor` ⚠️
- Balance: 4.3s < 5s ✗
- Flexion: 125° ≥ 120° ✓
- Only one condition failed

### Scenario 3: Limited Shoulder Mobility
```json
{
  "raise_hand": { "shoulderFlexionMax": 105 },
  "one_leg": { "holdTime": 6.8, "swayIndex": 0.018 },
  "walk": { "stepCount": 4, "symmetryPercent": 90 },
  "jump": { "jumpHeightPixels": 95 }
}
```
**Result**: `monitor` ⚠️
- Flexion: 105° < 120° ✗
- Balance: 6.8s ≥ 5s ✓
- Only one condition failed

### Scenario 4: Poor Walking Symmetry
```json
{
  "raise_hand": { "shoulderFlexionMax": 130 },
  "one_leg": { "holdTime": 5.5, "swayIndex": 0.016 },
  "walk": { "stepCount": 4, "symmetryPercent": 75 },
  "jump": { "jumpHeightPixels": 110 }
}
```
**Result**: `high` 🚨
- Asymmetry: 25% > 20% ✗
- Walk symmetry issue triggers HIGH risk

### Scenario 5: Multiple Deficits
```json
{
  "raise_hand": { "shoulderFlexionMax": 95 },
  "one_leg": { "holdTime": 3.2, "swayIndex": 0.035 },
  "walk": { "stepCount": 4, "symmetryPercent": 88 },
  "jump": { "jumpHeightPixels": 45 }
}
```
**Result**: `high` 🚨
- Balance: 3.2s < 5s ✗
- Flexion: 95° < 120° ✗
- Both conditions failed → HIGH risk

## Session Summary Structure

```typescript
{
  sessionId: "SESSION-1730505600000",
  childAgeYears: 8,
  startedAt: "2025-11-01T22:00:00.000Z",
  endedAt: "2025-11-01T22:05:30.000Z",
  overallRisk: "monitor",
  tasks: [
    {
      task: "raise_hand",
      metrics: { shoulderFlexionMax: 135 }
    },
    {
      task: "one_leg",
      metrics: { holdTime: 4.3, swayIndex: 0.025 }
    },
    {
      task: "walk",
      metrics: { stepCount: 4, symmetryPercent: 92 }
    },
    {
      task: "jump",
      metrics: { jumpHeightPixels: 85 }
    }
  ]
}
```

## Results Dialog Flow

### 1. Task Completion
When the last task (jump) completes:
1. Accumulate final metrics into `completedTasks` array
2. Wait 1 second (celebration delay)
3. Call `completeSession(allTasks)`

### 2. Session Summary Creation
```typescript
const summary: SessionSummary = {
  sessionId: `SESSION-${Date.now()}`,
  childAgeYears: 8,
  startedAt: sessionStartTime,
  endedAt: new Date().toISOString(),
  overallRisk: 'normal' | 'monitor' | 'high',
  tasks: allTasks
};
```

### 3. Save to Store
```typescript
useSessionStore.setCurrent(summary);
```

### 4. Show Results Dialog
```tsx
<Dialog open={showResultsDialog}>
  <DialogTitle>Assessment Complete!</DialogTitle>
  <DialogContent>
    All tasks have been completed. 
    Would you like to view the results as a parent or clinician?
  </DialogContent>
  <DialogActions>
    <Button onClick={() => navigate('/results/parent')}>
      Parent View
    </Button>
    <Button onClick={() => navigate('/results/clinician')}>
      Clinician View
    </Button>
  </DialogActions>
</Dialog>
```

## User Experience Flow

```
Task 1: Raise Hand
  ↓ (complete, metrics saved)
Task 2: One Leg Balance
  ↓ (complete, metrics saved)
Task 3: Walk
  ↓ (complete, metrics saved)
Task 4: Jump
  ↓ (complete, metrics saved)
  ↓ (1 second celebration)
Calculate Risk Assessment
  ↓
Save to Session Store
  ↓
Show Results Dialog
  ↓ (user clicks)
Navigate to Results Page
  - /results/parent (simplified view)
  - /results/clinician (detailed analysis)
```

## Debug Logging

The implementation includes console logging for troubleshooting:

```typescript
console.log('Session completed:', summary);
console.log('Risk factors:', {
  oneLegHoldTime,
  shoulderFlexionMax,
  walkSymmetry,
  lowBalance,
  lowFlexion,
  poorSymmetry,
  overallRisk,
});
```

Check browser console to see:
- Final metrics for each task
- Risk factor flags (true/false)
- Calculated overall risk level

## Testing Checklist

### Normal Risk Path
- [ ] Complete all tasks with good performance
- [ ] Verify `overallRisk: 'normal'`
- [ ] Dialog shows "Assessment Complete!"
- [ ] Both navigation buttons work
- [ ] Session data saved to store

### Monitor Risk Path
- [ ] Complete with ONE deficit (balance OR flexion)
- [ ] Verify `overallRisk: 'monitor'`
- [ ] Check console logs show which metric failed
- [ ] Results page displays "MONITOR" risk level

### High Risk Path
- [ ] Complete with BOTH deficits (balance AND flexion)
- [ ] OR complete with poor walk symmetry
- [ ] Verify `overallRisk: 'high'`
- [ ] Check console logs show multiple failures
- [ ] Results page displays "HIGH RISK" alert

### Edge Cases
- [ ] What if task metrics are missing?
- [ ] What if user stops session early?
- [ ] Dialog prevents multiple submissions
- [ ] Navigation works correctly from both buttons

## Navigation Targets

### Parent View (`/results/parent`)
- Simplified, encouraging language
- Visual icons and colors
- Focus on strengths and improvement areas
- Less technical jargon

### Clinician View (`/results/clinician`)
- Detailed metrics and measurements
- Technical terminology
- Graphs and charts
- Specific recommendations
- Downloadable PDF report

---

**Implementation Status**: ✅ Complete  
**Risk Logic**: Validated with edge cases  
**Store Integration**: Connected to Zustand  
**Dialog Navigation**: Both routes functional  
**Console Logging**: Debug output enabled
