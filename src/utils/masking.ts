const SECRET_PATTERNS = ['authorization', 'api-key', 'x-api-key', 'token', 'secret', 'key'];

export function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.length <= 8) {
    return '•'.repeat(trimmed.length);
  }

  return `${trimmed.slice(0, 3)}${'•'.repeat(Math.max(4, trimmed.length - 6))}${trimmed.slice(-3)}`;
}

export function maskHeaderMap(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => {
      const shouldMask = SECRET_PATTERNS.some((pattern) => key.toLowerCase().includes(pattern));
      return [key, shouldMask ? maskSecret(value) : value];
    }),
  );
}
