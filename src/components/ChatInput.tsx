type ChatInputProps = {
  value: string;
  disabled: boolean;
  error: string | null;
  onChange: (value: string) => void;
  onSend: () => void;
  onClear: () => void;
};

export function ChatInput({ value, disabled, error, onChange, onSend, onClear }: ChatInputProps) {
  return (
    <div className="chat-input-panel">
      <label className="field composer-field">
        <textarea
          rows={4}
          value={value}
          placeholder="Ask anything..."
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              onSend();
            }
          }}
          disabled={disabled}
        />
      </label>

      {error ? <p className="field-error">{error}</p> : null}

      <div className="chat-input-actions">
        <span className="composer-hint">Ctrl/Cmd + Enter to send</span>
        <div className="composer-actions-right">
          <button type="button" className="ghost-button" onClick={onClear} disabled={disabled}>
            Clear
          </button>
          <button type="button" className="primary-button" onClick={onSend} disabled={disabled}>
            {disabled ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
