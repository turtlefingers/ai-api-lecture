import React, { useState } from 'react';
import { useApiKey } from '../hooks/useApiKey';
import { ApiKeyManager } from '../lib/apiKeyManager';
import { HelpCircle } from 'lucide-react';

const MODELS = [
  { id: 'gemini-2.5-flash-lite', name: 'gemini-2.5-flash-lite', desc: '실습 최적 (모든 고급 기능 지원, 최고의 안정성)', rpm: '15 RPM', rpd: '1,000 RPD', tpm: '250,000 TPM' },
  { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash', desc: '범용 표준 모델 (모든 고급 기능 지원, 답변 품질 우수)', rpm: '10 RPM', rpd: '250 RPD', tpm: '250,000 TPM' },
  { id: 'gemini-3.1-flash-lite', name: 'gemini-3.1-flash-lite', desc: '최신 프리뷰 모델 (구글 검색 그라운딩 미지원)', rpm: '15 RPM', rpd: '1,000 RPD', tpm: '250,000 TPM' },
];

const MODEL_CAPABILITIES = {
  'gemini-2.5-flash': {
    structuredOutputs: { supported: true },
    codeExecution: { supported: true },
    functionCalling: { supported: true },
    googleSearch: { supported: true },
    googleMaps: { supported: true },
    urlContext: { supported: true }
  },
  'gemini-2.5-flash-lite': {
    structuredOutputs: { supported: true },
    codeExecution: { supported: true },
    functionCalling: { supported: true },
    googleSearch: { supported: true },
    googleMaps: { supported: true },
    urlContext: { supported: true }
  },
  'gemini-3.1-flash-lite': {
    structuredOutputs: { supported: true },
    codeExecution: { supported: true },
    functionCalling: { supported: true },
    googleSearch: { supported: false, reason: '무료 등급 할당량 제한' },
    googleMaps: { supported: true },
    urlContext: { supported: true }
  }
};

export default function SettingsTab({ settings, setSettings }) {
  const { key, status, error, save, clear } = useApiKey('gemini');
  const [inputKey, setInputKey] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);

  const handleSaveKey = (e) => {
    e.preventDefault();
    if (save(inputKey)) {
      setInputKey('');
    }
  };

  const handleToggle = (opt) => {
    setSettings(prev => ({ ...prev, [opt]: !prev[opt] }));
  };

  return (
    <div className="settings-tab" style={{ padding: '24px', overflowY: 'auto', width: '100%' }}>
      <h2>설정</h2>
      
      <div className="card" style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <h3 style={{ margin: 0 }}>API Key 설정</h3>
          <div 
            style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <HelpCircle size={18} style={{ color: showTooltip ? 'var(--primary-color)' : 'var(--text-secondary)', transition: 'color 0.2s' }} />
            {showTooltip && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                left: '-10px',
                background: '#1e293b',
                color: 'white',
                padding: '14px 18px',
                borderRadius: '10px',
                width: '290px',
                fontSize: '12.5px',
                lineHeight: '1.5',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                zIndex: 1000,
                pointerEvents: 'none',
                whiteSpace: 'normal',
                fontWeight: 'normal',
                animation: 'fadeIn 0.2s ease',
                border: '1px solid #334155'
              }}>
                <strong style={{ display: 'block', marginBottom: '6px', color: '#fbbf24', fontSize: '13px' }}>🔒 보안 및 저장 안전성 안내</strong>
                입력하신 API Key는 외부 서버로 절대로 수집/유출되지 않으며, 오직 학생 개인의 브라우저 <strong>localStorage</strong>에만 안전하게 암호화 보존됩니다.<br />
                <span style={{ color: '#94a3b8', fontSize: '11.5px', marginTop: '6px', display: 'block', borderTop: '1px solid #334155', paddingTop: '6px' }}>
                  * 브라우저 캐시를 지우거나 아래의 '삭제' 버튼을 클릭하면 브라우저에서 영구 삭제됩니다.
                </span>
                {/* Arrow pointing UP */}
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '19px',
                  transform: 'translateX(-50%)',
                  width: '0',
                  height: '0',
                  borderStyle: 'solid',
                  borderWidth: '0 8px 8px 8px',
                  borderColor: 'transparent transparent #1e293b transparent'
                }} />
              </div>
            )}
          </div>
        </div>
        {key ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
            <span style={{ fontFamily: 'monospace', background: 'var(--gray-100)', padding: '8px 12px', borderRadius: '6px' }}>
              {ApiKeyManager.maskKey(key)}
            </span>
            <button onClick={clear} style={{ background: 'var(--gray-200)', border: 'none', padding: '8px 16px', borderRadius: '6px', color: 'var(--text-primary)' }}>
              삭제
            </button>
          </div>
        ) : (
          <form onSubmit={handleSaveKey} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {status === 'expired' && <div style={{ color: 'red' }}>API Key가 만료됐습니다. 다시 입력해주세요.</div>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="AIza로 시작하는 Gemini API Key 입력"
                style={{ flex: 1 }}
              />
              <button type="submit" style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px' }}>
                저장
              </button>
            </div>
            {error && <div style={{ color: 'red', fontSize: '14px' }}>{error}</div>}
          </form>
        )}
      </div>

      <div className="card" style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <h3>모델 선택</h3>
        <select 
          value={settings.model} 
          onChange={(e) => {
            const nextModel = e.target.value;
            const caps = MODEL_CAPABILITIES[nextModel] || {};
            setSettings(prev => {
              const updated = { ...prev, model: nextModel };
              Object.keys(caps).forEach(key => {
                if (caps[key] && !caps[key].supported) {
                  updated[key] = false;
                }
              });
              return updated;
            });
          }}
          style={{ width: '100%', marginTop: '16px', marginBottom: '16px' }}
        >
          {MODELS.map(m => (
            <option key={m.id} value={m.id}>{m.name} - {m.desc}</option>
          ))}
        </select>

        {settings.model === 'gemini-3.1-flash-lite' && (
          <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', color: '#1e40af', padding: '14px 18px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>ℹ️ 일부 고급 옵션 자동 제한 안내</span>
            <span style={{ fontSize: '13px', opacity: 0.9 }}>최신 경량 프리뷰 모델은 무료 등급 API Key에서 실시간 웹 검색 그라운딩 도구 호출 시 429 할당량 제한 오류가 유발되므로, 구글 검색 그라운딩 기능만 비활성화 처리됩니다. (지도는 사용 가능)</span>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--gray-100)' }}>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Model ID</th>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>특징</th>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>RPM</th>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>RPD</th>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>TPM</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map(m => (
                <tr key={m.id} style={{ background: settings.model === m.id ? 'var(--blue-50)' : 'transparent' }}>
                  <td style={{ padding: '8px', borderBottom: '1px solid var(--gray-200)', fontWeight: settings.model === m.id ? '600' : 'normal' }}>{m.name}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid var(--gray-200)' }}>{m.desc}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid var(--gray-200)' }}>{m.rpm}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid var(--gray-200)' }}>{m.rpd}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid var(--gray-200)' }}>{m.tpm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h3>고급 옵션 설정</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          {[
            { id: 'structuredOutputs', label: 'Structured outputs' },
            { id: 'codeExecution', label: 'Code execution' },
            { id: 'functionCalling', label: 'Function calling (함수 탭 참고)' },
            { id: 'googleSearch', label: 'Grounding with Google Search' },
            { id: 'googleMaps', label: 'Grounding with Google Maps' },
            { id: 'urlContext', label: 'URL context' }
          ].map(opt => {
            const caps = MODEL_CAPABILITIES[settings.model] || {};
            const optionCap = caps[opt.id] || { supported: true };
            const isDisabled = !optionCap.supported;
            const reason = optionCap.reason || '';

            return (
              <label 
                key={opt.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  padding: '4px 0'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={settings[opt.id]} 
                  disabled={isDisabled}
                  onChange={() => !isDisabled && handleToggle(opt.id)} 
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)' }}
                />
                <span style={{ fontSize: '15px', color: isDisabled ? 'var(--text-secondary)' : 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  {opt.label}
                  {isDisabled && (
                    <span style={{ 
                      fontSize: '11px', 
                      background: '#fee2e2', 
                      color: '#b91c1c', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontWeight: '600',
                      border: '1px solid #fca5a5'
                    }}>
                      {reason}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
