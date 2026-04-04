import type { AppSettings, ChatMode, FieldErrors } from '../types';

export function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function parseHeadersJson(raw: string): Record<string, string> {
  if (!raw.trim()) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Headers must be valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Headers JSON must be an object of string values.');
  }

  const normalized = Object.entries(parsed).map(([key, value]) => {
    if (typeof value !== 'string') {
      throw new Error(`Header "${key}" must use a string value.`);
    }

    return [key, value] as const;
  });

  return Object.fromEntries(normalized);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateSettings(settings: AppSettings, mode: ChatMode): FieldErrors {
  const errors: FieldErrors = {};

  if (mode === 'direct') {
    if (!settings.direct.apiKey.trim()) {
      errors.directApiKey = 'Gemini API key is required to send a request.';
    }

    if (!settings.direct.model.trim()) {
      errors.directModel = 'Choose or enter a Gemini model.';
    }

    return errors;
  }

  if (!settings.proxy.baseUrl.trim()) {
    errors.proxyBaseUrl = 'Base URL is required in proxy mode.';
  } else if (!isValidHttpUrl(settings.proxy.baseUrl.trim())) {
    errors.proxyBaseUrl = 'Enter a valid http:// or https:// base URL.';
  }

  if (!settings.proxy.model.trim()) {
    errors.proxyModel = 'Choose or enter a model for the proxy request.';
  }

  try {
    parseHeadersJson(settings.proxy.headersJson);
  } catch (error) {
    errors.proxyHeadersJson = error instanceof Error ? error.message : 'Invalid headers JSON.';
  }

  return errors;
}

export function validateMessage(value: string): string | null {
  return value.trim() ? null : 'Type a message before sending.';
}
