import { useCallback, useEffect, useRef, useState } from 'react';
import { createAzureSpeechRecognizer, isAzureSpeechConfigured } from '../services/azureSpeech';

export function useSpeechRecognition({ language, onTranscript, onError, onListeningChange }) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const recognizerRef = useRef(null);
  const lastTranscriptRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (!isAzureSpeechConfigured()) {
      const message = 'Azure Speech is not configured. Please set VITE_AZURE_SPEECH_KEY and VITE_AZURE_SPEECH_REGION.';
      setError(message);
      onError?.(message);
      return undefined;
    }

    const recognizer = createAzureSpeechRecognizer({
      language,
      onTranscript: (transcript, detectedLanguage) => {
        if (!transcript) return;
        if (transcript === lastTranscriptRef.current) return;
        lastTranscriptRef.current = transcript;
        onTranscript?.(transcript, detectedLanguage);
      },
      onError: (message) => {
        setError(message);
        onError?.(message);
      },
      onListeningChange: (value) => {
        setIsListening(value);
        onListeningChange?.(value);
      },
    });

    recognizerRef.current = recognizer;

    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.stop().finally(() => {
          recognizerRef.current?.dispose();
          recognizerRef.current = null;
        });
      }
    };
  }, [language, onTranscript, onError, onListeningChange]);

  const startListening = useCallback(async () => {
    console.log("startListening() called");
    const recognizer = recognizerRef.current;
    console.log("Recognizer object:", recognizer);

if (recognizer) {
    console.log("start function:", recognizer.start);
}
    if (!recognizer) {
      console.log("Recognizer is NULL");
      const message = 'Azure speech recognition is not available.';
      setError(message);
      onError?.(message);
      return;
    }

    lastTranscriptRef.current = '';
    setError('');

    try {
      await recognizer.start();
    } catch (err) {
      const message = err?.message || 'Failed to start speech recognition.';
      setError(message);
      onError?.(message);
    }
  }, [onError]);

  const stopListening = useCallback(async () => {
    const recognizer = recognizerRef.current;
    if (!recognizer) return;

    try {
      await recognizer.stop();
    } catch (err) {
      const message = err?.message || 'Failed to stop speech recognition.';
      setError(message);
      onError?.(message);
    }
  }, [onError]);

  return { isListening, error, startListening, stopListening };
}
