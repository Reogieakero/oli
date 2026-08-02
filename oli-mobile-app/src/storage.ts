import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CachedSession, PendingScan, ScanHistoryEntry } from './types';

const KEYS = {
  session: 'oli:scanner:session',
  pending: 'oli:scanner:pending',
  deviceId: 'oli:scanner:deviceId',
  history: 'oli:scanner:history',
};

function randomId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getSession(): Promise<CachedSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.session);
    return raw ? (JSON.parse(raw) as CachedSession) : null;
  } catch {
    return null;
  }
}

export async function setSession(session: CachedSession | null): Promise<void> {
  try {
    if (session) {
      await AsyncStorage.setItem(KEYS.session, JSON.stringify(session));
    } else {
      await AsyncStorage.removeItem(KEYS.session);
    }
  } catch {
    // storage failure is non-fatal; scanning still works in memory
  }
}

export async function getPending(): Promise<PendingScan[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.pending);
    return raw ? (JSON.parse(raw) as PendingScan[]) : [];
  } catch {
    return [];
  }
}

export async function setPending(items: PendingScan[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.pending, JSON.stringify(items));
  } catch {
    // non-fatal
  }
}

export async function addPendingScan(item: Omit<PendingScan, 'id'>): Promise<PendingScan> {
  const pending = await getPending();
  const full: PendingScan = { ...item, id: randomId() };
  await setPending([...pending, full]);
  return full;
}

export async function getDeviceId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(KEYS.deviceId);
    if (!id) {
      id = randomId();
      await AsyncStorage.setItem(KEYS.deviceId, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

export async function getHistory(): Promise<ScanHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.history);
    return raw ? (JSON.parse(raw) as ScanHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function addHistoryEntry(entry: Omit<ScanHistoryEntry, 'id'>): Promise<ScanHistoryEntry> {
  const history = await getHistory();
  const full: ScanHistoryEntry = { ...entry, id: randomId() };
  await setHistory([full, ...history]);
  return full;
}

export async function updateHistorySynced(pendingId: string, synced: boolean): Promise<void> {
  const history = await getHistory();
  const updated = history.map((h) =>
    h.pendingId === pendingId ? { ...h, synced } : h
  );
  await setHistory(updated);
}

async function setHistory(history: ScanHistoryEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.history, JSON.stringify(history));
  } catch {
    // non-fatal
  }
}
