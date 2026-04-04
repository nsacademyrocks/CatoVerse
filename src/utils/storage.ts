import type { AppSettings, DirectSettings, ProxySettings } from '../types';
import { DEFAULT_SETTINGS } from './chat';

const STORAGE_KEY = 'local-cato-chat:preferences';

type StoredPreferences = {
  mode: AppSettings['mode'];
  direct: Pick<DirectSettings, 'model' | 'systemPrompt'>;
  proxy: Pick<ProxySettings, 'baseUrl' | 'model' | 'headersJson' | 'systemPrompt'>;
};

function getDefaults(): AppSettings {
  return {
    mode: DEFAULT_SETTINGS.mode,
    direct: { ...DEFAULT_SETTINGS.direct },
    proxy: { ...DEFAULT_SETTINGS.proxy },
  };
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

export function loadSettings(): AppSettings {
  const storage = getStorage();
  if (!storage) {
    return getDefaults();
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaults();
    }

    const parsed = JSON.parse(raw) as Partial<StoredPreferences>;

    return {
      mode: parsed.mode === 'proxy' ? 'proxy' : 'direct',
      direct: {
        ...DEFAULT_SETTINGS.direct,
        model: parsed.direct?.model ?? DEFAULT_SETTINGS.direct.model,
        systemPrompt: parsed.direct?.systemPrompt ?? DEFAULT_SETTINGS.direct.systemPrompt,
        apiKey: '',
      },
      proxy: {
        ...DEFAULT_SETTINGS.proxy,
        baseUrl: parsed.proxy?.baseUrl ?? DEFAULT_SETTINGS.proxy.baseUrl,
        model: parsed.proxy?.model ?? DEFAULT_SETTINGS.proxy.model,
        headersJson: parsed.proxy?.headersJson ?? DEFAULT_SETTINGS.proxy.headersJson,
        systemPrompt: parsed.proxy?.systemPrompt ?? DEFAULT_SETTINGS.proxy.systemPrompt,
      },
    };
  } catch {
    return getDefaults();
  }
}

export function persistSettings(settings: AppSettings): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const payload: StoredPreferences = {
    mode: settings.mode,
    direct: {
      model: settings.direct.model,
      systemPrompt: settings.direct.systemPrompt,
    },
    proxy: {
      baseUrl: settings.proxy.baseUrl,
      model: settings.proxy.model,
      headersJson: settings.proxy.headersJson,
      systemPrompt: settings.proxy.systemPrompt,
    },
  };

  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
