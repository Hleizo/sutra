import { useEffect, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import Lottie from 'lottie-react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';

interface FeedbackOverlayProps {
  isCorrect?: boolean;
  hasAsymmetry?: boolean;
  hasLowRange?: boolean;
  symmetryPercentage?: number;
  rangeValue?: number;
  message?: string;
  showAnimation?: boolean;
  enableVoice?: boolean;
  language?: 'en' | 'ar';
}

type FeedbackType = 'success' | 'warning' | 'error' | 'neutral';

const FeedbackOverlay = ({
  isCorrect = false,
  hasAsymmetry = false,
  hasLowRange = false,
  symmetryPercentage,
  rangeValue,
  message,
  showAnimation = true,
  enableVoice = true,
  language = 'en',
}: FeedbackOverlayProps) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('neutral');
  const [displayMessage, setDisplayMessage] = useState<string>('');
  const [voiceMessage, setVoiceMessage] = useState<string>('');
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // Lottie animation data (success animation)
  const successAnimation = {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 60,
    w: 150,
    h: 150,
    nm: 'Success',
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: 'Check',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [75, 75, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: 0, s: [0, 0, 100] },
              { t: 20, s: [120, 120, 100] },
              { t: 30, s: [100, 100, 100] },
            ],
          },
        },
        ao: 0,
        shapes: [
          {
            ty: 'gr',
            it: [
              {
                ty: 'rc',
                d: 1,
                s: { a: 0, k: [60, 60] },
                p: { a: 0, k: [0, 0] },
                r: { a: 0, k: 30 },
              },
              {
                ty: 'fl',
                c: { a: 0, k: [0.3, 0.8, 0.3, 1] },
              },
            ],
          },
        ],
        ip: 0,
        op: 60,
        st: 0,
      },
    ],
  };



  // Arabic voice messages
  const arabicVoiceMessages = {
    excellent: 'شاطر! ممتاز!', // Great! Excellent!
    good: 'أحسنت!', // Well done!
    keepGoing: 'استمر!', // Keep going!
    tryAgain: 'حاول مرة أخرى', // Try again
    almostThere: 'تقريباً وصلت!', // Almost there!
    perfect: 'رائع جداً!', // Perfect!
  };

  // English voice messages
  const englishVoiceMessages = {
    excellent: 'Excellent!',
    good: 'Good job!',
    keepGoing: 'Keep going!',
    tryAgain: 'Try again',
    almostThere: 'Almost there!',
    perfect: 'Perfect!',
  };

  // Determine feedback type and message
  useEffect(() => {
    let type: FeedbackType = 'neutral';
    let msg = '';
    let voice = '';

    const messages = language === 'ar' ? arabicVoiceMessages : englishVoiceMessages;

    if (isCorrect) {
      type = 'success';
      msg = message || (language === 'ar' ? 'حركة ممتازة!' : 'Great movement!');
      voice = messages.excellent;
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    } else if (hasAsymmetry && hasLowRange) {
      type = 'error';
      msg =
        message ||
        (language === 'ar'
          ? 'حاول تحسين التماثل والمدى'
          : 'Improve symmetry and range');
      voice = messages.tryAgain;
    } else if (hasAsymmetry) {
      type = 'warning';
      msg =
        message ||
        (language === 'ar'
          ? `عدم تماثل: ${symmetryPercentage?.toFixed(1)}%`
          : `Asymmetry: ${symmetryPercentage?.toFixed(1)}%`);
      voice = messages.almostThere;
    } else if (hasLowRange) {
      type = 'warning';
      msg =
        message ||
        (language === 'ar'
          ? `مدى منخفض: ${rangeValue?.toFixed(0)}°`
          : `Low range: ${rangeValue?.toFixed(0)}°`);
      voice = messages.keepGoing;
    } else {
      type = 'neutral';
      msg = message || (language === 'ar' ? 'جيد، استمر!' : 'Good, keep going!');
      voice = messages.good;
    }

    setFeedbackType(type);
    setDisplayMessage(msg);
    setVoiceMessage(voice);
  }, [isCorrect, hasAsymmetry, hasLowRange, symmetryPercentage, rangeValue, message, language]);

  // Text-to-Speech using Web Speech API
  useEffect(() => {
    if (!enableVoice || !voiceMessage || voiceMessage === displayMessage) return;

    const speak = () => {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(voiceMessage);
      
      // Set language
      utterance.lang = language === 'ar' ? 'ar-SA' : 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 0.8;

      // Try to find an appropriate voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (voice) =>
          language === 'ar'
            ? voice.lang.startsWith('ar')
            : voice.lang.startsWith('en')
      );

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // Speak after a short delay to avoid overlapping messages
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 300);
    };

    // Load voices if not already loaded
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', speak, { once: true });
    } else {
      speak();
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [voiceMessage, enableVoice, language, displayMessage]);

  // Border color based on feedback type
  const getBorderColor = () => {
    switch (feedbackType) {
      case 'success':
        return '#4caf50'; // Green
      case 'warning':
        return '#ff9800'; // Orange
      case 'error':
        return '#f44336'; // Red
      default:
        return 'transparent';
    }
  };

  // Get icon based on feedback type
  const getIcon = () => {
    switch (feedbackType) {
      case 'success':
        return <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 32 }} />;
      case 'warning':
        return <WarningIcon sx={{ color: '#ff9800', fontSize: 32 }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#f44336', fontSize: 32 }} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Border Overlay - Green for correct, Red for incorrect */}
      {feedbackType !== 'neutral' && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: `6px solid ${getBorderColor()}`,
            borderRadius: 2,
            pointerEvents: 'none',
            zIndex: 15,
            animation: feedbackType === 'success' ? 'pulse 1s ease-in-out' : 'none',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 0.8 },
              '50%': { opacity: 0.4 },
            },
          }}
        />
      )}

      {/* Highlight Overlay for Errors/Warnings */}
      {(hasAsymmetry || hasLowRange) && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor:
              feedbackType === 'error'
                ? 'rgba(244, 67, 54, 0.15)'
                : 'rgba(255, 152, 0, 0.1)',
            pointerEvents: 'none',
            zIndex: 14,
          }}
        />
      )}

      {/* Feedback Message Box */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      >
        <Chip
          {...(getIcon() && { icon: getIcon()! })}
          label={displayMessage}
          sx={{
            bgcolor:
              feedbackType === 'success'
                ? 'rgba(76, 175, 80, 0.95)'
                : feedbackType === 'warning'
                ? 'rgba(255, 152, 0, 0.95)'
                : feedbackType === 'error'
                ? 'rgba(244, 67, 54, 0.95)'
                : 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontWeight: 600,
            fontSize: '1rem',
            px: 2,
            py: 2.5,
            height: 'auto',
            '& .MuiChip-label': {
              px: 1,
            },
          }}
        />
      </Box>

      {/* Lottie Animation - Success Celebration */}
      {showAnimation && showCelebration && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 25,
            pointerEvents: 'none',
          }}
        >
          <Lottie
            animationData={successAnimation}
            loop={false}
            style={{ width: 150, height: 150 }}
          />
        </Box>
      )}

      {/* Cartoon Assistant - Thumbs Up */}
      {showAnimation && isCorrect && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '50%',
              p: 1,
              boxShadow: 3,
            }}
          >
            <Typography
              sx={{
                fontSize: '4rem',
                animation: 'bounce 0.6s ease-in-out',
                '@keyframes bounce': {
                  '0%, 100%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.2)' },
                },
              }}
            >
              👍
            </Typography>
          </Box>
        </Box>
      )}

      {/* Encouraging Assistant for Warnings */}
      {showAnimation && feedbackType === 'warning' && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '50%',
              p: 1,
              boxShadow: 3,
            }}
          >
            <Typography
              sx={{
                fontSize: '3rem',
                animation: 'shake 0.5s ease-in-out',
                '@keyframes shake': {
                  '0%, 100%': { transform: 'rotate(0deg)' },
                  '25%': { transform: 'rotate(-10deg)' },
                  '75%': { transform: 'rotate(10deg)' },
                },
              }}
            >
              💪
            </Typography>
          </Box>
        </Box>
      )}

      {/* Encouraging Assistant for Errors */}
      {showAnimation && feedbackType === 'error' && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '50%',
              p: 1,
              boxShadow: 3,
            }}
          >
            <Typography sx={{ fontSize: '3rem' }}>🤔</Typography>
          </Box>
        </Box>
      )}

      {/* Additional Details for Developers */}
      {(symmetryPercentage !== undefined || rangeValue !== undefined) && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 80,
            right: 16,
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 2,
              px: 2,
              py: 1,
            }}
          >
            {symmetryPercentage !== undefined && (
              <Typography variant="caption" sx={{ color: 'white', display: 'block' }}>
                Symmetry: {symmetryPercentage.toFixed(1)}%
              </Typography>
            )}
            {rangeValue !== undefined && (
              <Typography variant="caption" sx={{ color: 'white', display: 'block' }}>
                Range: {rangeValue.toFixed(0)}°
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </>
  );
};

export { FeedbackOverlay };
export type { FeedbackOverlayProps };
