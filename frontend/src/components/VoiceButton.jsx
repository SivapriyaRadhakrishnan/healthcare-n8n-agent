function VoiceButton({ listening, onToggle }) {
  return (
    <button
      type="button"
      className={`voice-btn ${listening ? 'listening' : ''}`}
      onClick={onToggle}
      aria-label="Toggle microphone"
    >
      <span className="voice-icon">🎙️</span>
    </button>
  );
}

export default VoiceButton;
