import React, { useRef, useState, useCallback, useEffect } from 'react'
import Lottie, { LottieRefCurrentProps } from 'lottie-react'
import { Box, IconButton, Tooltip } from '@mui/material'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import { playInstruction, AudioAmplitudeAnalyzer } from '../utils/audioUtils'

interface CartoonAssistantProps {
  /** Width of the assistant in pixels */
  size?: number
  /** Position: 'bottom-left' | 'bottom-right' | 'top-right' | 'top-left' */
  position?: 'bottom-left' | 'bottom-right' | 'top-right' | 'top-left'
  /** Callback when component is ready, passes speak function */
  onReady?: (speakFn: (text: string, lang?: string) => Promise<void>) => void
}

// Simple placeholder Lottie animation data (bouncing circle as fallback)
// In production, replace with actual character animation JSON
const placeholderAnimation = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 500,
  h: 500,
  nm: 'Assistant',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Face',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [250, 250, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 100, 100] },
            { t: 30, s: [110, 110, 100] },
            { t: 60, s: [100, 100, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'el',
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [200, 200] },
            },
            {
              ty: 'fl',
              c: { a: 0, k: [0.2, 0.6, 0.9, 1] },
              o: { a: 0, k: 100 },
            },
          ],
          nm: 'Head',
        },
        {
          ty: 'gr',
          it: [
            {
              ty: 'el',
              p: { a: 0, k: [-40, -20] },
              s: { a: 0, k: [20, 30] },
            },
            {
              ty: 'fl',
              c: { a: 0, k: [1, 1, 1, 1] },
              o: { a: 0, k: 100 },
            },
          ],
          nm: 'Left Eye',
        },
        {
          ty: 'gr',
          it: [
            {
              ty: 'el',
              p: { a: 0, k: [40, -20] },
              s: { a: 0, k: [20, 30] },
            },
            {
              ty: 'fl',
              c: { a: 0, k: [1, 1, 1, 1] },
              o: { a: 0, k: 100 },
            },
          ],
          nm: 'Right Eye',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'Mouth',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [250, 290, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 0,
          k: [100, 100, 100],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'rc',
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [60, 15] },
              r: { a: 0, k: 8 },
            },
            {
              ty: 'fl',
              c: { a: 0, k: [1, 0.3, 0.4, 1] },
              o: { a: 0, k: 100 },
            },
          ],
          nm: 'Mouth Shape',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
  ],
  markers: [],
}

export default function CartoonAssistant({ size = 200, position = 'bottom-right', onReady }: CartoonAssistantProps) {
  const lottieRef = useRef<LottieRefCurrentProps | null>(null)
  const analyzerRef = useRef<AudioAmplitudeAnalyzer | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [mouthScale, setMouthScale] = useState(1.0)

  // Position styles
  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 1000,
      pointerEvents: 'auto' as const,
    }

    switch (position) {
      case 'bottom-right':
        return { ...baseStyles, bottom: 20, right: 20 }
      case 'bottom-left':
        return { ...baseStyles, bottom: 20, left: 20 }
      case 'top-right':
        return { ...baseStyles, top: 20, right: 20 }
      case 'top-left':
        return { ...baseStyles, top: 20, left: 20 }
      default:
        return { ...baseStyles, bottom: 20, right: 20 }
    }
  }

  /**
   * Play instruction with lip sync
   */
  const speak = useCallback(async (text: string, lang: string = 'ar-SA') => {
    if (isSpeaking) {
      console.warn('Already speaking, ignoring new instruction')
      return
    }

    try {
      setIsSpeaking(true)

      // Get audio from TTS API
      const { audioBuffer, duration } = await playInstruction(text, { lang })

      if (audioBuffer) {
        // Initialize analyzer if needed
        if (!analyzerRef.current) {
          analyzerRef.current = new AudioAmplitudeAnalyzer()
        }

        // Play audio with amplitude-based lip sync
        await analyzerRef.current.play(audioBuffer, (amplitude) => {
          // Scale mouth based on amplitude (0-1 range)
          // Map amplitude to mouth scale: 1.0 (closed) to 1.5 (open)
          const scale = 1.0 + amplitude * 0.8
          setMouthScale(scale)

          // Make the character bounce slightly when speaking
          if (lottieRef.current) {
            const baseSpeed = 1
            const speedModifier = 1 + amplitude * 0.5
            lottieRef.current.setSpeed(baseSpeed * speedModifier)
          }
        })
      } else {
        // Fallback: simple mouth animation without audio buffer
        await simulateSpeaking(duration)
      }
    } catch (error) {
      console.error('Error playing instruction:', error)
    } finally {
      setIsSpeaking(false)
      setMouthScale(1.0)
      if (lottieRef.current) {
        lottieRef.current.setSpeed(1)
      }
    }
  }, [isSpeaking])

  /**
   * Simulate speaking animation when audio buffer is not available
   */
  const simulateSpeaking = (duration: number): Promise<void> => {
    return new Promise((resolve) => {
      const interval = 100
      const steps = Math.ceil((duration * 1000) / interval)
      let currentStep = 0

      const timer = setInterval(() => {
        currentStep++
        // Random mouth movement
        const scale = 1.0 + Math.random() * 0.5
        setMouthScale(scale)

        if (currentStep >= steps) {
          clearInterval(timer)
          resolve()
        }
      }, interval)
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (analyzerRef.current) {
        analyzerRef.current.dispose()
        analyzerRef.current = null
      }
    }
  }, [])

  // Expose speak method to parent via callback
  useEffect(() => {
    if (onReady) {
      onReady(speak)
    }
  }, [speak, onReady])

  return (
    <Box sx={getPositionStyles()}>
      <Box
        sx={{
          position: 'relative',
          width: size,
          height: size,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {/* Lottie Animation */}
        <Box
          sx={{
            width: size,
            height: size,
            position: 'relative',
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: isSpeaking ? '0 0 20px rgba(33, 150, 243, 0.5)' : '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'box-shadow 0.3s ease',
            bgcolor: '#ffffff',
          }}
        >
          <Lottie
            lottieRef={lottieRef}
            animationData={placeholderAnimation}
            loop={true}
            autoplay={true}
            style={{
              width: '100%',
              height: '100%',
              transform: `scaleY(${mouthScale})`,
              transition: 'transform 0.05s linear',
            }}
          />

          {/* Mouth overlay effect - scales with amplitude */}
          <Box
            sx={{
              position: 'absolute',
              bottom: '20%',
              left: '50%',
              transform: `translate(-50%, 0) scaleY(${mouthScale})`,
              width: 60,
              height: 15,
              bgcolor: isSpeaking ? 'rgba(255, 100, 100, 0.3)' : 'transparent',
              borderRadius: 2,
              transition: 'transform 0.05s linear, background-color 0.3s ease',
            }}
          />
        </Box>

        {/* Speaker Icon (debug/manual trigger) */}
        <Tooltip title="Test Speech">
          <IconButton
            size="small"
            onClick={() => speak('مرحبا! أنا هنا للمساعدة', 'ar-SA')}
            disabled={isSpeaking}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
              boxShadow: 2,
            }}
          >
            <VolumeUpIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

// Export the speak function type for external use
export type SpeakFunction = (text: string, lang?: string) => Promise<void>
