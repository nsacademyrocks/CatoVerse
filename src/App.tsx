import { useEffect, useMemo, useState } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { ModeSelector } from './components/ModeSelector';
import { SettingsPanel } from './components/SettingsPanel';
import { sendGeminiMessage } from './services/gemini';
import { sendProxyMessage } from './services/proxy';
import type { AppSettings, ChatMessage, Notice } from './types';
import { createMessage, DEFAULT_SETTINGS, getErrorMessage } from './utils/chat';
import { loadSettings, persistSettings } from './utils/storage';
import { validateMessage, validateSettings } from './utils/validation';

function createInitialSettings(): AppSettings {
  const loaded = loadSettings();

  return {
    mode: loaded.mode,
    direct: {
      ...DEFAULT_SETTINGS.direct,
      ...loaded.direct,
    },
    proxy: {
      ...DEFAULT_SETTINGS.proxy,
      ...loaded.proxy,
    },
  };
}

function App() {
  const [settings, setSettings] = useState<AppSettings>(() => createInitialSettings());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!copiedMessageId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCopiedMessageId(null), 1400);
    return () => window.clearTimeout(timeoutId);
  }, [copiedMessageId]);

  const fieldErrors = useMemo(() => validateSettings(settings, settings.mode), [settings]);
  const activeModel = settings.mode === 'direct' ? settings.direct.model : settings.proxy.model;

  function createProxyBlockedMessage(detail: string): ChatMessage {
    return createMessage(
      'assistant',
      [
        'Cato AI Security blocked this request and prevented the accidental leakage of sensitive data to the LLM.',
        '',
        'Proxy response:',
        detail,
      ].join('\n'),
    );
  }

  async function handleSend() {
    if (isLoading) {
      return;
    }

    const draftError = validateMessage(draft);
    if (draftError) {
      setInputError(draftError);
      return;
    }

    if (Object.keys(fieldErrors).length > 0) {
      setNotice({
        kind: 'error',
        title: 'Fix settings before sending',
        detail: 'Review the highlighted connection fields and try again.',
      });
      return;
    }

    const userMessage = createMessage('user', draft.trim());
    const previousMessages = messages;
    const nextMessages = [...previousMessages, userMessage];

    setInputError(null);
    setNotice(null);
    setMessages(nextMessages);
    setDraft('');
    setIsLoading(true);

    try {
      const reply =
        settings.mode === 'direct'
          ? await sendGeminiMessage(settings.direct, nextMessages)
          : await sendProxyMessage(settings.proxy, nextMessages);

      setMessages((currentMessages) => [...currentMessages, createMessage('assistant', reply)]);
    } catch (error) {
      const appError = getErrorMessage(error);
      if (settings.mode === 'proxy' && appError.status === 400) {
        setMessages((currentMessages) => [
          ...currentMessages,
          appError.chatContent ? createMessage('assistant', appError.chatContent) : createProxyBlockedMessage(appError.detail),
        ]);
        setNotice({
          kind: 'info',
          title: 'Request blocked by Cato AI Security',
          detail: 'Cato AI Security prevented the accidental leakage of sensitive data to the LLM.',
          status: appError.status,
        });
      } else if (appError.keepConversation && appError.chatContent) {
        setMessages((currentMessages) => [...currentMessages, createMessage('assistant', appError.chatContent ?? appError.detail)]);
        setNotice({
          kind: 'info',
          title: appError.title,
          detail: appError.detail,
          status: appError.status,
        });
      } else {
        setMessages(previousMessages);
        setDraft(userMessage.content);
        setNotice({
          kind: 'error',
          title: appError.title,
          detail: appError.detail,
          status: appError.status,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy(message: ChatMessage) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      setNotice({
        kind: 'success',
        title: 'Copied to clipboard',
        detail: 'Assistant response copied successfully.',
      });
    } catch {
      setNotice({
        kind: 'error',
        title: 'Copy failed',
        detail: 'Clipboard access was unavailable in this browser context.',
      });
    }
  }

  function handleModeChange(nextMode: AppSettings['mode']) {
    setSettings((current) => ({ ...current, mode: nextMode }));
    setNotice(null);
  }

  function handleClearConversation() {
    setMessages([]);
    setDraft('');
    setInputError(null);
    setNotice({
      kind: 'info',
      title: 'Conversation cleared',
      detail: 'The current thread has been reset.',
    });
  }

  return (
    <main className="app-shell">
      <div className="ambient-gradient ambient-gradient-left" />
      <div className="ambient-gradient ambient-gradient-right" />

      <section className="app-frame">
        <header className="hero-panel">
          <div className="hero-copy">
            <p className="hero-kicker">AI powered chatbot</p>
            <h1>CatoVerse</h1>
            <p className="hero-subtitle">
              Switch between direct Gemini access and a custom OpenAI-compatible proxy without leaving the same
              conversation frame.
            </p>
          </div>

          <div className="hero-tools">
            <ModeSelector mode={settings.mode} disabled={isLoading} onChange={handleModeChange} />
            <div className="hero-stats">
              <div className="hero-stat-card">
                <span>Active path</span>
                <strong>{settings.mode === 'direct' ? 'Google Gemini' : 'Gateway relay'}</strong>
              </div>
              <div className="hero-stat-card">
                <span>Model</span>
                <strong>{activeModel || 'Choose a model'}</strong>
              </div>
            </div>
          </div>
        </header>

        <SettingsPanel
          settings={settings}
          fieldErrors={fieldErrors}
          disabled={isLoading}
          onSettingsChange={setSettings}
        />

        {notice ? (
          <section className={`notice-banner notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
            <div>
              <strong>{notice.title}</strong>
              <p>{notice.detail}</p>
            </div>
            {notice.status ? <span>HTTP {notice.status}</span> : null}
          </section>
        ) : null}

        <ChatWindow
          mode={settings.mode}
          messages={messages}
          draft={draft}
          inputError={inputError}
          copiedMessageId={copiedMessageId}
          isLoading={isLoading}
          onDraftChange={(value) => {
            setDraft(value);
            if (inputError && value.trim()) {
              setInputError(null);
            }
          }}
          onSend={handleSend}
          onClear={handleClearConversation}
          onCopy={handleCopy}
        />
      </section>
    </main>
  );
}

export default App;
