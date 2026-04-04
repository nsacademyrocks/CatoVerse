import type { ChatMessage, ProxySettings } from '../types';
import { toAppError } from '../utils/chat';
import { normalizeBaseUrl, parseHeadersJson } from '../utils/validation';

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ProxyResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  } | string;
};

function withTimeout(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  window.setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function toOpenAIMessages(messages: ChatMessage[], systemPrompt: string): OpenAIMessage[] {
  const mapped: OpenAIMessage[] = [];

  if (systemPrompt.trim()) {
    mapped.push({
      role: 'system',
      content: systemPrompt.trim(),
    });
  }

  for (const message of messages) {
    if (message.role === 'system' || !message.content.trim()) {
      continue;
    }

    mapped.push({
      role: message.role,
      content: message.content,
    });
  }

  return mapped;
}

function extractTextContent(
  content: string | Array<{ type?: string; text?: string }> | undefined,
): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => part.text ?? '')
      .join('')
      .trim();
  }

  return '';
}

async function parseError(response: Response): Promise<never> {
  let detail = 'The proxy returned an error.';

  try {
    const payload = (await response.json()) as ProxyResponse;
    if (typeof payload.error === 'string') {
      detail = payload.error;
    } else if (payload.error?.message) {
      detail = payload.error.message;
    }
  } catch {
    if (response.statusText) {
      detail = response.statusText;
    }
  }

  if (response.status === 400) {
    throw toAppError(
      'Request blocked by Cato AI Security',
      'Cato AI Security prevented the accidental leakage of sensitive data to the LLM.',
      response.status,
      {
        keepConversation: true,
        chatContent: [
          'Cato AI Security blocked this request and prevented the accidental leakage of sensitive data to the LLM.',
          '',
          'Proxy response:',
          detail,
        ].join('\n'),
      },
    );
  }

  const title =
    response.status === 401 || response.status === 403
      ? 'Proxy authentication failed'
      : response.status === 429
        ? 'Proxy rate limit reached'
        : response.status >= 500
          ? 'Proxy service error'
          : 'Proxy request failed';

  throw toAppError(title, detail, response.status);
}

export async function sendProxyMessage(settings: ProxySettings, messages: ChatMessage[]): Promise<string> {
  const baseUrl = normalizeBaseUrl(settings.baseUrl);

  if (!baseUrl) {
    throw toAppError('Missing base URL', 'Add a proxy base URL before sending.');
  }

  if (!settings.model.trim()) {
    throw toAppError('Missing model', 'Choose a model before sending a proxy request.');
  }

  const response = await fetch('/api/proxy-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: withTimeout(60000),
    body: JSON.stringify({
      baseUrl,
      model: settings.model.trim(),
      headers: parseHeadersJson(settings.headersJson),
      messages: toOpenAIMessages(messages, settings.systemPrompt),
    }),
  }).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw toAppError('Request timed out', 'The proxy took too long to respond. Please try again.');
    }

    throw toAppError(
      'Network error',
      'The app could not reach the local relay. Make sure you started the project with python run.py.',
    );
  });

  if (!response.ok) {
    await parseError(response);
  }

  const payload = (await response.json()) as ProxyResponse;
  const content = extractTextContent(payload.choices?.[0]?.message?.content);

  if (!content) {
    throw toAppError(
      'Unexpected response',
      'The proxy response did not include assistant message content in an OpenAI-compatible format.',
    );
  }

  return content;
}
