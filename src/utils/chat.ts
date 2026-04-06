import type { AppError, ChatMessage, ChatRole } from '../types';

export const DIRECT_MODEL_OPTIONS = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-pro', 'custom'];
export const PROXY_MODEL_OPTIONS = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-pro', 'custom'];

export const DEFAULT_SETTINGS = {
  mode: 'direct',
  direct: {
    apiKey: '',
    model: 'gemini-3-flash-preview',
    systemPrompt: 'You are a concise, helpful AI assistant.',
  },
  proxy: {
    baseUrl: 'https://api.aisec.in1.catonetworks.com/fw/v1/proxy/gemini',
    apiKey: '',
    userEmail: '',
    model: 'gemini-3-flash-preview',
    headersJson: '{}',
    systemPrompt: 'You are a concise, helpful AI assistant.',
  },
} as const;

export function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: Date.now(),
  };
}

export function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

export function toAppError(
  title: string,
  detail: string,
  status?: number,
  extras?: Pick<AppError, 'chatContent' | 'keepConversation'>,
): AppError {
  return {
    title,
    detail,
    status,
    ...extras,
  };
}

export function getErrorMessage(error: unknown): AppError {
  if (
    error &&
    typeof error === 'object' &&
    'title' in error &&
    'detail' in error &&
    typeof (error as AppError).title === 'string' &&
    typeof (error as AppError).detail === 'string'
  ) {
    return error as AppError;
  }

  if (error instanceof Error) {
    return toAppError('Request failed', error.message);
  }

  return toAppError('Unexpected error', 'Something went wrong while processing your request.');
}
