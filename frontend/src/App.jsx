import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import VoiceCallPage from './pages/VoiceCallPage';
import './styles/app.css';

function App() {
  const [language, setLanguage] = React.useState('English');

  return (
    <Router>
      <Routes>
        <Route path="/" element={<ChatPage language={language} setLanguage={setLanguage} />} />
        <Route path="/voice-call" element={<VoiceCallPage language={language} />} />
      </Routes>
    </Router>
  );
}

export default App;
