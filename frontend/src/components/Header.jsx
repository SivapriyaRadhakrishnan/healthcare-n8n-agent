import hospitalLogo from '../assets/hospital-logo.svg';

function Header({ speakerEnabled, onSpeakerToggle }) {
  return (
    <header className="app-header">
      <div className="brand-block">
        <img src={hospitalLogo} alt="Hospital logo" className="brand-logo" />
        <div>
          <p className="eyebrow">Care coordination</p>
          <h1>Healthcare Voice Assistant</h1>
        </div>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className={`speaker-toggle ${speakerEnabled ? 'enabled' : ''}`}
          onClick={onSpeakerToggle}
          aria-label="Toggle speaker output"
        >
          {speakerEnabled ? '🔊' : '🔈'}
        </button>
        <span className="status-pill">
          <span className="status-dot" /> Online
        </span>
      </div>
    </header>
  );
}

export default Header;
