import { API_BASE_URL, API_TIMEOUT_MS } from './config';
import { debugLog, debugWarn } from './log';
import type { EventSession, ScanResult } from './types';

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function isNetworkError(err: unknown): boolean {
  return err instanceof ApiError && err.statusCode === 0;
}

async function request<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  debugLog(`→ POST ${API_BASE_URL}${path}`, body);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    const reason =
      err instanceof Error && err.name === 'AbortError'
        ? `timeout after ${API_TIMEOUT_MS}ms`
        : err instanceof Error
          ? err.message
          : 'unknown network error';
    debugWarn(`✗ ${path} network failure: ${reason}`);
    throw new ApiError(
      "You're offline or can't reach our servers right now. Check your connection and try again.",
      0
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data: { error?: { message?: string } } = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  debugLog(`← ${path} HTTP ${res.status}`, text.slice(0, 300));

  if (!res.ok) {
    const friendly =
      data?.error?.message ||
      (res.status >= 500
        ? "We hit a snag on our end. Please try again in a moment."
        : "That didn't work. Please try again.");
    debugWarn(`← ${path} HTTP ${res.status}: ${friendly}`);
    throw new ApiError(friendly, res.status);
  }

  return data as T;
}

export function activateEvent(passcode: string): Promise<EventSession> {
  return request<EventSession>('/attendance/activate', { passcode });
}

export function submitScan(input: {
  passcode: string;
  qrCodeToken: string;
  scannerDeviceId: string;
  scannedAt: string;
}): Promise<ScanResult> {
  return request<ScanResult>('/attendance/scan', input);
}
