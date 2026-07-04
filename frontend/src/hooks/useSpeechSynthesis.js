import { useEffect, useRef } from 'react';

export function useSpeechSynthesis() {
  const synthRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const speak = (text) => {
    if (!text || !synthRef.current) return;

    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = 'en-US';
    synthRef.current.speak(utterance);
  };

  const cancel = () => {
    synthRef.current?.cancel();
  };

  return { speak, cancel };
}
