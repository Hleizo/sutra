# TTS API Endpoint Implementation Guide

This file provides examples for implementing a `/api/tts` endpoint that the CartoonAssistant can use.

## Endpoint Specification

**URL**: `/api/tts`

**Method**: GET

**Query Parameters**:
- `text` (required): The text to convert to speech
- `lang` (optional): Language code (e.g., 'ar-SA', 'en-US'). Default: 'ar-SA'
- `rate` (optional): Speech rate (0.5-2.0). Default: 1.0
- `pitch` (optional): Voice pitch (0.0-2.0). Default: 1.0

**Response**: Audio file (MP3, WAV, or OGG format)

**Content-Type**: `audio/mpeg` or `audio/wav` or `audio/ogg`

## Example Implementations

### Option 1: Node.js + Express + Google Cloud TTS

```javascript
const express = require('express');
const textToSpeech = require('@google-cloud/text-to-speech');
const router = express.Router();

const client = new textToSpeech.TextToSpeechClient();

router.get('/api/tts', async (req, res) => {
  const { text, lang = 'ar-SA', rate = 1.0, pitch = 1.0 } = req.query;

  if (!text) {
    return res.status(400).json({ error: 'Text parameter is required' });
  }

  try {
    const request = {
      input: { text },
      voice: { languageCode: lang, ssmlGender: 'NEUTRAL' },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: parseFloat(rate),
        pitch: parseFloat(pitch),
      },
    };

    const [response] = await client.synthesizeSpeech(request);
    
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.audioContent);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'TTS generation failed' });
  }
});

module.exports = router;
```

### Option 2: Python + Flask + gTTS

```python
from flask import Flask, request, send_file
from gtts import gTTS
import io

app = Flask(__name__)

@app.route('/api/tts')
def text_to_speech():
    text = request.args.get('text')
    lang = request.args.get('lang', 'ar')  # 'ar' for Arabic
    rate = float(request.args.get('rate', 1.0))
    
    if not text:
        return {'error': 'Text parameter is required'}, 400
    
    try:
        # Generate speech
        tts = gTTS(text=text, lang=lang.split('-')[0], slow=(rate < 0.8))
        
        # Save to bytes buffer
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        return send_file(
            audio_buffer,
            mimetype='audio/mpeg',
            as_attachment=False,
            download_name='speech.mp3'
        )
    except Exception as e:
        return {'error': str(e)}, 500

if __name__ == '__main__':
    app.run(port=5000)
```

### Option 3: Vite Proxy to External TTS Service

If you're using an external TTS API, configure Vite to proxy requests:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/tts': {
        target: 'https://your-tts-service.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tts/, '/synthesize'),
      },
    },
  },
})
```

### Option 4: Azure Cognitive Services

```javascript
const express = require('express');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const router = express.Router();

router.get('/api/tts', async (req, res) => {
  const { text, lang = 'ar-SA', rate = 1.0, pitch = 1.0 } = req.query;

  if (!text) {
    return res.status(400).json({ error: 'Text parameter is required' });
  }

  try {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY,
      process.env.AZURE_SPEECH_REGION
    );
    
    speechConfig.speechSynthesisVoiceName = 'ar-SA-ZariyahNeural'; // Arabic voice
    
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
    
    synthesizer.speakTextAsync(
      text,
      (result) => {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          res.set('Content-Type', 'audio/wav');
          res.send(Buffer.from(result.audioData));
        } else {
          res.status(500).json({ error: 'Synthesis failed' });
        }
        synthesizer.close();
      },
      (error) => {
        console.error(error);
        res.status(500).json({ error: error });
        synthesizer.close();
      }
    );
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'TTS generation failed' });
  }
});

module.exports = router;
```

## Testing Without Backend

The CartoonAssistant automatically falls back to the browser's Web Speech API when the `/api/tts` endpoint is unavailable. This allows you to develop and test the frontend without implementing a backend initially.

## Deployment Considerations

1. **Caching**: Cache generated audio files by text hash to reduce API calls
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **CORS**: Configure CORS headers if API is on different domain
4. **Error Handling**: Return appropriate HTTP status codes
5. **Audio Format**: MP3 is widely supported, but WebM/Opus is more efficient

## Required npm packages

### Google Cloud:
```bash
npm install @google-cloud/text-to-speech
```

### Python (gTTS):
```bash
pip install gtts flask
```

### Azure:
```bash
npm install microsoft-cognitiveservices-speech-sdk
```
