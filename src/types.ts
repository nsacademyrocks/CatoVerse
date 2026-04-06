export type ChatMode = 'direct' | 'proxy';
export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
};

export type DirectSettings = {
  apiKey: string;
  model: string;
  systemPrompt: string;
};

export type ProxySettings = {
  baseUrl: string;
  apiKey: string;
  userEmail: string;
  model: string;
  headersJson: string;
  systemPrompt: string;
};

export type AppSettings = {
  mode: ChatMode;
  direct: DirectSettings;
  proxy: ProxySettings;
};

export type AppError = {
  title: string;
  detail: string;
  status?: number;
  chatContent?: string;
  keepConversation?: boolean;
};

export type Notice = {
  kind: 'error' | 'info' | 'success';
  title: string;
  detail: string;
  status?: number;
};

export type FieldErrors = Partial<Record<string, string>>;
