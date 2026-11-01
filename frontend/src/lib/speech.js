/**
 * Web Speech API wrappers for Voice Input (STT) and Read-Aloud (TTS)
 */

export const isSTTSupported = () => {
  return typeof window !== 'undefined' && Boolean(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );
};

export const isTTSSupported = () => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

/**
 * Start speech recognition listener
 */
export function startVoiceRecognition({ onResult, onError, onEnd, lang = 'en-US' }) {
  if (!isSTTSupported()) {
    onError?.('Speech recognition is not supported in this browser. Please try Chrome or Edge.');
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = lang === 'bn' ? 'bn-BD' : 'en-US';

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    onResult?.(transcript);
  };

  recognition.onerror = (event) => {
    console.warn('[Web Speech Error]:', event.error);
    onError?.(event.error === 'not-allowed' ? 'Microphone permission denied.' : event.error);
  };

  recognition.onend = () => {
    onEnd?.();
  };

  recognition.start();
  return recognition;
}

/**
 * Text-to-speech read aloud
 */
export function speakText(text, { lang = 'en-US', onStart, onEnd } = {}) {
  if (!isTTSSupported()) {
    console.warn('Text-to-speech is not supported in this browser.');
    return;
  }

  window.speechSynthesis.cancel(); // Stop any ongoing speech

  const cleanText = text.replace(/[*#_`>]/g, ' ').slice(0, 1500); // Clean markdown
  const utterance = new SpeechSynthesisUtterance(cleanText);

  // Auto-detect or select voice
  const voices = window.speechSynthesis.getVoices();
  if (lang === 'bn') {
    const bengaliVoice = voices.find(v => v.lang.startsWith('bn'));
    if (bengaliVoice) utterance.voice = bengaliVoice;
    utterance.lang = 'bn-BD';
  } else {
    const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
    if (naturalVoice) utterance.voice = naturalVoice;
    utterance.lang = 'en-US';
  }

  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (isTTSSupported()) {
    window.speechSynthesis.cancel();
  }
}

