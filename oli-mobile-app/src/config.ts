import Constants from 'expo-constants';

function resolveApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    // Tunnel mode hosts look like <id>.anonymous.<region>.exp.direct — the
    // backend API is NOT served there, so only trust plain LAN IPs/hosts.
    const isTunnel = /\.exp\.direct$/i.test(host);
    if (host && !isTunnel) return `http://${host}:4000/api/v1`;
  }

  return 'http://localhost:4000/api/v1';
}

export const API_BASE_URL = resolveApiBase();
export const API_TIMEOUT_MS = 8000;
