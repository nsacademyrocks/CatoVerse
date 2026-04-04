import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';
import { formatTimestamp } from '../utils/chat';

type MessageListProps = {
  messages: ChatMessage[];
  copiedMessageId: string | null;
  isLoading: boolean;
  onCopy: (message: ChatMessage) => void;
};

const SUGGESTIONS = [
  'Summarize the latest AI trends for enterprise teams.',
  'Write a Python script to rename files by date.',
  'Compare Gemini direct access vs gateway proxying.',
];

export function MessageList({ messages, copiedMessageId, isLoading, onCopy }: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  if (!messages.length) {
    return (
      <div className="message-empty">
        <div className="empty-orb" />
        <h3>Where knowledge begins.</h3>
        <p>Configure a connection above, then send a prompt to your Gemini key or your OpenAI-compatible gateway.</p>
        <div className="suggestion-grid" aria-label="Prompt ideas">
          {SUGGESTIONS.map((suggestion) => (
            <div key={suggestion} className="suggestion-card">
              {suggestion}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <article key={message.id} className={`message-card message-${message.role}`}>
          <div className="message-meta">
            <div className="message-role-row">
              <span className="message-role">{message.role === 'assistant' ? 'Assistant' : 'You'}</span>
              <time>{formatTimestamp(message.timestamp)}</time>
            </div>
            {message.role === 'assistant' ? (
              <button type="button" className="copy-button" onClick={() => onCopy(message)}>
                {copiedMessageId === message.id ? 'Copied' : 'Copy'}
              </button>
            ) : null}
          </div>
          <p>{message.content}</p>
        </article>
      ))}

      {isLoading ? (
        <article className="message-card message-assistant message-pending">
          <div className="message-meta">
            <div className="message-role-row">
              <span className="message-role">Assistant</span>
              <time>{formatTimestamp(Date.now())}</time>
            </div>
          </div>
          <div className="typing-indicator" aria-label="Loading assistant response">
            <span />
            <span />
            <span />
          </div>
        </article>
      ) : null}

      <div ref={endRef} />
    </div>
  );
}
