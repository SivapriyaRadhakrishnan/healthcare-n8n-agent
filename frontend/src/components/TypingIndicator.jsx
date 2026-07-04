function TypingIndicator() {
  return (
    <div className="message-row assistant-row">
      <div className="message-bubble assistant typing-bubble" aria-label="Assistant is typing">
        <span className="typing-text">AI is typing...</span>
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}

export default TypingIndicator;
