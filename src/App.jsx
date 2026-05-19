import React, { useState } from 'react';
import { MessageSquare, Wrench, Settings } from 'lucide-react';
import './App.css';
import ChatTab from './components/ChatTab';
import ToolsTab from './components/ToolsTab';
import SettingsTab from './components/SettingsTab';

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  
  // 글로벌 상태
  const [settings, setSettings] = useState({
    model: 'gemini-2.5-flash-lite',
    structuredOutputs: false,
    codeExecution: false,
    functionCalling: true,
    googleSearch: false,
    googleMaps: false,
    urlContext: false
  });

  const [enabledTools, setEnabledTools] = useState({
    getWeather: true,
    getCountry: true,
    playMelody: true
  });

  return (
    <div className="app-container">
      <nav className="sidebar">
        <button 
          className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={24} />
          <span>AI 채팅</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          <Wrench size={24} />
          <span>함수</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={24} />
          <span>환경설정</span>
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'chat' && (
          <div className="tab-container">
            <ChatTab settings={settings} enabledTools={enabledTools} />
          </div>
        )}
        {activeTab === 'tools' && (
          <div className="tab-container">
            <ToolsTab enabledTools={enabledTools} setEnabledTools={setEnabledTools} settings={settings} />
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="tab-container">
            <SettingsTab settings={settings} setSettings={setSettings} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
