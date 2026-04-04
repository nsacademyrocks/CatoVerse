import type { ChatMessage, DirectSettings } from '../types';
import { toAppError } from '../utils/chat';

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type OpenAIResponse = {
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
  let detail = 'Gemini returned an error.';

  try {
    const payload = (await response.json()) as OpenAIResponse;
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

  const title =
    response.status === 401 || response.status === 403
      ? 'Authentication failed'
      : response.status === 429
        ? 'Rate limit reached'
        : response.status >= 500
          ? 'Gemini service error'
          : 'Gemini request failed';

  throw toAppError(title, detail, response.status);
}

export async function sendGeminiMessage(settings: DirectSettings, messages: ChatMessage[]): Promise<string> {
  const model = settings.model.trim();
  const apiKey = settings.apiKey.trim();

  if (!apiKey) {
    throw toAppError('Missing API key', 'Add a Gemini API key before sending.');
  }

  if (!model) {
    throw toAppError('Missing model', 'Choose a Gemini model before sending.');
  }

  const response = await fetch('/api/direct-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: withTimeout(60000),
    body: JSON.stringify({
      apiKey,
      model,
      messages: toOpenAIMessages(messages, settings.systemPrompt),
    }),
  }).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw toAppError('Request timed out', 'Gemini took too long to respond. Please try again.');
    }

    throw toAppError(
      'Network error',
      'The app could not reach the local relay. Make sure you started the project with python run.py.',
    );
  });

  if (!response.ok) {
    await parseError(response);
  }

  const payload = (await response.json()) as OpenAIResponse;
  const content = extractTextContent(payload.choices?.[0]?.message?.content);

  if (!content) {
    throw toAppError(
      'Unexpected response',
      'Gemini did not return assistant message content in the expected OpenAI-compatible format.',
    );
  }

  return content;
}
