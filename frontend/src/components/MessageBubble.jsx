function MessageBubble({ role, content }) {
  return (
    <div className={`message-row ${role === 'user' ? 'user-row' : 'assistant-row'}`}>
      <div className={`message-bubble ${role === 'user' ? 'user' : 'assistant'}`}>
        {content}
      </div>
    </div>
  );
}

export default MessageBubble;
