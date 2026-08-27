export function createCorrelationId(): string {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return `web-${Array.from(bytes, (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("")}`;
}

export function withCorrelationId(
  headers?: HeadersInit,
  correlationId?: string,
): Headers {
  const result = new Headers(headers);
  if (!result.has("X-Correlation-ID")) {
    result.set("X-Correlation-ID", correlationId || createCorrelationId());
  }
  return result;
}
