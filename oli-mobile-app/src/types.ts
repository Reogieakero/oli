export interface RosterStudent {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  qrCodeToken: string;
}

export interface EventSession {
  eventId: string;
  title: string;
  venue: string | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  lateCutoffTime: number;
  valid: boolean;
  students: RosterStudent[];
}

export interface CachedSession extends EventSession {
  passcode: string;
  cachedAt: string;
}

export interface ScanResult {
  student: { id: string; firstName: string; lastName: string; studentId: string };
  status: 'present' | 'late';
  scannedAt: string;
  absenceCount: number;
  sanction: { id: string; level: string } | null;
}

export type PendingStatus = 'pending' | 'synced' | 'failed' | 'duplicate';

export interface PendingScan {
  id: string;
  passcode: string;
  qrCodeToken: string;
  studentId?: string;
  studentName?: string;
  studentNumber?: string;
  scannedAt: string;
  status: PendingStatus;
  serverStatus?: string;
  error?: string;
  syncedAt?: string;
}

export interface ScanFeedback {
  kind: 'online' | 'offline' | 'error';
  title: string;
  message: string;
  status?: 'present' | 'late';
  studentName?: string;
  timestamp?: string;
}

export interface ScanHistoryEntry {
  id: string;
  pendingId?: string;
  passcode: string;
  eventTitle: string;
  studentId?: string;
  studentName?: string;
  studentNumber?: string;
  scannedAt: string;
  synced: boolean;
  status?: 'present' | 'late';
}
