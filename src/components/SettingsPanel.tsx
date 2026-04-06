import type { AppSettings, FieldErrors } from '../types';
import { DIRECT_MODEL_OPTIONS, PROXY_MODEL_OPTIONS } from '../utils/chat';
import { maskHeaderMap, maskSecret } from '../utils/masking';
import { parseHeadersJson } from '../utils/validation';

type SettingsPanelProps = {
  settings: AppSettings;
  fieldErrors: FieldErrors;
  disabled: boolean;
  onSettingsChange: (settings: AppSettings) => void;
};

type ModelFieldProps = {
  label: string;
  options: string[];
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

function ModelField({ label, options, value, error, disabled, onChange }: ModelFieldProps) {
  const usesCustom = !value.trim() || !options.includes(value);
  const selectValue = usesCustom ? 'custom' : value;

  return (
    <div className="field-stack">
      <label className="field">
        <span>{label}</span>
        <select value={selectValue} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option === 'custom' ? 'Custom model' : option}
            </option>
          ))}
        </select>
      </label>

      {selectValue === 'custom' ? (
        <label className="field">
          <span>Custom model name</span>
          <input
            type="text"
            value={usesCustom ? value : ''}
            placeholder="gemini-3-flash-preview"
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
          />
        </label>
      ) : null}

      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

function SecretField({
  label,
  value,
  placeholder,
  error,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="password"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      <small>{value ? `Masked locally as ${maskSecret(value)}` : 'Never persisted by the browser.'}</small>
      {error ? <p className="field-error">{error}</p> : null}
    </label>
  );
}

export function SettingsPanel({ settings, fieldErrors, disabled, onSettingsChange }: SettingsPanelProps) {
  let headersPreview = '{}';
  let headersHelper = 'Headers are sent with the outgoing Gemini generateContent request.';
  let headersError = fieldErrors.proxyHeadersJson;

  try {
    headersPreview = JSON.stringify(maskHeaderMap(parseHeadersJson(settings.proxy.headersJson)), null, 2);
  } catch (error) {
    headersHelper = error instanceof Error ? error.message : headersHelper;
    headersError = headersError ?? headersHelper;
  }

  return (
    <section className="settings-panel">
      <div className="settings-heading">
        <div>
          <p className="section-kicker">Connection</p>
          <h2>{settings.mode === 'direct' ? 'Direct AI settings' : 'Cato AI Proxy settings'}</h2>
        </div>
        <p className="settings-copy">
          {settings.mode === 'direct'
            ? 'Send OpenAI-compatible chat messages straight to Google Gemini.'
            : 'Send Gemini traffic through Cato AI Proxy with a Guard Key, auto session ID, and optional user identity.'}
        </p>
      </div>

      {settings.mode === 'direct' ? (
        <div className="settings-grid">
          <SecretField
            label="Google Gemini API key"
            value={settings.direct.apiKey}
            placeholder="AIza..."
            error={fieldErrors.directApiKey}
            disabled={disabled}
            onChange={(apiKey) =>
              onSettingsChange({
                ...settings,
                direct: { ...settings.direct, apiKey },
              })
            }
          />

          <ModelField
            label="Gemini model"
            options={DIRECT_MODEL_OPTIONS}
            value={settings.direct.model}
            error={fieldErrors.directModel}
            disabled={disabled}
            onChange={(model) =>
              onSettingsChange({
                ...settings,
                direct: {
                  ...settings.direct,
                  model: model === 'custom' ? '' : model,
                },
              })
            }
          />

          <label className="field field-full">
            <span>System prompt</span>
            <textarea
              rows={4}
              value={settings.direct.systemPrompt}
              placeholder="Optional global assistant instruction"
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  direct: { ...settings.direct, systemPrompt: event.target.value },
                })
              }
              disabled={disabled}
            />
            <small>Defaulted for a clean demo. You can leave it as-is or customize it.</small>
          </label>
        </div>
      ) : (
        <div className="settings-grid">
          <SecretField
            label="Cato Guard key"
            value={settings.proxy.apiKey}
            placeholder="guard_key"
            error={fieldErrors.proxyApiKey}
            disabled={disabled}
            onChange={(apiKey) =>
              onSettingsChange({
                ...settings,
                proxy: { ...settings.proxy, apiKey },
              })
            }
          />

          <label className="field">
            <span>Gateway base URL</span>
            <input
              type="url"
              value={settings.proxy.baseUrl}
              placeholder="https://api.aisec.in1.catonetworks.com/fw/v1/proxy/gemini"
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  proxy: { ...settings.proxy, baseUrl: event.target.value },
                })
              }
              disabled={disabled}
            />
            <small>Match the Python sample base URL. The app appends `/v1beta/models/&lt;model&gt;:generateContent` automatically.</small>
            {fieldErrors.proxyBaseUrl ? <p className="field-error">{fieldErrors.proxyBaseUrl}</p> : null}
          </label>

          <label className="field">
            <span>User email</span>
            <input
              type="email"
              value={settings.proxy.userEmail}
              placeholder="user@example.com"
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  proxy: { ...settings.proxy, userEmail: event.target.value },
                })
              }
              disabled={disabled}
            />
            <small>Optional. Sent as `x-aim-user-email` when provided.</small>
          </label>

          <ModelField
            label="Gateway model"
            options={PROXY_MODEL_OPTIONS}
            value={settings.proxy.model}
            error={fieldErrors.proxyModel}
            disabled={disabled}
            onChange={(model) =>
              onSettingsChange({
                ...settings,
                proxy: {
                  ...settings.proxy,
                  model: model === 'custom' ? '' : model,
                },
              })
            }
          />

          <label className="field field-full">
            <span>Custom HTTP headers JSON</span>
            <textarea
              rows={5}
              value={settings.proxy.headersJson}
              placeholder='{"x-custom-trace-id":"abc-123"}'
              spellCheck={false}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  proxy: { ...settings.proxy, headersJson: event.target.value },
                })
              }
              disabled={disabled}
            />
            <small>{headersHelper} `x-goog-api-key` and `x-aim-session-id` are added automatically.</small>
            {headersError ? <p className="field-error">{headersError}</p> : null}
          </label>

          <label className="field field-full">
            <span>Masked header preview</span>
            <textarea rows={4} value={headersPreview} readOnly spellCheck={false} />
          </label>

          <label className="field field-full">
            <span>System prompt</span>
            <textarea
              rows={4}
              value={settings.proxy.systemPrompt}
              placeholder="Optional global assistant instruction"
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  proxy: { ...settings.proxy, systemPrompt: event.target.value },
                })
              }
              disabled={disabled}
            />
          </label>
        </div>
      )}
    </section>
  );
}
