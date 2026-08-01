import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme';
import { API_BASE_URL, DEBUG_INFO } from '../config';
import type { CachedSession } from '../types';

interface Props {
  cachedSession: CachedSession | null;
  busy: boolean;
  error: string | null;
  onActivate: (passcode: string) => void;
  onResume: () => void;
  onClearSession: () => void;
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

export default function PasscodeScreen({
  cachedSession,
  busy,
  error,
  onActivate,
  onResume,
  onClearSession,
}: Props) {
  const [passcode, setPasscode] = useState('');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>OLI</Text>
        </View>
        <Text style={styles.title}>Attendance Scanner</Text>
        <Text style={styles.subtitle}>Scan student QR codes to record attendance</Text>
      </View>

      <View style={styles.body}>
        {cachedSession ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>ACTIVE EVENT</Text>
            <Text style={styles.cardTitle}>{cachedSession.title}</Text>
            <Text style={styles.cardMeta}>
              {cachedSession.venue ? `${cachedSession.venue} · ` : ''}
              {formatWindow(cachedSession)}
            </Text>
            <Text style={styles.cardMeta}>
              {cachedSession.students.length} students in roster · {cachedSession.passcode}
            </Text>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, styles.btnHalf]}
                onPress={onResume}
                disabled={busy}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>Resume scanning</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost, styles.btnHalf]}
                onPress={onClearSession}
                disabled={busy}
                activeOpacity={0.85}
              >
                <Text style={styles.btnGhostText}>End event</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>EVENT PASSCODE</Text>
          <TextInput
            style={styles.input}
            value={passcode}
            onChangeText={(t) => setPasscode(t.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="6-digit code"
            placeholderTextColor={colors.mutedFg}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus={!cachedSession}
            editable={!busy}
          />
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, passcode.length !== 6 && styles.btnDisabled]}
            onPress={() => onActivate(passcode)}
            disabled={busy || passcode.length !== 6}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={colors.neutral0} />
            ) : (
              <Text style={styles.btnPrimaryText}>Activate</Text>
            )}
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      {__DEV__ ? (
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>DEBUG</Text>
          <Text style={styles.footerText}>apiBaseUrl: {API_BASE_URL}</Text>
          <Text style={styles.footerText}>
            EXPO_PUBLIC_API_URL: {DEBUG_INFO.envApiUrl ?? '(not set)'}
          </Text>
          <Text style={styles.footerText}>hostUri: {DEBUG_INFO.hostUri ?? '(none)'}</Text>
          {error ? <Text style={styles.footerError}>lastError: {error}</Text> : null}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.brandDark,
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  logoBadge: {
    backgroundColor: colors.neutral0,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 14,
  },
  logoText: {
    color: colors.brandDark,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.neutral0,
  },
  subtitle: {
    fontSize: 14,
    color: colors.brandLight,
    marginTop: 6,
    textAlign: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -20,
  },
  card: {
    backgroundColor: colors.neutral0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 16,
    gap: 6,
    shadowColor: colors.neutral900,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.brandPrimary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral900,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.mutedFg,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    letterSpacing: 10,
    color: colors.neutral900,
    backgroundColor: colors.neutral0,
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnHalf: {
    flex: 1,
  },
  btnPrimary: {
    backgroundColor: colors.brandPrimary,
  },
  btnPrimaryText: {
    color: colors.neutral0,
    fontSize: 15,
    fontWeight: '700',
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnGhostText: {
    color: colors.neutral900,
    fontSize: 14,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    padding: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 2,
  },
  footerLabel: {
    fontSize: 10,
    letterSpacing: 1,
    color: colors.mutedFg,
    fontWeight: '700',
  },
  footerText: {
    fontSize: 11,
    color: colors.mutedFg,
  },
  footerError: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
  },
});
