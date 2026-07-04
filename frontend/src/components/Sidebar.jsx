function Sidebar({ conversations, onNewChat }) {
  return (
    <aside className="sidebar">
      <button type="button" className="new-chat-btn" onClick={onNewChat}>
        + New Chat
      </button>

      <div className="sidebar-section">
        <p className="section-title">Conversation History</p>
        {conversations.length > 0 ? (
          <ul className="history-list">
            {conversations.map((conversation) => (
              <li key={conversation.id} className="history-item">
                <strong>{conversation.title}</strong>
                <span>{conversation.preview}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="history-empty">Start a new conversation to see it here.</p>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
