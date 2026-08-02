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

const FRIENDLY_ERRORS: Record<string, string> = {
  'invalid passcode': "That passcode doesn't look right. Double-check it and try again.",
  'passcode has expired': 'That passcode has expired. Please ask the organizer for a new one.',
  'event is not active': "This event isn't active right now.",
  'invalid qr code — student not found': "This QR code isn't recognized. Please try again.",
  'event has not started yet': "This event hasn't started yet.",
  'event has already ended': 'This event has already ended.',
  'attendance already recorded for this event': "This student's attendance is already recorded for this event.",
};

export function isNetworkError(err: unknown): boolean {
  return err instanceof ApiError && err.statusCode === 0;
}

async function request<T>(path: string, body: unknown): Promise<T> {
  const attempts = 2;

  for (let attemptNo = 1; attemptNo <= attempts; attemptNo++) {
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
      clearTimeout(timer);
      const reason =
        err instanceof Error && err.name === 'AbortError'
          ? `timeout after ${API_TIMEOUT_MS}ms`
          : err instanceof Error
            ? err.message
            : 'unknown network error';
      debugWarn(`✗ ${path} network failure: ${reason}`);
      if (attemptNo < attempts) {
        debugWarn(`→ retrying ${path} after network failure`);
        continue;
      }
      throw new ApiError(
        "You're not connected to the internet. Check your connection and try again.",
        0
      );
    }
    clearTimeout(timer);

    const text = await res.text();
    let data: { error?: { message?: string } } = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    debugLog(`← ${path} HTTP ${res.status}`, text.slice(0, 300));

    if (!res.ok) {
      const raw = data?.error?.message || '';
      const isServerIssue = res.status >= 500;
      if (isServerIssue && attemptNo < attempts) {
        debugWarn(`→ retrying ${path} after HTTP ${res.status}`);
        continue;
      }
      const friendly =
        FRIENDLY_ERRORS[raw.toLowerCase().trim()] ||
        (isServerIssue
          ? 'Something went wrong on our side. Please try again in a moment.'
          : "That didn't go through. Please try again.");
      debugWarn(`← ${path} HTTP ${res.status}: ${friendly}`);
      throw new ApiError(friendly, res.status);
    }

    return data as T;
  }

  throw new ApiError("That didn't go through. Please try again.", 500);
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
