import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import ResultCard from '../components/ResultCard';
import { ApiError, isNetworkError, submitScan } from '../api';
import { addHistoryEntry, addPendingScan, getHistory, getPending } from '../storage';
import { colors } from '../theme';
import type { CachedSession, ScanFeedback } from '../types';

interface Props {
  session: CachedSession;
  deviceId: string;
  onScannedOffline: () => void;
  onOnlineSync: () => void;
  onOpenHistory: () => void;
  onEnd: () => void;
}

function formatWindow(session: CachedSession): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(':');
    const date = new Date(2000, 0, 1, parseInt(h, 10), parseInt(m, 10));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  const d = new Date(`${session.eventDate}T00:00:00`);
  const dateLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${dateLabel} · ${fmt(session.startTime)} – ${fmt(session.endTime)}`;
}

export default function ScanScreen({ session, deviceId, onScannedOffline, onOnlineSync, onOpenHistory, onEnd }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [torch, setTorch] = useState(false);
  const lastTokenRef = useRef<{ token: string; at: number } | null>(null);
  const scannedTokensRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [pending, history] = await Promise.all([getPending(), getHistory()]);
      if (!mounted) return;
      for (const p of pending) {
        if (
          p.passcode === session.passcode &&
          (p.status === 'pending' || p.status === 'duplicate')
        ) {
          scannedTokensRef.current.add(p.qrCodeToken);
        }
      }
      setScannedCount(history.filter((h) => h.passcode === session.passcode).length);
    })();
    return () => {
      mounted = false;
    };
  }, [session.passcode]);

  async function handleBarcode(rawToken: string) {
    if (processing) return;
    const token = rawToken.trim();
    if (!token) return;

    const now = Date.now();
    if (lastTokenRef.current?.token === token && now - lastTokenRef.current.at < 3000) return;
    lastTokenRef.current = { token, at: now };

    const student = session.students.find((s) => s.qrCodeToken === token);
    if (!student) {
      setProcessing(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFeedback({
        kind: 'error',
        title: 'Not on the list',
        message: "This QR code isn't on the list for this event. Please check and try again.",
      });
      setTimeout(() => {
        setFeedback(null);
        setProcessing(false);
      }, 2500);
      return;
    }

    if (scannedTokensRef.current.has(token)) {
      setProcessing(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFeedback({
        kind: 'error',
        title: 'Already recorded',
        studentName: `${student.firstName} ${student.lastName}`,
        message: "This student's attendance is already recorded for this event.",
      });
      setTimeout(() => {
        setFeedback(null);
        setProcessing(false);
      }, 2500);
      return;
    }

    setProcessing(true);
    const scannedAt = new Date().toISOString();
    const studentName = `${student.firstName} ${student.lastName}`;

    try {
      const res = await submitScan({
        passcode: session.passcode,
        qrCodeToken: token,
        scannerDeviceId: deviceId,
        scannedAt,
      });
      Haptics.notificationAsync(
        res.status === 'late'
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
      );
      setFeedback({
        kind: 'online',
        status: res.status,
        title: res.status === 'late' ? 'Late' : 'Attendance recorded',
        studentName,
        message:
          res.status === 'late'
            ? 'Marked as late for this event.'
            : 'Marked as present for this event.',
      });
      setScannedCount((c) => c + 1);
      scannedTokensRef.current.add(token);
      void addHistoryEntry({
        passcode: session.passcode,
        eventTitle: session.title,
        studentId: student.id,
        studentName,
        studentNumber: student.studentId,
        scannedAt,
        synced: true,
        status: res.status,
      });
      onOnlineSync();
    } catch (err) {
      if (isNetworkError(err)) {
        const pending = await addPendingScan({
          passcode: session.passcode,
          qrCodeToken: token,
          studentId: student.id,
          studentName,
          studentNumber: student.studentId,
          scannedAt,
          status: 'pending',
        });
        void addHistoryEntry({
          pendingId: pending.id,
          passcode: session.passcode,
          eventTitle: session.title,
          studentId: student.id,
          studentName,
          studentNumber: student.studentId,
          scannedAt,
          synced: false,
        });
        Vibration.vibrate(100);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setFeedback({
          kind: 'offline',
          title: 'Saved on this phone',
          studentName,
          message:
            "You're offline right now. This scan is saved on this phone and will be sent automatically when you're back online.",
        });
        setScannedCount((c) => c + 1);
        scannedTokensRef.current.add(token);
        onScannedOffline();
      } else if (err instanceof ApiError && err.statusCode === 409) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setFeedback({
          kind: 'error',
          title: 'Already recorded',
          studentName,
          message: "This student's attendance is already recorded for this event.",
        });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setFeedback({
          kind: 'error',
          title: "Couldn't record",
          studentName,
          message:
            err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
        });
      }
    } finally {
      setTimeout(() => {
        setFeedback(null);
        setProcessing(false);
      }, 2500);
    }
  }

  if (!permission) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.centerText}>Requesting camera access…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.centerTitle}>Camera access needed</Text>
        <Text style={styles.centerText}>
          The scanner needs the camera to read student QR codes.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.permBtnText}>Grant access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.eventTitle}>{session.title}</Text>
          <Text style={styles.eventMeta}>
            {session.venue ? `${session.venue} · ` : ''}
            {formatWindow(session)}
          </Text>
        </View>
        <TouchableOpacity style={styles.endBtn} onPress={onEnd} activeOpacity={0.85}>
          <Text style={styles.endBtnText}>End</Text>
        </TouchableOpacity>
      </View>

      {feedback ? <ResultCard feedback={feedback} /> : null}

      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={processing ? undefined : ({ data }) => handleBarcode(data)}
        />
        <View pointerEvents="none" style={styles.scanFrame}>
          <View style={styles.scanCorners} />
          <Text style={styles.scanHint}>Point the camera at a student QR code</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} onPress={() => setTorch((t) => !t)} activeOpacity={0.85}>
          <Text style={styles.footerBtnText}>{torch ? 'Flash off' : 'Flash on'}</Text>
        </TouchableOpacity>
        <Text style={styles.counter}>Scanned: {scannedCount}</Text>
        <TouchableOpacity style={styles.footerBtn} onPress={onOpenHistory} activeOpacity={0.85}>
          <Text style={styles.footerBtnText}>Scanned QR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral900,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.brandDark,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    color: colors.neutral0,
    fontSize: 17,
    fontWeight: '700',
  },
  eventMeta: {
    color: colors.brandLight,
    fontSize: 12,
  },
  endBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginLeft: 10,
  },
  endBtnText: {
    color: colors.neutral0,
    fontSize: 14,
    fontWeight: '600',
  },
  cameraWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    position: 'absolute',
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCorners: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderColor: colors.brandAccent,
    borderRadius: 20,
    opacity: 0.9,
  },
  scanHint: {
    color: colors.neutral0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 12,
    position: 'absolute',
    bottom: -44,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.neutral900,
  },
  footerBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  footerBtnText: {
    color: colors.neutral0,
    fontSize: 13,
    fontWeight: '600',
  },
  counter: {
    color: colors.neutral0,
    fontSize: 13,
  },
  centerBox: {
    flex: 1,
    backgroundColor: colors.neutral0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  centerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral900,
  },
  centerText: {
    fontSize: 14,
    color: colors.mutedFg,
    textAlign: 'center',
  },
  permBtn: {
    marginTop: 8,
    backgroundColor: colors.brandDark,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  permBtnText: {
    color: colors.neutral0,
    fontSize: 15,
    fontWeight: '700',
  },
});
