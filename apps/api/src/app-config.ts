const DEFAULT_API_PORT = 3001;
const DEV_LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"] as const;
const DEV_ORIGIN_PORTS = [3000, 3001, 5173] as const;

export function readApiPort(env: NodeJS.ProcessEnv = process.env): number {
  const value = env.API_PORT;

  if (!value) {
    return DEFAULT_API_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("API_PORT must be a positive integer");
  }

  return port;
}

export function readCorsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const value = env.CORS_ORIGINS ?? env.NEXT_PUBLIC_API_BASE;

  if (!value) {
    return buildDefaultCorsOrigins();
  }

  return expandCorsOrigins(value.split(",").map((origin) => origin.trim()).filter(Boolean));
}

function buildDefaultCorsOrigins(): string[] {
  return DEV_ORIGIN_PORTS.flatMap((port) => DEV_LOOPBACK_HOSTS.map((host) => `http://${host}:${port}`));
}

function expandCorsOrigins(origins: string[]): string[] {
  const expanded = origins.flatMap(expandOrigin);
  return [...new Set(expanded)];
}

function expandOrigin(origin: string): string[] {
  try {
    const url = new URL(origin);

    if (!DEV_LOOPBACK_HOSTS.includes(url.hostname as (typeof DEV_LOOPBACK_HOSTS)[number])) {
      return [origin];
    }

    return DEV_LOOPBACK_HOSTS.map((host) => `${url.protocol}//${host}:${url.port}`);
  } catch {
    return [origin];
  }
}
