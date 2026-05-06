import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  sendChatMessage, addChatMessage, clearChat,
  setActiveTab, setSelectedHcp
} from '../store/store';

function ChatInterface() {
  const dispatch = useDispatch();
  const { hcps, chatHistory, isChatLoading, selectedHcpId, extractedFormData } = useSelector(s => s.crm);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg) return;

    // Add user message to chat history immediately (optimistic update)
    dispatch(addChatMessage({ role: 'user', content: msg }));
    setInput('');

    // Send to AI agent
    await dispatch(sendChatMessage({
      message: msg,
      hcpId: selectedHcpId ? parseInt(selectedHcpId) : null
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSwitchToForm = () => {
    dispatch(setActiveTab('form'));
  };

  const examplePrompts = [
    "Met Dr. Sharma today, discussed Product X efficacy, very positive response, agreed to trial",
    "Called Dr. Patel, discussed side effects concerns, neutral, needs more clinical data",
    "Conference with Dr. Singh, shared OncoBoost brochure, positive interest in Phase III"
  ];

  return (
    <div className="chat-container">
      {/* HCP selector */}
      <div className="chat-hcp-selector">
        <label>Logging for HCP:</label>
        <select
          value={selectedHcpId || ''}
          onChange={e => dispatch(setSelectedHcp(e.target.value || null))}
        >
          <option value="">Select HCP (optional)</option>
          {hcps.map(h => (
            <option key={h.id} value={h.id}>{h.name} — {h.specialty}</option>
          ))}
        </select>
      </div>

      {/* Example prompts — shown when chat is empty */}
      {chatHistory.length === 0 && (
        <div className="chat-examples">
          <p className="chat-examples-label">💡 Try saying:</p>
          {examplePrompts.map((prompt, i) => (
            <button
              key={i}
              className="example-chip"
              onClick={() => setInput(prompt)}
            >
              "{prompt.substring(0, 60)}..."
            </button>
          ))}
        </div>
      )}

      {/* Chat messages */}
      <div className="chat-messages">
        {chatHistory.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            <div className="bubble-avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="bubble-content">
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {/* Typing indicator */}
        {isChatLoading && (
          <div className="chat-bubble ai">
            <div className="bubble-avatar">🤖</div>
            <div className="bubble-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                🧠 AI is extracting data & generating follow-ups... (8-15 sec)
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Extracted data preview */}
      {extractedFormData && (
        <div className="extracted-preview">
          <p className="extracted-title">✅ AI Extracted Data:</p>
          <div className="extracted-grid">
            {extractedFormData.interaction_type && (
              <span><strong>Type:</strong> {extractedFormData.interaction_type}</span>
            )}
            {extractedFormData.sentiment && (
              <span><strong>Sentiment:</strong> {extractedFormData.sentiment}</span>
            )}
            {extractedFormData.topics_discussed && (
              <span className="extracted-full"><strong>Topics:</strong> {extractedFormData.topics_discussed}</span>
            )}
            {extractedFormData.outcomes && (
              <span className="extracted-full"><strong>Outcomes:</strong> {extractedFormData.outcomes}</span>
            )}
          </div>
          <button className="btn btn-outline" onClick={handleSwitchToForm}>
            📋 View in Form →
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="chat-input-area">
        <textarea
          className="chat-input"
          placeholder='Describe the interaction... e.g. "Met Dr. Smith, discussed Product X, positive response"'
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={isChatLoading}
        />
        <div className="chat-input-actions">
          <button
            className="btn btn-ghost"
            onClick={() => dispatch(clearChat())}
            disabled={isChatLoading}
            title="Clear chat"
          >
            🗑️
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={isChatLoading || !input.trim()}
          >
            {isChatLoading ? '⏳' : '⬆ Log'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;