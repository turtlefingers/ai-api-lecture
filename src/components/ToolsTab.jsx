import React from 'react';
import { TOOLS_DECLARATIONS } from '../lib/tools';

export default function ToolsTab({ enabledTools, setEnabledTools, settings }) {
  const isEnabled = settings?.functionCalling !== false;

  const handleToggle = (toolName) => {
    if (!isEnabled) return;
    setEnabledTools(prev => ({ ...prev, [toolName]: !prev[toolName] }));
  };

  return (
    <div className="tools-tab" style={{ padding: '24px', overflowY: 'auto', width: '100%' }}>
      <h2>함수 관리</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        AI가 사용할 수 있는 함수 목록입니다. 활성화된 함수는 API 요청 시 `tools` 속성으로 전달됩니다.
      </p>

      {!isEnabled && (
        <div style={{ 
          background: '#fffbeb', 
          border: '1px solid #fef3c7', 
          color: '#b45309', 
          padding: '16px 20px', 
          borderRadius: '12px', 
          marginBottom: '24px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '6px', 
          fontSize: '14px',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.05)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <span style={{ fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⚠️ Function Calling 옵션 비활성화 상태
          </span>
          <span style={{ fontSize: '13.5px', opacity: 0.95, lineHeight: '1.5' }}>
            현재 이 함수들이 잠겨있습니다. 함수를 실제로 활성화하고 AI 채팅에서 활용하시려면, 
            <strong> [환경설정]</strong> 탭의 <strong>[고급 옵션 설정]</strong> 영역에서 <strong>"Function calling"</strong> 체크박스를 켜주세요!
          </span>
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
        gap: '16px',
        opacity: isEnabled ? 1 : 0.6,
        pointerEvents: isEnabled ? 'auto' : 'none',
        transition: 'all 0.3s ease',
        cursor: isEnabled ? 'default' : 'not-allowed'
      }}>
        {Object.entries(TOOLS_DECLARATIONS).map(([toolName, def]) => (
          <div 
            key={toolName} 
            style={{ 
              background: 'var(--surface-color)', 
              padding: '20px', 
              borderRadius: '12px', 
              border: '1px solid var(--border-color)', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              boxShadow: isEnabled ? 'none' : 'inset 0 0 10px rgba(0,0,0,0.01)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: isEnabled ? 'var(--primary-color)' : 'var(--text-secondary)' }}>{toolName}</h3>
              <label style={{ display: 'flex', alignItems: 'center', cursor: isEnabled ? 'pointer' : 'not-allowed' }}>
                <input 
                  type="checkbox" 
                  checked={!!enabledTools[toolName]} 
                  disabled={!isEnabled}
                  onChange={() => handleToggle(toolName)} 
                  style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }}
                />
                <span style={{ marginLeft: '8px', fontWeight: '500', color: isEnabled ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {!!enabledTools[toolName] ? '활성화됨' : '비활성'}
                </span>
              </label>
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.4' }}>{def.description}</p>
            <div style={{ background: 'var(--gray-50)', padding: '12px', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--gray-700)', overflowX: 'auto', border: '1px solid var(--gray-100)' }}>
              {JSON.stringify(def.parameters, null, 2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
