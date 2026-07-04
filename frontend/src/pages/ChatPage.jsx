import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import VoiceButton from '../components/VoiceButton';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { getSpeakerPreference, setSpeakerPreference } from '../utils/speech';
import { speakTextAzure, cancelAzureSpeech } from '../services/azureSpeech';

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL;
function ChatPage({ language }) {

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [speakerEnabled, setSpeakerEnabled] = useState(() => getSpeakerPreference());
  const endRef = useRef(null);

  const handleSend = useCallback(async (messageText = input, detectedLanguage = language) => {
    const trimmed = (messageText || '').trim();
    if (!trimmed || loading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    cancelAzureSpeech();

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          language: detectedLanguage || language,
          detectedLanguage: detectedLanguage || language,
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to reach the assistant');
      }

      const data = await response.json();
      const assistantReply =
        data.output ||
        data.text ||
        data.reply ||
        data.message ||
        "Sorry, I'm unable to respond right now.";
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: assistantReply,
        },
      ]);

      if (speakerEnabled) {
        speakTextAzure(assistantReply, {
          language: detectedLanguage || language,
          enabled: speakerEnabled,
          onError: (message) => {
            setVoiceError(message);
          },
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: 'assistant',
          content: "Sorry, I'm unable to respond right now.",
        },
      ]);
      setVoiceError('Unable to reach the assistant.');
    } finally {
      setLoading(false);
    }
  }, [input, language, loading, speakerEnabled]);

  const handleTranscript = useCallback((transcript, detectedLanguage) => {
    setInput(transcript);
    setVoiceError('');
    handleSend(transcript, detectedLanguage);
  }, [handleSend]);

  const handleVoiceError = useCallback((message) => {
    setVoiceError(message);
  }, []);

  const { isListening, startListening, stopListening } = useSpeechRecognition({
    language,
    onTranscript: handleTranscript,
    onError: handleVoiceError,
    onListeningChange: () => { },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const conversationTitle = useMemo(() => {
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    if (!latestUserMessage) return 'New Chat';
    return latestUserMessage.content.slice(0, 24) + (latestUserMessage.content.length > 24 ? '…' : '');
  }, [messages]);

  useEffect(() => {
    setSpeakerPreference(speakerEnabled);
  }, [speakerEnabled]);

  return (
    <div className="app-shell">
      <Sidebar
        conversations={messages.length ? [{ id: 0, title: conversationTitle, preview: 'Active conversation' }] : []}
        onNewChat={() => {
          setMessages([]);
          setInput('');
          setLoading(false);
        }}
      />

      <main className="chat-panel">
        <Header
          speakerEnabled={speakerEnabled}
          onSpeakerToggle={() => {
            setSpeakerEnabled((value) => !value);
            cancelAzureSpeech();
          }}
        />

        <section className="chat-area" aria-label="Healthcare assistant conversation">
          {messages.map((message) => (
            <MessageBubble key={message.id} role={message.role} content={message.content} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={endRef} />
        </section>

        <form
          className="input-bar"
          onSubmit={(event) => {
            event.preventDefault();
            handleSend();
          }}
        >
          <VoiceButton
            listening={isListening}
            onToggle={() => {
              if (isListening) {
                stopListening();
                return;
              }
              cancelAzureSpeech();
              startListening();
            }}
          />
          <textarea
            className="message-input"
            placeholder="Ask your healthcare question..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            rows={1}
          />
          <button type="submit" className="send-btn" disabled={loading || !input.trim()}>
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>

        {voiceError ? <p className="voice-status">{voiceError}</p> : null}
      </main>
    </div>
  );
}

export default ChatPage;
