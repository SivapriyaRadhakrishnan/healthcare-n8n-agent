import { useCallback, useEffect, useMemo, useState ,useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import VoiceCallControls from '../components/VoiceCallControls';
import VoiceWaveform from '../components/VoiceWaveform';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { speakTextAzure, cancelAzureSpeech } from '../services/azureSpeech';

const transcriptMessages = [
    {
        role: 'assistant',
        content: 'Hello! Welcome to ABC Healthcare. How can I support your visit today?',
    },
    {
        role: 'patient',
        content: "I've had a fever since yesterday and want to check my next steps.",
    },
    {
        role: 'assistant',
        content: 'Understood. I can help with your appointment, care options, and nearby clinic hours.',
    },
];
const WEBHOOK_URL = "https://sivxxx.app.n8n.cloud/webhook-test/healthcare-assistant";
const pageTransition = {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, y: -18, transition: { duration: 0.25, ease: 'easeIn' } },
};

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function VoiceCallPage({ language }) {
    const [stage, setStage] = useState('welcome');
    const [duration, setDuration] = useState(0);
    const [mute, setMute] = useState(false);
    const [micOn, setMicOn] = useState(true);
    const [speakerOn, setSpeakerOn] = useState(true);
    const [speaking, setSpeaking] = useState(true);
    // `language` is received from props (App-level selection)
    const [transcript, setTranscript] = useState('');
    const [voiceError, setVoiceError] = useState('');

    const [assistantReply, setAssistantReply] = useState("");
    const [activeLanguage, setActiveLanguage] = useState(language || 'English');
    const sessionIdRef = useRef(crypto.randomUUID());

    const isEndingPhrase = (text) => {
        if (!text) return false;
        const t = text.toLowerCase();
        return /\b(bye|goodbye|end call|end the call|hang up|thank you|thanks)\b/.test(t);
    };

    const handleVoiceError = useCallback((message) => {
        setVoiceError(message);
    }, []);

    const sendMessageToAgent = async (text, detectedLanguage) => {
        const resolvedLanguage = detectedLanguage || activeLanguage || language || 'English';
        setActiveLanguage(resolvedLanguage);
        console.log("✅ User said:", text);
        try {
            console.log("➡️ Sending request to n8n...");
            const response = await fetch(WEBHOOK_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: text,
                    language: resolvedLanguage,
                    detectedLanguage: resolvedLanguage,
                    sessionId: sessionIdRef.current,
                }),
            });

            const data = await response.json();
            console.log("✅ n8n Response:", data);

            const reply =
    data.response ||
    data.output ||
    data.reply ||
    data.message ||
    data.text ||
    "No response";

setAssistantReply(reply);

// use the detected language or keep the current language
setActiveLanguage(resolvedLanguage);
            if (isListening) {
                await stopListening();
            }

            const speechHandled = speakTextAzure(reply, {
                language: resolvedLanguage,
                enabled: speakerOn,
                onStart: () => {
                    setSpeaking(true);
                },
                onEnd: () => {
                    setSpeaking(false);
                    if (stage === 'active') {
                        // small delay to avoid picking up TTS audio as user speech
                        setTimeout(() => {
                            startListening().catch(() => {});
                        }, 400);
                    }
                },
                onError: (message) => {
                    setVoiceError(message);
                    setSpeaking(false);
                    if (stage === 'active') {
                        setTimeout(() => {
                            startListening().catch(() => {});
                        }, 400);
                    }
                },
            });

            if (!speechHandled && stage === 'active') {
                setSpeaking(false);
                setTimeout(() => {
                    startListening().catch(() => {});
                }, 400);
            }
        } catch (err) {
            console.error(err);
            setVoiceError('Failed to send message to the webhook.');
            setSpeaking(false);
            if (stage === 'active') {
                setTimeout(() => {
                    startListening().catch(() => {});
                }, 400);
            }
        }
    };

    const handleTranscript = useCallback((text, detectedLanguage) => {
        setTranscript(text);
        setVoiceError("");

        if (isEndingPhrase(text)) {
            // send final utterance to agent, then end the call so recognition does not restart
            setStage('ended');
            sendMessageToAgent(text, detectedLanguage);
            return;
        }

        sendMessageToAgent(text, detectedLanguage);
    }, [language]);

    const {
        isListening,
        startListening,
        stopListening,
    } = useSpeechRecognition({
        language: activeLanguage,
        onTranscript: handleTranscript,
        onError: handleVoiceError,
        onListeningChange: () => { },
    });
    useEffect(() => {
        if (stage !== 'active') {
            return undefined;
        }
        const interval = window.setInterval(() => {
            setDuration((current) => current + 1);
        }, 1000);
        return () => window.clearInterval(interval);
    }, [stage]);

    useEffect(() => {
        if (stage !== 'connecting') {
            return undefined;
        }
        const connectionTimer = window.setTimeout(() => {
            setStage('active');
        }, 1600);
        return () => window.clearTimeout(connectionTimer);
    }, [stage]);
    useEffect(() => {
        console.log("Stage:", stage);
        console.log("Mic:", micOn);

        if (stage !== "active") {
            console.log("Not active");
            setSpeaking(false);
            return;
        }

        console.log("Starting Azure recognition...");

        cancelAzureSpeech();

        if (micOn) {
            startListening();
        }

        setSpeaking(true);
    }, [stage, startListening, micOn]);

    useEffect(() => {
        if (stage !== 'active') return undefined;
        if (!micOn && isListening) {
            stopListening();
        }
        if (micOn && !isListening) {
            startListening();
        }
        return undefined;
    }, [micOn, isListening, stage, startListening, stopListening]);

    const handleStart = () => {
        setStage('connecting');
        setDuration(0);
    };

    const handleEndCall = () => {
        setStage('ended');
        setSpeaking(false);
        stopListening();
        cancelAzureSpeech();
    };

    const handleReset = () => {
        setStage('welcome');
        setDuration(0);
        setMute(false);
        setMicOn(true);
        setSpeakerOn(true);
        setSpeaking(true);
        setActiveLanguage(language || 'English');
    };




    const statusLabel = stage === 'active' ? 'Connected' : stage === 'connecting' ? 'Connecting' : 'Ready';

    return (
        <AnimatePresence mode="wait">
            <motion.main className="voice-page" {...pageTransition}>
                <div className="voice-shell">
                    <header className="voice-header">
                        <div>
                            <p className="voice-brand-label">ABC Healthcare</p>
                            <h1 className="voice-title">Healthcare Voice Agent</h1>
                            <p className="voice-description">
                                Speak naturally. I&apos;m here to help with appointments, hospital information, and general healthcare assistance.
                            </p>
                        </div>
                        <div className="voice-header-actions">
                            <span className="voice-badge online">Online</span>
                            <Link to="/" className="voice-link-back">
                                Back to chat
                            </Link>
                        </div>
                    </header>

                    {stage === 'welcome' && (
                        <motion.section
                            className="voice-hero-card"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                        >
                            <div className="avatar-stack">
                                <div className="avatar-ring">
                                    <div className="avatar-symbol">🩺</div>
                                </div>
                            </div>

                            <div className="voice-hero-copy">
                                <p className="voice-hero-eyebrow">Premium AI Care</p>
                                <h2>Simulate a real voice consultation with confidence.</h2>
                                <p>Launch a guided voice call flow with a refined healthcare agent experience.</p>
                            </div>

                            <motion.button
                                type="button"
                                className="voice-primary-btn"
                                whileHover={{ y: -2, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleStart}
                            >
                                Start Voice Call
                            </motion.button>
                        </motion.section>
                    )}

                    {stage === 'connecting' && (
                        <motion.section
                            className="voice-connecting-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                        >
                            <div className="connecting-ring">
                                <div className="connecting-pulse" />
                                <div className="connecting-inner">
                                    <span className="connecting-icon">📞</span>
                                </div>
                            </div>
                            <div className="connecting-copy">
                                <p className="eyebrow">Connecting</p>
                                <h2>Connecting your healthcare voice call</h2>
                                <p>Please wait while your agent prepares your consultation.</p>
                            </div>
                        </motion.section>
                    )}

                    {stage === 'active' && (
                        <motion.section
                            className="voice-call-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                        >
                            <div className="call-center-pane">
                                <div className="call-avatar-card">
                                    <motion.div
                                        className="call-avatar-ring"
                                        animate={speaking ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                                        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                                    >
                                        <motion.div
                                            className="call-avatar"
                                            animate={speaking ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                                            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                                        >
                                            <span>💬</span>
                                        </motion.div>
                                    </motion.div>
                                    <div className="call-avatar-caption">
                                        <span>Listening for your next message</span>
                                    </div>
                                    <div className={`mic-state-pill ${micOn ? (isListening ? 'active' : 'ready') : 'muted'}`}>
                                        {micOn ? (isListening ? 'Microphone active' : 'Microphone ready') : 'Microphone muted'}
                                    </div>
                                    {transcript && (
                                        <p
                                            style={{
                                                marginTop: 12,
                                                color: '#2563eb',
                                                fontWeight: 600,
                                                textAlign: 'center',
                                            }}
                                        >
                                            You: {transcript}
                                        </p>
                                    )}
                                    {assistantReply && (
                                        <p
                                            style={{
                                                marginTop: 10,
                                                color: "#16a34a",
                                                fontWeight: 600,
                                                textAlign: "center",
                                            }}
                                        >
                                            AI: {assistantReply}
                                        </p>
                                    )}
                                </div>

                                <div className="call-status-panel">
                                    <div className="status-row">
                                        <div>
                                            <p className="status-label">Call timer</p>
                                            <p className="status-value">{formatDuration(duration)}</p>
                                        </div>
                                        <div>
                                            <p className="status-label">Connection</p>
                                            <p className="status-value soft">{statusLabel}</p>
                                        </div>
                                    </div>

                                    <div className="indicator-grid">
                                        <div className="indicator-pill active">
                                            <span className="indicator-dot" /> Speaking
                                        </div>
                                        <div className="indicator-pill listening">
                                            <span className="indicator-dot" /> Listening
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="waveform-shell">
                                <VoiceWaveform active={stage === 'active'} />
                            </div>

                            <VoiceCallControls
                                mute={mute}
                                micOn={micOn}
                                speakerOn={speakerOn}
                                onToggleMute={() => setMute((value) => !value)}
                                onToggleMic={() => setMicOn((value) => !value)}
                                onToggleSpeaker={() => setSpeakerOn((value) => !value)}
                                onEndCall={handleEndCall}
                            />

                            {/* <section className="transcript-panel" aria-label="Live transcript">
                <div className="transcript-header">
                  <div>
                    <p className="eyebrow">Live transcript</p>
                    <h3>Recent call highlights</h3>
                  </div>
                  <span className="transcript-pill">3 items</span>
                </div>
                <div className="transcript-list">
                  {transcriptMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`transcript-bubble ${message.role === 'assistant' ? 'assistant' : 'patient'}`}
                    >
                      <span className="transcript-role">{message.role === 'assistant' ? 'AI' : 'Patient'}</span>
                      <p>{message.content}</p>
                    </div>
                  ))}
                </div>
              </section> */}
                        </motion.section>
                    )}

                    {stage === 'ended' && (
                        <motion.section
                            className="voice-end-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                        >
                            <div className="end-card-content">
                                <div className="end-avatar-ring">
                                    <span>✅</span>
                                </div>
                                <div>
                                    <p className="eyebrow">Call ended</p>
                                    <h2>Voice call complete</h2>
                                    <p>Review your session summary and restart whenever you are ready.</p>
                                </div>
                            </div>

                            <div className="end-summary-grid">
                                <div className="summary-tile">
                                    <span>Call duration</span>
                                    <strong>{formatDuration(duration)}</strong>
                                </div>
                                <div className="summary-tile">
                                    <span>Summary</span>
                                    <p>Patient fever timeline, appointment readiness, and care instructions placeholder.</p>
                                </div>
                            </div>

                            <motion.button
                                type="button"
                                className="voice-primary-btn"
                                whileHover={{ y: -1, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleReset}
                            >
                                Start New Call
                            </motion.button>
                        </motion.section>
                    )}
                </div>
            </motion.main>
        </AnimatePresence>
    );
}

export default VoiceCallPage;
