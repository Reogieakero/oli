import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import PasscodeScreen from './src/screens/PasscodeScreen';
import ScanScreen from './src/screens/ScanScreen';
import SyncBanner from './src/components/SyncBanner';
import { activateEvent, ApiError, isNetworkError, submitScan } from './src/api';
import { debugLog, debugWarn } from './src/log';
import {
  getDeviceId,
  getPending,
  getSession,
  setPending,
  setSession,
} from './src/storage';
import type { CachedSession, PendingScan } from './src/types';
import { colors } from './src/theme';

type Screen = 'passcode' | 'scan';

export default function App() {
  const [session, setSessionState] = useState<CachedSession | null>(null);
  const [screen, setScreen] = useState<Screen>('passcode');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const deviceIdRef = useRef('');

  const refreshPending = useCallback(async () => {
    const pending = await getPending();
    setPendingCount(pending.filter((p) => p.status === 'pending').length);
  }, []);

  const syncNow = useCallback(async () => {
    const pending = await getPending();
    const active = pending.filter((p) => p.status === 'pending');
    if (active.length === 0) return;

    setSyncing(true);
    try {
      const kept: PendingScan[] = [];
      for (const p of pending) {
        if (p.status !== 'pending') {
          kept.push(p);
          continue;
        }
        try {
          await submitScan({
            passcode: p.passcode,
            qrCodeToken: p.qrCodeToken,
            scannerDeviceId: deviceIdRef.current,
            scannedAt: p.scannedAt,
          });
        } catch (err) {
          if (isNetworkError(err)) {
            kept.push(p);
          } else if (err instanceof ApiError && err.statusCode === 409) {
            kept.push({
              ...p,
              status: 'duplicate',
              error: err.message,
              syncedAt: new Date().toISOString(),
            });
          } else {
            kept.push({
              ...p,
              status: 'failed',
              error: err instanceof Error ? err.message : 'Sync failed',
            });
          }
        }
      }
      await setPending(kept);
      setPendingCount(kept.filter((p) => p.status === 'pending').length);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const [cached, deviceId] = await Promise.all([getSession(), getDeviceId()]);
      deviceIdRef.current = deviceId;
      if (!mounted) return;
      setSessionState(cached);
      if (cached) setScreen('scan');
      await refreshPending();
    })();

    const netSub = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void refreshPending();
        void syncNow();
      }
    });

    return () => {
      mounted = false;
      netSub();
      appSub.remove();
    };
  }, [refreshPending, syncNow]);

  const handleActivate = useCallback(
    async (passcode: string) => {
      setBusy(true);
      setError(null);
      debugLog(`activate attempt, passcode=${passcode}`);
      try {
        const data = await activateEvent(passcode);
        debugLog(`activate OK: "${data.title}" (${data.students.length} students)`);
        const cached: CachedSession = {
          ...data,
          passcode,
          cachedAt: new Date().toISOString(),
        };
        await setSession(cached);
        setSessionState(cached);
        setScreen('scan');
      } catch (err) {
        debugWarn('activate FAILED:', err);
        if (isNetworkError(err)) {
          const cached = await getSession();
          if (cached && cached.passcode === passcode) {
            debugLog('resuming cached offline session');
            setSessionState(cached);
            setScreen('scan');
          } else {
            setError(
              "You're offline and there's no saved event for this code. Connect to the internet to start an event, or resume a saved one."
            );
          }
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Something went wrong. Try again.');
        }
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const handleResume = useCallback(() => {
    if (session) {
      setScreen('scan');
      setError(null);
    }
  }, [session]);

  const handleEnd = useCallback(() => {
    void setSession(null);
    setSessionState(null);
    setScreen('passcode');
    setError(null);
  }, []);

  const handleScannedOffline = useCallback(() => {
    void refreshPending();
    void syncNow();
  }, [refreshPending, syncNow]);

  const handleOnlineSync = useCallback(() => {
    void syncNow();
  }, [syncNow]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar style="light" />
        <SyncBanner
          pendingCount={pendingCount}
          isOnline={isOnline}
          syncing={syncing}
          onSync={() => void syncNow()}
        />
        <View style={styles.content}>
          {screen === 'passcode' || !session ? (
            <PasscodeScreen
              cachedSession={session}
              busy={busy}
              error={error}
              onActivate={handleActivate}
              onResume={handleResume}
              onClearSession={handleEnd}
            />
          ) : (
            <ScanScreen
              session={session}
              deviceId={deviceIdRef.current}
              onScannedOffline={handleScannedOffline}
              onOnlineSync={handleOnlineSync}
              onEnd={handleEnd}
            />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.brandDark,
  },
  content: {
    flex: 1,
  },
});
