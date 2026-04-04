import type { ChatMode } from '../types';

type ModeSelectorProps = {
  mode: ChatMode;
  disabled: boolean;
  onChange: (mode: ChatMode) => void;
};

export function ModeSelector({ mode, disabled, onChange }: ModeSelectorProps) {
  return (
    <div className="mode-selector" role="tablist" aria-label="Connection mode">
      <button
        type="button"
        className={mode === 'direct' ? 'mode-button mode-button-active' : 'mode-button'}
        onClick={() => onChange('direct')}
        disabled={disabled}
      >
        <span>Direct AI</span>
        <small>Gemini key + model</small>
      </button>

      <button
        type="button"
        className={mode === 'proxy' ? 'mode-button mode-button-active' : 'mode-button'}
        onClick={() => onChange('proxy')}
        disabled={disabled}
      >
        <span>Cato AI Proxy</span>
        <small>Gateway base URL + headers</small>
      </button>
    </div>
  );
}
