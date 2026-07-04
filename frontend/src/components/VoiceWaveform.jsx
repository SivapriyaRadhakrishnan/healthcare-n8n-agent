import { motion } from 'framer-motion';

const waveLevels = [1, 0.82, 0.66, 0.95, 0.7, 0.85, 1];

function VoiceWaveform({ active }) {
  return (
    <div className="voice-waveform" aria-hidden="true">
      {waveLevels.map((level, index) => (
        <motion.span
          key={index}
          className="wave-bar"
          animate={active ? { scaleY: [0.7, 1.2, 0.75] } : { scaleY: 0.85 }}
          transition={{ duration: 1.2 + index * 0.08, repeat: Infinity, ease: 'easeInOut' }}
          style={{ height: `${36 * level + 12}px` }}
        />
      ))}
    </div>
  );
}

export default VoiceWaveform;
