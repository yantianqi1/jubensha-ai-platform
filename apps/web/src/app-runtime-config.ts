const API_PORT = "3001";
const FALLBACK_API_HOST = "127.0.0.1";
const UNSAFE_BROWSER_HOSTS = new Set(["", "0.0.0.0", "::", "[::]"]);

export interface BrowserLocationLike {
  readonly protocol: string;
  readonly hostname: string;
}

export function resolveApiBaseUrl(location: BrowserLocationLike): string {
  if (location.protocol !== "http:" && location.protocol !== "https:") {
    return `http://${FALLBACK_API_HOST}:${API_PORT}`;
  }

  const host = normalizeApiHost(location.hostname);
  return `${location.protocol}//${host}:${API_PORT}`;
}

function normalizeApiHost(hostname: string): string {
  if (UNSAFE_BROWSER_HOSTS.has(hostname)) {
    return FALLBACK_API_HOST;
  }

  if (hostname.includes(":") && !hostname.startsWith("[")) {
    return `[${hostname}]`;
  }

  return hostname;
}
