import React, { useState, useEffect, useRef, useCallback } from 'react';
import { agentAPI, getErrorMessage } from '../api';
import './AgentChat.css';

let nextId = 1;
const makeId = () => nextId++;

function AgentChat() {
  const [messages, setMessages] = useState([
    {
      id: makeId(),
      type: 'agent',
      content: "Hi! I'm your Financial Advisor Agent. Ask me anything about your spending, savings, or budgets. I'll analyze your data and provide personalized recommendations.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedMessage, setExpandedMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    const query = inputValue.trim();
    if (!query || loading) return;

    // Add user message
    const userMessage = {
      id: makeId(),
      type: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      // Call the agent
      const response = await agentAPI.ask(query);
      const agentData = response.data?.data;

      const agentMessage = {
        id: makeId(),
        type: 'agent',
        content: agentData?.answer || 'I could not generate a response. Please try again.',
        reasoning: agentData?.reasoning,
        toolCalls: agentData?.toolCalls,
        data: agentData?.data,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      const errorMessage = {
        id: makeId(),
        type: 'error',
        content: getErrorMessage(error, 'Failed to reach the advisor agent'),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const toggleExpanded = (messageId) => {
    setExpandedMessage(expandedMessage === messageId ? null : messageId);
  };

  const renderReasoningSteps = (reasoning) => {
    return (
      <div className="reasoning-steps">
        <div className="reasoning-header">🧠 Agent Reasoning Process ({reasoning.length} steps)</div>
        {reasoning.map((step, idx) => (
          <div key={idx} className="reasoning-step">
            <span className="step-number">Step {step.step}</span>
            <span className="step-thought">{step.thought}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderToolCalls = (toolCalls) => {
    return (
      <div className="tool-calls">
        <div className="tools-header">🔧 Tools Used ({toolCalls.length})</div>
        {toolCalls.map((call, idx) => (
          <div key={idx} className="tool-call">
            <span className="tool-name">{call.tool}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderMessageContent = (message) => {
    if (message.type === 'user') {
      return <div className="message-text">{message.content}</div>;
    }

    if (message.type === 'error') {
      return <div className="message-text error">{message.content}</div>;
    }

    // Agent message with reasoning
    return (
      <div className="agent-message-content">
        <div className="agent-answer">{message.content}</div>

        {message.reasoning && message.reasoning.length > 0 && (
          <button
            className="expand-btn"
            onClick={() => toggleExpanded(message.id)}
          >
            {expandedMessage === message.id ? '▼ Hide Details' : '▶ Show Agent Reasoning'}
          </button>
        )}

        {expandedMessage === message.id && (
          <div className="expanded-details">
            {message.reasoning && renderReasoningSteps(message.reasoning)}
            {message.toolCalls && renderToolCalls(message.toolCalls)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="agent-chat-container">
      <div className="chat-header">
        <h2>🤖 Financial Advisor Agent</h2>
        <p>Multi-step intelligent analysis with transparent reasoning</p>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.type}`}>
            <div className="message-avatar">
              {message.type === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-bubble">
              {renderMessageContent(message)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message message-agent">
            <div className="message-avatar">🤖</div>
            <div className="message-bubble">
              <div className="loading-indicator">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
                <span>Analyzing your data...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="quick-questions">
          <div className="quick-label">💡 Try asking:</div>
          <div className="quick-buttons">
            {[
              'How can I save $500 this month?',
              'What are my spending patterns?',
              'Show me spending anomalies',
              'What budget should I set?'
            ].map((question, idx) => (
              <button
                key={idx}
                type="button"
                className="quick-question-btn"
                disabled={loading}
                onClick={() => {
                  setInputValue(question);
                  // Focus the input so the user sees the question; they press Enter to send.
                  // (Submitting synthetic events breaks React's synthetic event system.)
                  inputRef.current?.focus();
                }}
              >
                {question}
              </button>
            ))}
          </div>
        </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask me about your finances…"
          disabled={loading}
          className="chat-input"
          maxLength={500}
          aria-label="Ask the financial advisor a question"
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          className="send-btn"
          aria-label="Send message"
        >
          {loading ? '…' : '→'}
        </button>
      </form>
    </div>
  );
}

export default AgentChat;
