const SPEAKER_STORAGE_KEY = 'healthcare-voice-speaker';

export function getSpeakerPreference() {
  if (typeof window === 'undefined') return true;

  const storedValue = window.localStorage.getItem(SPEAKER_STORAGE_KEY);
  if (storedValue === null) return true;

  return storedValue === 'true';
}

export function setSpeakerPreference(enabled) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SPEAKER_STORAGE_KEY, String(enabled));
}

export function isSpeechSynthesisSupported() {
  return typeof window !== 'undefined';
}
