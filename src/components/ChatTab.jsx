import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { Send, Code, AlignLeft, Trash2, X, Sun, Cloud, CloudRain, Snowflake, Compass, Users, MapPin, Volume2, Search } from 'lucide-react';
import * as Tone from 'tone';
import { buildGeminiPayload, callGeminiApi } from '../lib/geminiApi';
import { executeTool } from '../lib/tools';
import { ApiKeyManager } from '../lib/apiKeyManager';

export default function ChatTab({ settings, enabledTools }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isMarkdown, setIsMarkdown] = useState(true);
  const [systemInstruction, setSystemInstruction] = useState('');
  const [useHistory, setUseHistory] = useState(true);
  const [viewMode, setViewMode] = useState('json'); // 'list' or 'json'
  const [currentPayload, setCurrentPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activePopup, setActivePopup] = useState(null); // { type, data, args }
  
  // 실시간 로딩 메세지 상태 추가 (예: 웹페이지 분석 중...)
  const [loadingMessage, setLoadingMessage] = useState('AI가 생각하는 중...');
  
  const messagesEndRef = useRef(null);
  
  // 드래그 폭 조절을 위한 상태 및 Ref 추가
  const containerRef = useRef(null);
  const [rightWidth, setRightWidth] = useState(400);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      let newWidth = containerRect.right - e.clientX;
      
      // 최솟값 280px, 최댓값 전체 화면 - 300px 제한으로 사용성 확보
      if (newWidth < 280) newWidth = 280;
      if (newWidth > containerRect.width - 300) newWidth = containerRect.width - 300;
      
      setRightWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // payload 뷰 실시간 업데이트
  useEffect(() => {
    const contextMsgs = useHistory ? [...messages] : (messages.length > 0 ? [messages[messages.length - 1]] : []);
    if (input) {
      contextMsgs.push({ role: 'user', text: input });
    }
    const payload = buildGeminiPayload(contextMsgs, systemInstruction, settings, enabledTools);
    setCurrentPayload(payload);
  }, [messages, systemInstruction, settings, enabledTools, useHistory, input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const apiKey = ApiKeyManager.getKey();
    if (!apiKey) {
      alert("Settings 탭에서 API Key를 먼저 입력해주세요.");
      return;
    }

    const currentInput = input;
    setInput('');
    setIsLoading(true);

    // 메시지 내 URL 자동 감지
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const urlMatch = currentInput.match(urlRegex);
    
    let promptToSend = currentInput;
    let detectedUrl = null;
    
    if (urlMatch) {
      detectedUrl = urlMatch[0];
      setLoadingMessage("감지된 웹페이지 내용을 분석하고 있습니다...");
      try {
        const scrapeRes = await fetch(`https://r.jina.ai/${detectedUrl}`);
        if (scrapeRes.ok) {
          const scrapedText = await scrapeRes.text();
          promptToSend = `[참조 문서 URL: ${detectedUrl}]\n---\n참조 내용 (Context):\n${scrapedText}\n---\n\n위의 참조 내용을 절대적으로 바탕으로 삼아 다음 질문에 상세히 답하세요:\n${currentInput}`;
        }
      } catch (err) {
        console.error("URL 콘텐츠 그라운딩 실패:", err);
      }
    }
    
    setLoadingMessage("AI가 답변을 생각하는 중...");

    const newUserMsg = { role: 'user', text: promptToSend, rawText: currentInput, detectedUrl: detectedUrl };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);

    const contextMsgs = useHistory ? [...messages, { role: 'user', text: promptToSend }] : [{ role: 'user', text: promptToSend }];
    
    try {
      let payload = buildGeminiPayload(contextMsgs, systemInstruction, settings, enabledTools);
      
      let response = await callGeminiApi(apiKey, settings.model, payload);
      let responseMsg = response.candidates[0].content;
      
      // Handle Function Calling
      if (responseMsg.parts.some(p => p.functionCall)) {
        // AI가 Function Call을 요청함
        setMessages(prev => [...prev, { role: 'model', parts: responseMsg.parts }]);
        
        const funcCalls = responseMsg.parts.filter(p => p.functionCall).map(p => p.functionCall);
        const functionResponses = [];
        
        for (const call of funcCalls) {
          const res = await executeTool(call.name, call.args);
          if (res.success) {
            setActivePopup({
              type: call.name,
              data: res.data || res,
              args: call.args
            });
          }
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: res
            }
          });
        }
        
        // 함수 실행 결과를 AI에게 다시 전송
        const contextWithFunc = useHistory 
          ? [...messages, { role: 'user', text: promptToSend }, { role: 'model', parts: responseMsg.parts }, { role: 'user', parts: functionResponses }]
          : [{ role: 'user', text: promptToSend }, { role: 'model', parts: responseMsg.parts }, { role: 'user', parts: functionResponses }];
        
        payload = buildGeminiPayload(contextWithFunc, systemInstruction, settings, enabledTools);
        response = await callGeminiApi(apiKey, settings.model, payload);
        responseMsg = response.candidates[0].content;
        
        setMessages(prev => [
          ...prev, 
          { role: 'user', parts: functionResponses }, 
          { role: 'model', parts: responseMsg.parts, groundingMetadata: response.candidates[0].groundingMetadata }
        ]);
      } else {
        // 일반 텍스트 응답
        setMessages(prev => [
          ...prev, 
          { role: 'model', parts: responseMsg.parts, groundingMetadata: response.candidates[0].groundingMetadata }
        ]);
      }
      
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${err.message}`, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessagePart = (part) => {
    if (part.text) {
      if (isMarkdown) {
        const cleanHtml = DOMPurify.sanitize(marked.parse(part.text));
        return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
      }
      return <div style={{ whiteSpace: 'pre-wrap' }}>{part.text}</div>;
    }
    if (part.functionCall) {
      return (
        <div style={{ background: 'var(--blue-50)', padding: '8px', borderRadius: '4px', fontSize: '13px', color: 'var(--blue-800)', border: '1px solid var(--blue-200)' }}>
          <strong>Function Call: </strong> {part.functionCall.name}({JSON.stringify(part.functionCall.args)})
        </div>
      );
    }
    if (part.functionResponse) {
      return (
        <div style={{ background: 'var(--gray-100)', padding: '8px', borderRadius: '4px', fontSize: '13px', color: 'var(--gray-600)', border: '1px solid var(--gray-300)' }}>
          <strong>Function Result: </strong> {JSON.stringify(part.functionResponse.response)}
        </div>
      );
    }
    if (part.executableCode) {
      return (
        <div style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '14px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', margin: '8px 0', border: '1px solid #333' }}>
          <div style={{ color: '#569cd6', marginBottom: '8px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#569cd6' }}></span>
            💻 Generated Python Code (Code Execution)
          </div>
          <pre style={{ margin: 0, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#ce9178', lineHeight: '1.5' }}>{part.executableCode.code}</pre>
        </div>
      );
    }
    if (part.codeExecutionResult) {
      const isOk = part.codeExecutionResult.outcome === 'OUTCOME_OK';
      return (
        <div style={{ background: isOk ? '#f4fbf7' : '#fff5f5', color: isOk ? '#1e4620' : '#9b2c2c', padding: '12px 14px', borderRadius: '8px', fontSize: '13px', margin: '8px 0', border: `1px solid ${isOk ? '#c6f6d5' : '#fed7d7'}` }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', color: isOk ? '#2e7d32' : '#c62828', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: isOk ? '#2e7d32' : '#c62828' }}></span>
            {isOk ? '✅ Execution Output (stdout)' : '❌ Execution Error'}
          </div>
          <pre style={{ margin: 0, overflowX: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: isOk ? '#1e293b' : '#7f1d1d', lineHeight: '1.4' }}>{part.codeExecutionResult.output}</pre>
        </div>
      );
    }
    return <div>Unknown Part Type</div>;
  };

  const renderMessage = (msg, index) => {
    const isUser = msg.role === 'user';
    const isSysMsg = msg.parts && msg.parts.some(p => p.functionResponse); // function result is user role but system action
    const align = isUser && !isSysMsg ? 'flex-end' : 'flex-start';
    const bg = isSysMsg ? 'transparent' : (isUser ? 'var(--primary-color)' : 'var(--surface-color)');
    const color = isSysMsg ? 'var(--text-secondary)' : (isUser ? 'white' : 'var(--text-primary)');
    const border = isUser || isSysMsg ? 'none' : '1px solid var(--border-color)';

    return (
      <div key={index} style={{ display: 'flex', justifyContent: align, marginBottom: '16px' }}>
        <div style={{ 
          maxWidth: '80%', 
          background: bg, 
          color: color, 
          padding: isSysMsg ? '0' : '12px 16px', 
          borderRadius: '12px',
          border: border,
          boxShadow: isSysMsg ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
          ...msg.isError && { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }
        }}>
          {msg.rawText ? (
            renderMessagePart({ text: msg.rawText })
          ) : (
            msg.text ? renderMessagePart({ text: msg.text }) : msg.parts?.map((p, i) => <div key={i}>{renderMessagePart(p)}</div>)
          )}

          {/* 자동 감지된 URL 그라운딩 알림 뱃지 */}
          {isUser && msg.detectedUrl && (
            <div style={{ 
              fontSize: '11px', 
              marginTop: '8px', 
              color: 'rgba(255,255,255,0.9)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              background: 'rgba(255,255,255,0.12)',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <Compass size={12} /> 🔗 URL 컨텍스트 스크랩 완료 (API 프롬프트 주입됨)
            </div>
          )}

          {/* Grounding Metadata Display */}
          {msg.groundingMetadata && (
            <div style={{ 
              marginTop: '12px', 
              paddingTop: '12px', 
              borderTop: '1px solid var(--border-color)',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}>
              {/* Search Queries */}
              {msg.groundingMetadata.webSearchQueries && msg.groundingMetadata.webSearchQueries.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Search size={12} /> 검색 키워드:
                  </span>
                  {msg.groundingMetadata.webSearchQueries.map((q, qi) => (
                    <span key={qi} style={{ background: 'var(--gray-100)', color: 'var(--gray-850)', padding: '2px 8px', borderRadius: '12px', fontWeight: '500' }}>
                      "{q}"
                    </span>
                  ))}
                </div>
              )}

              {/* Source Chunks */}
              {msg.groundingMetadata.groundingChunks && msg.groundingMetadata.groundingChunks.length > 0 && (
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>참고 출처 (Google Search Sources):</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {msg.groundingMetadata.groundingChunks.map((chunk, ci) => {
                      if (!chunk.web) return null;
                      
                      // Google Maps 링크 및 키워드 감지
                      const isMaps = chunk.web.uri.includes('google.com/maps') || 
                                     chunk.web.uri.includes('maps.google.com') ||
                                     chunk.web.uri.includes('place') ||
                                     chunk.web.title.toLowerCase().includes('maps') ||
                                     chunk.web.title.includes('지도');

                      return (
                        <a 
                          key={ci}
                          href={chunk.web.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: isMaps ? '#eff6ff' : 'var(--gray-50)',
                            border: isMaps ? '1px solid #bfdbfe' : '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            color: isMaps ? '#1d4ed8' : 'var(--primary-color)',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = isMaps ? '#dbeafe' : 'var(--blue-50)';
                            e.currentTarget.style.borderColor = isMaps ? '#93c5fd' : 'var(--blue-200)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = isMaps ? '#eff6ff' : 'var(--gray-50)';
                            e.currentTarget.style.borderColor = isMaps ? '#bfdbfe' : 'var(--border-color)';
                          }}
                        >
                          <span style={{ 
                            background: isMaps ? '#2563eb' : 'var(--primary-color)', 
                            color: 'white', 
                            width: '16px', 
                            height: '16px', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '9px',
                            fontWeight: 'bold'
                          }}>
                            {isMaps ? <MapPin size={10} style={{ color: 'white' }} /> : ci + 1}
                          </span>
                          <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>
                            {isMaps ? `📍 ${chunk.web.title}` : chunk.web.title}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', userSelect: isDragging ? 'none' : 'auto' }}>
      {/* Left Panel: Chat Interface */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--gray-50)', overflow: 'hidden' }}>
        <div style={{ padding: '16px', background: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>AI Chat</h2>
          <button 
            onClick={() => setIsMarkdown(!isMarkdown)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isMarkdown ? 'var(--blue-50)' : 'var(--gray-100)', color: isMarkdown ? 'var(--primary-color)' : 'var(--text-secondary)', border: 'none', padding: '6px 12px', borderRadius: '6px' }}
          >
            {isMarkdown ? <AlignLeft size={16} /> : <Code size={16} />}
            {isMarkdown ? 'Markdown' : 'Plain Text'}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--gray-400)', marginTop: '40px' }}>
              메시지를 입력하여 대화를 시작하세요.
            </div>
          )}
          {messages.map(renderMessage)}
          {isLoading && (
            <div style={{ color: 'var(--gray-500)', fontSize: '14px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulse-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)' }}></span>
              {loadingMessage}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '16px', background: 'var(--surface-color)', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="메시지를 입력하세요..."
              style={{ flex: 1 }}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading}
              style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '0 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Draggable Divider */}
      <div 
        onMouseDown={handleMouseDown}
        style={{
          width: '6px',
          cursor: 'col-resize',
          background: isDragging ? 'var(--primary-color)' : 'transparent',
          borderLeft: '1px solid var(--border-color)',
          zIndex: 100,
          position: 'relative',
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => { if(!isDragging) e.currentTarget.style.background = 'var(--blue-200)'; }}
        onMouseLeave={e => { if(!isDragging) e.currentTarget.style.background = 'transparent'; }}
      />

      {/* Right Panel: Chat History & Payload */}
      <div style={{ width: `${rightWidth}px`, minWidth: `${rightWidth}px`, display: 'flex', flexDirection: 'column', background: 'var(--surface-color)', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>요청 페이로드 (Request Payload)</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'var(--blue-50)' : 'transparent', color: viewMode === 'list' ? 'var(--primary-color)' : 'var(--text-secondary)', border: 'none', padding: '4px 8px', borderRadius: '4px', whiteSpace: 'nowrap', cursor: 'pointer' }}>목록</button>
            <button onClick={() => setViewMode('json')} style={{ background: viewMode === 'json' ? 'var(--blue-50)' : 'transparent', color: viewMode === 'json' ? 'var(--primary-color)' : 'var(--text-secondary)', border: 'none', padding: '4px 8px', borderRadius: '4px', whiteSpace: 'nowrap', cursor: 'pointer' }}>JSON</button>
          </div>
        </div>

        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: '500' }}>시스템 지침 (System Instruction)</label>
            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="checkbox" checked={useHistory} onChange={() => setUseHistory(!useHistory)} />
              대화 이력 포함
            </label>
          </div>
          <textarea 
            value={systemInstruction}
            onChange={(e) => setSystemInstruction(e.target.value)}
            placeholder="AI에게 지시할 시스템 프롬프트를 입력하세요."
            style={{ width: '100%', minHeight: '60px', resize: 'vertical' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: 'var(--gray-50)' }}>
          {viewMode === 'json' ? (
            <pre style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace', color: 'var(--gray-800)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(currentPayload, null, 2)}
            </pre>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentPayload?.systemInstruction && (
                <div style={{ 
                  background: '#fffbeb', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '1px solid #fef3c7', 
                  fontSize: '13px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <strong style={{ color: '#d97706', fontSize: '12px', letterSpacing: '0.5px' }}>
                    🧠 SYSTEM INSTRUCTION
                  </strong>
                  <div style={{ color: 'var(--text-primary)', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {currentPayload.systemInstruction.parts[0].text}
                  </div>
                </div>
              )}
              {currentPayload?.contents?.map((c, i) => (
                <div key={i} style={{ 
                  background: 'white', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)', 
                  fontSize: '13px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <strong style={{ 
                    color: c.role === 'user' ? 'var(--primary-color)' : '#059669', 
                    fontSize: '12px',
                    letterSpacing: '0.5px'
                  }}>
                    {c.role === 'user' ? '👤 USER' : '🤖 MODEL'}
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {c.parts.map((part, pIdx) => {
                      if (part.text) {
                        return (
                          <div key={pIdx} style={{ color: 'var(--text-primary)', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {part.text}
                          </div>
                        );
                      }
                      if (part.functionCall) {
                        return (
                          <div key={pIdx} style={{ 
                            background: '#f0fdf4', 
                            border: '1px solid #bbf7d0', 
                            color: '#166534', 
                            padding: '8px 10px', 
                            borderRadius: '6px', 
                            fontSize: '12px',
                            fontFamily: 'monospace'
                          }}>
                            <strong>⚙️ 함수 호출 요청:</strong> {part.functionCall.name}({JSON.stringify(part.functionCall.args || {})})
                          </div>
                        );
                      }
                      if (part.functionResponse) {
                        return (
                          <div key={pIdx} style={{ 
                            background: '#eff6ff', 
                            border: '1px solid #bfdbfe', 
                            color: '#1e40af', 
                            padding: '8px 10px', 
                            borderRadius: '6px', 
                            fontSize: '12px',
                            fontFamily: 'monospace'
                          }}>
                            <strong>📥 함수 실행 결과:</strong> {JSON.stringify(part.functionResponse.response || {})}
                          </div>
                        );
                      }
                      return (
                        <div key={pIdx} style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          [미지원 형식 데이터]
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {currentPayload?.tools && (
                <div style={{ background: '#e0e7ff', padding: '12px', borderRadius: '8px', border: '1px solid #c7d2fe', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <strong>[활성화된 Tools (도구/함수)]</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {(() => {
                      const activeToolsList = [];
                      currentPayload.tools.forEach(tool => {
                        if (tool.functionDeclarations) {
                          tool.functionDeclarations.forEach(fn => {
                            activeToolsList.push({ type: 'function', name: `${fn.name}()` });
                          });
                        }
                        if (tool.googleSearch) {
                          activeToolsList.push({ type: 'search', name: 'Google Search 그라운딩' });
                        }
                        if (tool.googleMaps) {
                          activeToolsList.push({ type: 'maps', name: 'Google Maps 그라운딩' });
                        }
                        if (tool.codeExecution) {
                          activeToolsList.push({ type: 'code', name: 'Code Execution (Python 실행)' });
                        }
                      });

                      if (activeToolsList.length === 0) {
                        return <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>활성화된 함수/도구 없음</span>;
                      }

                      return activeToolsList.map((t, idx) => (
                        <div key={idx} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          background: 'white', 
                          padding: '6px 10px', 
                          borderRadius: '6px', 
                          border: '1px solid #c7d2fe', 
                          fontFamily: t.type === 'function' ? 'monospace' : 'inherit',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: t.type === 'function' ? 'var(--primary-color)' : '#1e3a8a',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}>
                          <span style={{ fontSize: '13px' }}>
                            {t.type === 'function' ? '🧩' : t.type === 'search' ? '🔍' : t.type === 'maps' ? '📍' : '💻'}
                          </span>
                          {t.name}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', background: 'white' }}>
          <button onClick={() => setMessages([])} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', background: 'transparent', border: 'none', padding: '6px', width: '100%', justifyContent: 'center' }}>
            <Trash2 size={16} /> 대화 초기화
          </button>
        </div>
      </div>

      {activePopup && (
        <PopupModal popup={activePopup} onClose={() => setActivePopup(null)} />
      )}
    </div>
  );
}

// --- 시각화 팝업 컴포넌트 ---
function PopupModal({ popup, onClose }) {
  const getTitle = () => {
    switch (popup.type) {
      case 'getWeather': return '실시간 날씨 정보 시각화';
      case 'getCountry': return '국가 상세 정보 시각화';
      case 'playMelody': return 'Tone.js 건반 연주 시각화';
      default: return '도구 실행 시각화';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: popup.type === 'playMelody' ? '650px' : '450px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--gray-50)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-color)',
              display: 'inline-block'
            }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{getTitle()}</h3>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
            borderRadius: '50%'
          }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--gray-100)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {popup.type === 'getWeather' && <WeatherVisual data={popup.data} args={popup.args} />}
          {popup.type === 'getCountry' && <CountryVisual data={popup.data} />}
          {popup.type === 'playMelody' && <MelodyVisual notes={popup.args.notes} />}
        </div>
      </div>
    </div>
  );
}

// 1. 날씨 정보 시각화
function WeatherVisual({ data, args }) {
  const getWeatherConfig = (code) => {
    if (code === 0) return { label: '맑음 (Clear sky)', icon: <Sun size={48} color="#f59e0b" />, bg: '#fef3c7' };
    if ([1, 2, 3].includes(code)) return { label: '구름 조금 (Partly cloudy)', icon: <Cloud size={48} color="#9ca3af" />, bg: '#f3f4f6' };
    if ([45, 48].includes(code)) return { label: '안개 (Fog)', icon: <Compass size={48} color="#6b7280" />, bg: '#e5e7eb' };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { label: '비 (Rainy)', icon: <CloudRain size={48} color="#3b82f6" />, bg: '#dbeafe' };
    if ([71, 73, 75].includes(code)) return { label: '눈 (Snowy)', icon: <Snowflake size={48} color="#60a5fa" />, bg: '#eff6ff' };
    return { label: '흐림 (Cloudy)', icon: <Cloud size={48} color="#4b5563" />, bg: '#f3f4f6' };
  };

  const weather = getWeatherConfig(data.weathercode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{
        width: '90px',
        height: '90px',
        borderRadius: '50%',
        backgroundColor: weather.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        {weather.icon}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)' }}>{data.temperature}°C</div>
        <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-secondary)', marginTop: '4px' }}>{weather.label}</div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        width: '100%',
        marginTop: '8px',
        background: 'var(--gray-50)',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>풍속 (Wind Speed)</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{data.windspeed} km/h</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>풍향 (Wind Direction)</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{data.winddirection}°</div>
        </div>
        <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
          <MapPin size={16} color="var(--primary-color)" />
          <span style={{ color: 'var(--text-secondary)' }}>위치 좌표:</span>
          <span style={{ fontWeight: '500' }}>{args.lat.toFixed(4)}, {args.lon.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}

// 2. 국가 정보 시각화
function CountryVisual({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {data.flag && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <img 
            src={data.flag} 
            alt={`${data.name} Flag`} 
            style={{ 
              maxWidth: '180px', 
              maxHeight: '110px', 
              borderRadius: '8px', 
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-color)'
            }} 
          />
        </div>
      )}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <h4 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>
          {data.name} {data.flagEmoji}
        </h4>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{data.region}</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        background: 'var(--gray-50)',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>수도 (Capital)</span>
          <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{data.capital || 'N/A'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={14} /> 인구 (Population)
          </span>
          <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{data.population.toLocaleString()}명</span>
        </div>
      </div>
    </div>
  );
}

// 3. 건반 연주 시각화
function MelodyVisual({ notes }) {
  const [activeNote, setActiveNote] = useState(null);
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const startMelodyAnimation = (notesToPlay) => {
    clearTimers();
    notesToPlay.forEach((note, index) => {
      const t1 = setTimeout(() => {
        setActiveNote(note.toUpperCase());
      }, index * 500);
      const t2 = setTimeout(() => {
        setActiveNote(null);
      }, index * 500 + 400); // 끄기
      timersRef.current.push(t1, t2);
    });
  };

  useEffect(() => {
    // 최초 마운트 시 자동 애니메이션 (오디오는 이미 도구 실행 시점 재생됨)
    startMelodyAnimation(notes);
    return () => clearTimers();
  }, [notes]);

  const replayMelody = async () => {
    try {
      await Tone.start();
      const synth = new Tone.Synth().toDestination();
      const now = Tone.now();
      notes.forEach((note, index) => {
        synth.triggerAttackRelease(note, "8n", now + index * 0.5);
      });
      startMelodyAnimation(notes);
    } catch (err) {
      console.error('Replay error:', err);
    }
  };

  const playSingleNote = async (note) => {
    try {
      await Tone.start();
      const synth = new Tone.Synth().toDestination();
      synth.triggerAttackRelease(note, "8n");
      
      // 건반 시각 피드백 반짝임
      clearTimers();
      setActiveNote(note.toUpperCase());
      const t = setTimeout(() => {
        setActiveNote(null);
      }, 300);
      timersRef.current.push(t);
    } catch (err) {
      console.error('Play single note error:', err);
    }
  };

  const whiteKeys = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5'];
  const hasSharp = (note) => ['C4', 'D4', 'F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5', 'A5'].includes(note);
  const getSharpNote = (note) => note[0] + '#' + note[1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)' }}>
          <Volume2 size={24} className={activeNote ? "playing-pulse" : ""} />
          <span style={{ fontSize: '15px', fontWeight: '600' }}>
            {activeNote ? `Playing: ${activeNote}` : '건반을 직접 누르거나 재생해보세요.'}
          </span>
        </div>
        <button 
          onClick={replayMelody}
          style={{ 
            background: 'var(--primary-color)', 
            color: 'white', 
            border: 'none', 
            padding: '6px 12px', 
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(33, 150, 243, 0.2)'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--primary-color)'}
        >
          멜로디 다시 재생
        </button>
      </div>

      {/* Piano Keyboard Container */}
      <div style={{
        display: 'flex',
        position: 'relative',
        height: '180px',
        width: '100%',
        backgroundColor: '#1f2937',
        padding: '8px 16px 16px 16px',
        borderRadius: '12px',
        boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        userSelect: 'none'
      }}>
        <div style={{ display: 'flex', width: '100%', position: 'relative' }}>
          {whiteKeys.map((wNote) => {
            const isWhiteActive = activeNote === wNote;
            const sharpNote = getSharpNote(wNote);
            const isSharpActive = activeNote === sharpNote;

            return (
              <div 
                key={wNote} 
                onClick={() => playSingleNote(wNote)}
                style={{ 
                  flex: 1, 
                  backgroundColor: isWhiteActive ? 'var(--blue-200)' : 'white',
                  border: '1px solid #1f2937',
                  borderRadius: '0 0 4px 4px',
                  position: 'relative',
                  cursor: 'pointer',
                  boxShadow: isWhiteActive ? 'inset 0 -12px 0 var(--primary-color)' : 'none',
                  transition: 'all 0.1s ease'
                }}
              >
                {/* Note Label */}
                <span style={{ 
                  position: 'absolute', 
                  bottom: '8px', 
                  left: '50%', 
                  transform: 'translateX(-50%)', 
                  fontSize: '11px', 
                  fontWeight: '600',
                  color: isWhiteActive ? 'var(--primary-color)' : '#9ca3af',
                  pointerEvents: 'none'
                }}>
                  {wNote}
                </span>

                {/* Sharp Key (Black Key) */}
                {hasSharp(wNote) && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation(); // 흰 건반 클릭 트리거 방지
                      playSingleNote(sharpNote);
                    }}
                    style={{ 
                      position: 'absolute',
                      right: '-30%',
                      top: 0,
                      width: '60%',
                      height: '60%',
                      backgroundColor: isSharpActive ? 'var(--blue-500)' : '#111827',
                      borderRadius: '0 0 2px 2px',
                      zIndex: 2,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      transition: 'all 0.1s ease',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ 
                      position: 'absolute', 
                      bottom: '4px', 
                      left: '50%', 
                      transform: 'translateX(-50%)', 
                      fontSize: '8px', 
                      color: isSharpActive ? 'white' : '#6b7280',
                      fontWeight: 'bold',
                      pointerEvents: 'none'
                    }}>
                      {sharpNote[0]}#
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px' }}>
        연주 음표 목록: {notes.join(' - ')}
      </div>
    </div>
  );
}

