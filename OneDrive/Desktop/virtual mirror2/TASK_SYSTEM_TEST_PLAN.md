# Task System Test Plan

## Overview
The task logic system is now fully implemented with:
- ✅ State machine in `src/logic/tasks.ts` 
- ✅ Updated `CoachOverlay.tsx` for progress/voice feedback
- ✅ Integrated `SessionPageOrchestrator.tsx` to wire everything

## Test Checklist

### 1. Raise Hand Task
- [ ] Navigate to `/session` and click START
- [ ] Raise right arm above shoulder level
- [ ] Progress bar should fill as angle increases
- [ ] Voice feedback: "ارفع ذراعك" (Raise your arm) 
- [ ] Task completes when shoulder flexion ≥ 120° for 1 second
- [ ] Success message: "Perfect!" with green chip
- [ ] 1-second celebration delay before advancing
- [ ] Metrics stored: `shoulderFlexionMax` (degrees)

### 2. One Leg Task  
- [ ] Task pill becomes highlighted (primary color)
- [ ] Lift right or left foot off ground
- [ ] Progress bar fills as hold time increases
- [ ] Voice feedback: "ارفع رجلك" (Lift your leg)
- [ ] Task requires 5 seconds of balance
- [ ] Sway tracking monitors stability
- [ ] Success message and celebration delay
- [ ] Metrics stored: `holdTime` (seconds), `swayIndex` (0-1)

### 3. Walk Task
- [ ] Task pill becomes highlighted
- [ ] Walk in place or take steps
- [ ] Steps detected via heel x-position alternation
- [ ] Progress shows 0/4, 1/4, 2/4, 3/4, 4/4 steps
- [ ] Voice feedback: "امش" (Walk)
- [ ] Task completes after 4 steps
- [ ] Success message and celebration delay
- [ ] Metrics stored: `stepCount`, `symmetryPercent` (0-100)

### 4. Jump Task
- [ ] Task pill becomes highlighted (final task)
- [ ] Jump up (both feet leave ground)
- [ ] CoM (center of mass) peak detected
- [ ] Voice feedback: "اقفز" (Jump)
- [ ] Task completes after 1 successful jump
- [ ] Success message and celebration delay
- [ ] Metrics stored: `jumpHeightPixels`
- [ ] After completion, "Assessment Complete!" dialog appears

### 5. Overall Session Flow
- [ ] All 4 task pills display at top (default → primary → success colors)
- [ ] Bottom progress bar updates smoothly (0% to 100%)
- [ ] Progress percentage chip shows current percentage
- [ ] Voice feedback plays with ~1.2s debouncing
- [ ] Arabic voice selected (ar-SA preferred)
- [ ] Task transitions have 1-second celebration delay
- [ ] Metrics collected and stored in session store
- [ ] Results dialog offers "Parent View" and "Clinician View"

## Expected Behavior

### Task Pills (Top of screen)
- **Completed tasks**: Green outline chip (success color)
- **Current task**: Blue filled chip (primary color, bold font)
- **Upcoming tasks**: Gray outline chip (default color)

### Progress Bar (Bottom of screen)
- LinearProgress bar showing 0-100%
- Color changes based on task level:
  - Info: Blue
  - Warning: Orange  
  - Success: Green

### Voice Feedback
- Arabic phrases mapped to each task state
- Debounced to prevent overlapping speech
- Prefers `ar-SA` voice if available
- Falls back to other Arabic voices or default

### Metrics Collection
- Each task stores specific metrics in session store
- Overall risk calculated based on:
  - Balance hold time < 3s → HIGH risk
  - Shoulder flexion < 100° → MONITOR risk
  - Sway index > 0.02 → MONITOR risk
  - Otherwise → NORMAL risk

## Testing Notes

1. **Camera Position**: Stand back so full body is visible (head to feet)
2. **Lighting**: Ensure adequate lighting for pose detection
3. **Green Skeleton**: Should overlay properly on camera feed (HiDPI aware)
4. **Console Logs**: Check for any errors or warnings
5. **HMR**: Hot reload should work after code changes

## Known Limitations

- Walk task requires visible heels for step detection
- Jump task needs clear vertical movement of hips
- Arabic voice quality depends on OS/browser support
- Metrics are relative (pixel-based for jump height)

## Success Criteria

✅ All 4 tasks complete in sequence  
✅ Progress bar and voice feedback work smoothly  
✅ Task pills update correctly  
✅ Metrics stored and accessible in results pages  
✅ No TypeScript errors or console warnings  
✅ 1-second celebration delay between tasks  
✅ Results dialog appears after final task  

---

**Status**: Ready for testing  
**Last Updated**: Session orchestrator fully integrated with task state machine
