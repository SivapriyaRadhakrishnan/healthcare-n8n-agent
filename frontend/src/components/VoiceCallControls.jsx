import { motion } from 'framer-motion';

function VoiceCallControls({ mute, micOn, speakerOn, onToggleMute, onToggleMic, onToggleSpeaker, onEndCall }) {
  return (
    <div className="call-controls">
      <motion.button
        type="button"
        className={`control-button ${mute ? 'active' : ''}`}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={onToggleMute}
      >
        <span className="control-icon">{mute ? '🔇' : '🔊'}</span>
        Mute
      </motion.button>

      <motion.button
        type="button"
        className={`control-button ${micOn ? 'active' : ''}`}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={onToggleMic}
      >
        <span className="control-icon">{micOn ? '🎙️' : '🛑'}</span>
        Mic
      </motion.button>

      <motion.button
        type="button"
        className={`control-button ${speakerOn ? 'active' : ''}`}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={onToggleSpeaker}
      >
        <span className="control-icon">{speakerOn ? '🔈' : '🔕'}</span>
        Speaker
      </motion.button>

      <motion.button
        type="button"
        className="control-button end-call"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={onEndCall}
      >
        <span className="control-icon">⛔</span>
        End Call
      </motion.button>
    </div>
  );
}

export default VoiceCallControls;
