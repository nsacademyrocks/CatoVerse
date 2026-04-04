import type { ChatMessage, ChatMode } from '../types';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';

type ChatWindowProps = {
  mode: ChatMode;
  messages: ChatMessage[];
  draft: string;
  inputError: string | null;
  copiedMessageId: string | null;
  isLoading: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onClear: () => void;
  onCopy: (message: ChatMessage) => void;
};

export function ChatWindow({
  mode,
  messages,
  draft,
  inputError,
  copiedMessageId,
  isLoading,
  onDraftChange,
  onSend,
  onClear,
  onCopy,
}: ChatWindowProps) {
  return (
    <section className="chat-shell">
      <div className="chat-header">
        <div>
          <p className="section-kicker">Conversation</p>
          <h2>{messages.length ? 'Active thread' : 'Ask anything'}</h2>
        </div>

        <span className="mode-chip">{mode === 'direct' ? 'Direct AI' : 'Cato AI Proxy'}</span>
      </div>

      <MessageList messages={messages} copiedMessageId={copiedMessageId} isLoading={isLoading} onCopy={onCopy} />

      <ChatInput
        value={draft}
        disabled={isLoading}
        error={inputError}
        onChange={onDraftChange}
        onSend={onSend}
        onClear={onClear}
      />
    </section>
  );
}
