/**
 * Audio utilities for TTS and lip sync
 */

export interface TTSOptions {
  lang?: string
  rate?: number
  pitch?: number
}

/**
 * Calls the TTS API endpoint to get audio for the given text.
 * If API is not available, falls back to Web Speech API.
 * 
 * @param text - The text to convert to speech
 * @param options - Optional TTS configuration
 * @returns Promise<AudioBuffer> - The audio buffer to play
 */
export async function playInstruction(
  text: string,
  options: TTSOptions = {}
): Promise<{ audioBuffer: AudioBuffer | null; duration: number }> {
  const { lang = 'ar-SA', rate = 1.0, pitch = 1.0 } = options

  try {
    // Try to fetch from TTS API endpoint
    const url = `/api/tts?text=${encodeURIComponent(text)}&lang=${lang}&rate=${rate}&pitch=${pitch}`
    const response = await fetch(url)

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer()
      const audioContext = new AudioContext()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      return { audioBuffer, duration: audioBuffer.duration }
    } else {
      console.warn('TTS API not available, falling back to Web Speech API')
      return fallbackToWebSpeech(text, lang, rate, pitch)
    }
  } catch (error) {
    console.warn('TTS API error, falling back to Web Speech API:', error)
    return fallbackToWebSpeech(text, lang, rate, pitch)
  }
}

/**
 * Fallback to Web Speech API when TTS endpoint is unavailable
 */
function fallbackToWebSpeech(
  text: string,
  lang: string,
  rate: number,
  pitch: number
): Promise<{ audioBuffer: AudioBuffer | null; duration: number }> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'))
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = rate
    utterance.pitch = pitch

    // Try to find appropriate voice
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]))
    if (voice) {
      utterance.voice = voice
    }

    // Estimate duration (rough approximation)
    const wordsPerMinute = 150 * rate
    const words = text.split(/\s+/).length
    const estimatedDuration = (words / wordsPerMinute) * 60

    utterance.onend = () => {
      resolve({ audioBuffer: null, duration: estimatedDuration })
    }

    utterance.onerror = (error) => {
      reject(error)
    }

    window.speechSynthesis.speak(utterance)
  })
}

/**
 * Analyzes audio amplitude in real-time for lip sync
 */
export class AudioAmplitudeAnalyzer {
  private audioContext: AudioContext
  private analyser: AnalyserNode
  private dataArray: Uint8Array<ArrayBuffer>
  private source: AudioBufferSourceNode | null = null
  private animationFrameId: number | null = null
  private onAmplitudeChange: ((amplitude: number) => void) | null = null

  constructor() {
    this.audioContext = new AudioContext()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256
    const bufferLength = this.analyser.frequencyBinCount
  this.dataArray = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>
  }

  /**
   * Play audio buffer and analyze amplitude for lip sync
   */
  async play(
    audioBuffer: AudioBuffer,
    onAmplitudeChange: (amplitude: number) => void
  ): Promise<void> {
    this.stop() // Stop any existing playback

    this.onAmplitudeChange = onAmplitudeChange

    // Create source node
    this.source = this.audioContext.createBufferSource()
    this.source.buffer = audioBuffer

    // Connect: source -> analyser -> destination
    this.source.connect(this.analyser)
    this.analyser.connect(this.audioContext.destination)

    // Start playback
    this.source.start(0)

    // Start amplitude analysis loop
    this.analyzeAmplitude()

    // Return promise that resolves when audio finishes
    return new Promise((resolve) => {
      if (this.source) {
        this.source.onended = () => {
          this.stop()
          resolve()
        }
      }
    })
  }

  /**
   * Continuously analyze audio amplitude
   */
  private analyzeAmplitude = () => {
    if (!this.onAmplitudeChange) return

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray)

    // Calculate average amplitude (0-1 range)
    let sum = 0
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i]
    }
    const average = sum / this.dataArray.length / 255

    // Notify listener
    this.onAmplitudeChange(average)

    // Continue loop
    this.animationFrameId = requestAnimationFrame(this.analyzeAmplitude)
  }

  /**
   * Stop playback and analysis
   */
  stop() {
    if (this.source) {
      try {
        this.source.stop()
      } catch (e) {
        // Already stopped
      }
      this.source.disconnect()
      this.source = null
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    if (this.onAmplitudeChange) {
      this.onAmplitudeChange(0) // Reset to idle
    }
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.stop()
    this.analyser.disconnect()
    this.audioContext.close()
  }
}
