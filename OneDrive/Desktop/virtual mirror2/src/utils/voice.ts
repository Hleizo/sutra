/**
 * Web Speech API voice helper for task coaching
 * Supports Arabic voice with fallback to default
 */

let currentUtterance: SpeechSynthesisUtterance | null = null;

interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

/**
 * Speak text using Web Speech API
 * Queue-safe: cancels previous utterance before speaking
 */
export async function speak(
  text: string,
  opts: SpeakOptions = {}
): Promise<void> {
  // Guard: check if synthesis is supported
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser');
    return;
  }

  const synthesis = window.speechSynthesis;

  // Cancel any ongoing speech
  if (currentUtterance) {
    synthesis.cancel();
    currentUtterance = null;
  }

  // Create new utterance
  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;

  // Set options with defaults
  utterance.lang = opts.lang || 'ar-SA';
  utterance.rate = opts.rate ?? 1.0;
  utterance.pitch = opts.pitch ?? 1.0;
  utterance.volume = opts.volume ?? 1.0;

  // Try to find preferred Arabic voice
  const voices = synthesis.getVoices();
  let preferredVoice = voices.find(
    (v) => v.lang === 'ar-SA' || v.lang.startsWith('ar')
  );

  // Fallback to any available voice if no Arabic voice found
  if (!preferredVoice && voices.length > 0) {
    preferredVoice = voices[0];
    console.log('No Arabic voice found, using default:', preferredVoice.name);
  }

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  // Return promise that resolves when speech ends
  return new Promise((resolve) => {
    utterance.onend = () => {
      currentUtterance = null;
      resolve();
    };

    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error);
      currentUtterance = null;
      resolve();
    };

    // Load voices if not loaded yet (some browsers need this)
    if (voices.length === 0) {
      synthesis.addEventListener('voiceschanged', () => {
        synthesis.speak(utterance);
      }, { once: true });
    } else {
      synthesis.speak(utterance);
    }
  });
}

/**
 * Cancel any ongoing speech
 */
export function cancelSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}
