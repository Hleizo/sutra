# One-Leg Stance Detection - Live Diagnostics

## What You Should See Now

### Debug Chips (Top of page)
1. **Ankle Δ**: Height difference between ankles (live update)
2. **L vis / R vis**: Left and right ankle visibility
3. **pose: yes/no**: Whether MediaPipe detects body
4. **Status: [state]**: Current task status

### Status States
- `idle` = Camera active, haven't clicked "Begin Task" yet
- `ready` = **DETECTION MODE** - System watching for one-leg stance
- `detecting` = Timer running (10s countdown)
- `success` = Task completed
- `failed` = Lost balance

### Live Feedback Alert (when in ready mode)
- **Blue Info**: "Lift one foot higher! Current: 0.015 / Need: 0.03"
- **Green Success**: "✅ Height difference detected! (0.045 > 0.03) - Timer should start!"

### Ankle Dot Colors
- **Yellow** = Idle (camera on but task not started)
- **Blue** = Ready mode (watching for stance)
- **Green** = Timer running

### Console Messages (F12)
Every few frames you'll see:
```
🔍 Stance check: Δ=0.025, threshold=0.03, detected=false, L=0.123, R=0.098
```

When detection triggers:
```
🎯 ONE LEG STANCE DETECTED! Starting timer...
```

## Testing Steps

1. **Open page**: http://localhost:5173/session
2. **F12** to open console
3. **Start Camera** → Should see yellow dots on ankles
4. **Begin Task** → Dots turn BLUE, status chip shows "Status: ready"
5. **Watch the live alert** - it will tell you exactly how much to lift
6. **Lift one foot** - watch Ankle Δ increase in real-time
7. **When Δ > 0.03** → Alert turns green, should see console message "🎯 ONE LEG STANCE DETECTED!"

## If It Still Doesn't Work

### Check Console for:
```
🎯 ONE LEG STANCE DETECTED! Starting timer...
```

**If you DON'T see this even when alert is green:**
- There's a bug in the state management
- The `taskStatus` might not be 'ready'
- Check the Status chip - it MUST show "ready"

**If Status chip shows "idle" even after clicking "Begin Task":**
- The button click isn't working
- Try refreshing the page

**If Ankle Δ never exceeds 0.03:**
- Lift your foot higher (6+ inches off ground)
- Try lifting the other foot
- Step closer to camera for better tracking

## Current Settings
- Threshold: **0.03** (3% of frame height)
- Visibility requirement: **0.2** (20%)
- Detection runs only when status = 'ready'

## Quick Test
After clicking "Begin Task":
1. Look at Status chip → Should say "ready"
2. Look at ankle dots → Should be BLUE
3. Lift foot → Ankle Δ should increase
4. When Δ > 0.03 → Alert turns green
5. Console should log "🎯 ONE LEG STANCE DETECTED!"
6. Timer should start immediately

If steps 5-6 don't happen, there's a code logic issue, not a detection issue.
