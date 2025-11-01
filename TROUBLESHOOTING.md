# Troubleshooting Pose Detection Issues

## Quick Diagnosis Steps

### 1. Open Browser Console (F12)
When you load the app, look for these console messages:

**✅ Success messages:**
- `✓ PoseLandmarker already initialized` or `✓ PoseLandmarker initialized successfully`
- `✓ Camera access granted`
- `✓ Video playing`
- `Canvas size set to [width]x[height]`
- `✓ Camera active, starting pose detection loop`
- `Pose detection: ✓ 1 pose(s)` (appears occasionally)

**❌ Error messages:**
- `❌ Failed to initialize PoseLandmarker:` - Model loading failed
- `✗ no pose` - Camera is working but pose not detected

### 2. Check Debug Overlay
The debug overlay is now **enabled by default**. Look for the yellow chip showing:
- **Ankle Δ**: Height difference between ankles (should be > 0.05 to trigger detection)
- **L vis / R vis**: Left and right ankle visibility (should be ≥ 0.30)
- **pose: yes/no**: Whether MediaPipe detects your body

### 3. Common Issues and Fixes

#### Issue: "pose: no" in debug chip
**Cause**: MediaPipe cannot detect your body in the video feed.

**Solutions:**
1. **Stand further back** - Show your full body from head to feet
2. **Better lighting** - Make sure you're well-lit (not backlit)
3. **Face the camera directly** - Don't stand at an angle
4. **Check video feed** - Make sure the camera is actually showing you (not black screen)
5. **Try different browser** - Chrome/Edge work best with MediaPipe

#### Issue: "pose: yes" but no ankle dots
**Cause**: Hips or ankles have low visibility scores.

**Solutions:**
1. **Step back more** - Include hips and ankles fully in frame
2. **Wear contrasting clothing** - Avoid colors that blend with background
3. **Check the warnings** - Yellow alerts will tell you what's missing

#### Issue: Model loading fails
**Cause**: Cannot download MediaPipe model from CDN.

**Console error:** 
```
❌ Failed to initialize PoseLandmarker: [network error]
```

**Solutions:**
1. **Check internet connection** - Model downloads from Google CDN
2. **Check firewall/proxy** - May block `cdn.jsdelivr.net` or `storage.googleapis.com`
3. **Try different network** - Corporate networks may block CDNs

#### Issue: Camera permission denied
**Cause**: Browser doesn't have permission to access camera.

**Solutions:**
1. **Grant permission** - Click "Allow" when browser asks
2. **Check browser settings** - Go to site settings and enable camera
3. **Use HTTPS** - Some browsers require HTTPS for camera access
4. **Try localhost** - Use http://localhost:5173 instead of 127.0.0.1

#### Issue: Detection threshold too high
**Cause**: Ankle height difference threshold (0.05) might be too strict.

**Solutions:**
1. **Lift foot higher** - Raise your lifted ankle clearly off the ground
2. **Stand straighter** - Keep hips level to establish good baseline
3. **Check Ankle Δ** - In debug mode, watch the number - it needs to exceed 0.05

### 4. Advanced Debugging

#### Check video dimensions:
Look for console message: `Canvas size set to [width]x[height]`
- Should be at least 640x480
- If 0x0 or very small, video feed may not be working

#### Monitor pose detection:
Every few seconds you'll see: `Pose detection: ✓ 1 pose(s)` or `✗ no pose`
- If you see `✗ no pose` repeatedly, MediaPipe isn't detecting you

#### Test in different browsers:
- **Best**: Chrome, Edge (Chromium-based)
- **Good**: Firefox
- **May have issues**: Safari, older browsers

### 5. Hardware Requirements
- **Camera**: Any webcam (built-in or USB)
- **CPU**: Modern processor (MediaPipe uses CPU delegate for compatibility)
- **RAM**: 4GB+ recommended
- **Internet**: Required for initial model download (~3MB)

## How the Detection Works

1. **Model loads** from Google CDN (happens once on page load)
2. **Camera starts** and streams video
3. **Every frame**, MediaPipe analyzes the video and returns body landmarks
4. **Visibility check**: System verifies hips and ankles are visible (≥ 0.30)
5. **Height calculation**: Compares ankle heights relative to hip baseline
6. **Threshold check**: If height difference > 0.05, one-leg stance is detected
7. **Timer starts** automatically when stance is detected

## Still Not Working?

### Check Browser Console
1. Press **F12** to open developer tools
2. Click **Console** tab
3. Look for red error messages
4. Share error messages for further help

### Try Test Mode
If you see pose detected but "Begin Task" doesn't work:
1. Make sure you clicked **"Begin Task"** button first
2. Then lift one foot off the ground
3. Detection only starts after you click the button

### Network Issues
If model won't load:
```
Failed to load pose detection model: Failed to fetch
```
Try these CDN URLs in a new browser tab to verify access:
- https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/
- https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task

If these URLs don't load, your network is blocking them.

## Contact Support
If issues persist, provide:
1. Browser name and version
2. Operating system
3. Screenshot of debug overlay
4. Console error messages (F12 → Console)
