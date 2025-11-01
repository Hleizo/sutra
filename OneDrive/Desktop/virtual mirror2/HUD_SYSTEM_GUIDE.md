# Visual Feedback Enhancements - HUD System

## Overview
Enhanced `CoachOverlay` with task-specific counters displayed in a mini HUD (Heads-Up Display) in the bottom-right corner.

## HUD Display by Task

### 1. **Raise Hand Task**
- **HUD**: None (angle feedback is in progress message)
- **Progress Bar**: Fills as shoulder angle increases (0° to 120°)
- **Message**: "Raise your right arm higher" → "You're close — raise a bit more" → "Hold steady... 0.8s"

### 2. **One Leg Balance Task**
```
┌─────────────────┐
│ Balance Time    │
│   00:03.4       │ ← Digital timer (mm:ss.tenths)
└─────────────────┘
```
- **Format**: `MM:SS.T` (minutes:seconds.tenths)
- **Updates**: Real-time every frame
- **Example**: `00:03.4` (3.4 seconds)
- **Target**: 5 seconds to complete task
- **Style**: Monospace font, dark background with transparency

### 3. **Walk Task**
```
┌─────────────────┐
│ Steps           │
│     3           │ ← Current step count
└─────────────────┘
```
- **Format**: Integer count (0, 1, 2, 3, 4)
- **Updates**: Increments with each detected step
- **Target**: 4 steps to complete task
- **Style**: Large monospace numbers

### 4. **Jump Task**
```
┌─────────────────┐
│ Jump Height     │
│   12 cm         │ ← Height in centimeters
│ (50px)          │ ← Raw pixel data
└─────────────────┘
```
- **Format**: Primary display in **cm** (estimated), secondary in pixels
- **Conversion**: `heightCm = (pixels / 1080) * 180`
  - Assumes 1080p height ≈ 180cm person height
- **Updates**: Shows current jump height during ascent
- **Style**: Main number in cm, smaller pixel count below

### 5. **Task Completion**
```
┌─────────────────┐
│  ✓ Done!        │ ← Green background, checkmark icon
└─────────────────┘
```
- **Display**: Replaces task-specific HUD when `done: true`
- **Duration**: Shows for ~1 second during celebration
- **Color**: Success green (`success.main`)
- **Icon**: Checkmark (Material UI `CheckCircleIcon`)

## Technical Implementation

### Updated Files

#### 1. `src/logic/tasks.ts`
Added real-time metrics to all `TaskUpdate` returns:

**One Leg Task:**
```typescript
metrics: { holdTime, currentSway: sway }
```

**Walk Task:**
```typescript
metrics: { stepCount: this.stepCount }
```

**Jump Task:**
```typescript
metrics: { jumpHeightPixels: currentJumpPixels }
```

**Raise Hand Task:**
```typescript
metrics: { currentAngle: angle, holdDuration: this.holdDuration }
```

#### 2. `src/components/CoachOverlay.tsx`
Added HUD rendering logic:

```typescript
interface CoachOverlayProps {
  taskUpdate: TaskUpdate | null;
  currentTaskName?: string;  // NEW: Task identifier
}

const renderHUD = () => {
  if (!taskUpdate || !taskUpdate.metrics || !currentTaskName) return null;

  // Show "✓ Done" when complete
  if (taskUpdate.done) {
    return <Paper>✓ Done!</Paper>;
  }

  // Task-specific HUD
  if (currentTaskName === 'one_leg') {
    // Timer display
  }
  if (currentTaskName === 'walk') {
    // Step counter
  }
  if (currentTaskName === 'jump') {
    // Height display
  }
}
```

#### 3. `src/pages/SessionPageOrchestrator.tsx`
Pass task name to CoachOverlay:

```typescript
<CoachOverlay 
  taskUpdate={taskUpdate} 
  currentTaskName={currentTaskName}  // NEW
/>
```

## Visual Layout

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  [Camera Feed with Pose Detection]              │
│                                                  │
│                                      ┌─────────┐ │ ← HUD
│                                      │ 00:03.4 │ │   (bottom-right)
│                                      └─────────┘ │
├──────────────────────────────────────────────────┤
│ ■■■■■■■■■■■■■■░░░░░░░░░░░░░░░░░░░░░░░  65%      │ ← Progress bar
│ [Good balance... 3.4s / 5s]         [65%]       │ ← Message + %
└──────────────────────────────────────────────────┘
```

## Styling Details

### HUD Container (`Paper`)
- **Position**: `fixed` at `bottom: 100px, right: 20px`
- **Z-Index**: `1001` (above progress bar at 1000)
- **Background**: `rgba(0, 0, 0, 0.85)` - Semi-transparent black
- **Elevation**: `3` - Material UI shadow
- **Padding**: `2` spacing units (16px)
- **Min Width**: `120px`
- **Color**: White text

### Timer Display (One Leg)
- **Font**: Monospace
- **Size**: `h4` variant (2.125rem / 34px)
- **Weight**: `700` (bold)
- **Format**: `MM:SS.T` with zero-padding
- **Label**: "Balance Time" in smaller caption

### Counter Display (Walk)
- **Font**: Monospace
- **Size**: `h4` variant
- **Weight**: `700` (bold)
- **Label**: "Steps" in caption

### Height Display (Jump)
- **Primary**: Main number in `h4` with "cm" unit in `h6`
- **Secondary**: Pixel value in smaller caption with 50% opacity
- **Label**: "Jump Height" in caption

### Completion Display
- **Background**: `success.main` (green)
- **Text**: "Done!" in white
- **Icon**: `CheckCircleIcon` at `2rem` size
- **Layout**: Flexbox with gap
- **Font Size**: `1.5rem`
- **Weight**: `700` (bold)

## User Experience Flow

1. **Task Starts** → HUD appears with initial value (0:00.0, 0 steps, 0 cm)
2. **User Performs Action** → HUD updates in real-time
3. **Progress Increases** → Bottom bar fills, percentage updates
4. **Task Completes** → HUD changes to "✓ Done!" (green)
5. **1s Celebration** → Green checkmark stays visible
6. **Next Task** → HUD updates to next task's format

## Height Calculation (Jump Task)

### Conversion Formula
```typescript
heightCm = Math.round((jumpHeightPixels / 1080) * 180)
```

### Assumptions
- Video height: 1080 pixels (Full HD)
- Average person in frame: ~180cm tall
- Ratio: 1 pixel ≈ 0.167 cm

### Example Conversions
| Pixels | Centimeters | Notes |
|--------|-------------|-------|
| 50     | 8 cm        | Small hop |
| 100    | 17 cm       | Moderate jump |
| 150    | 25 cm       | Good jump |
| 200    | 33 cm       | Excellent jump |

### Limitations
- **Relative Scale**: Depends on user distance from camera
- **Approximate**: Not calibrated for actual measurements
- **Pixel Data**: Raw pixels shown as fallback/reference

## Testing Checklist

- [ ] One Leg timer counts up smoothly (tenths update)
- [ ] Timer formats correctly (00:00.0 → 00:05.0)
- [ ] Walk counter increments with each step
- [ ] Jump height shows both cm and pixels
- [ ] "✓ Done!" appears when task completes
- [ ] HUD positioned correctly (bottom-right, above progress bar)
- [ ] HUD visible on all screen sizes
- [ ] HUD switches format between tasks
- [ ] Monospace font renders correctly
- [ ] Dark background has proper transparency

## Color Coding

| Element | Color | Usage |
|---------|-------|-------|
| Progress Bar (Info) | Blue (`primary.main`) | Normal progress |
| Progress Bar (Warning) | Orange (`warning.main`) | Needs correction |
| Progress Bar (Success) | Green (`success.main`) | Task complete |
| HUD Background | Black 85% opacity | All tasks |
| HUD Text | White | All tasks |
| Completion HUD | Green (`success.main`) | Task done |

## Accessibility Notes

- **High Contrast**: White text on dark background
- **Large Text**: 34px for main numbers
- **Monospace Font**: Prevents layout shift during updates
- **Visual + Voice**: HUD complements Arabic voice feedback
- **Icon + Text**: Checkmark icon reinforces completion message

---

**Status**: ✅ Implemented and ready for testing  
**Last Updated**: Enhanced with real-time task counters and completion feedback
