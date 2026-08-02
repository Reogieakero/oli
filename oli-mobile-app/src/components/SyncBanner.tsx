import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  pendingCount: number;
  isOnline: boolean;
  syncing: boolean;
  onSync: () => void;
}

export default function SyncBanner({ pendingCount, isOnline, syncing, onSync }: Props) {
  if (pendingCount === 0) return null;

  const label = syncing
    ? 'Sending your saved scans…'
    : isOnline
      ? `You have ${pendingCount} scan${pendingCount > 1 ? 's' : ''} waiting to be sent`
      : `${pendingCount} scan${pendingCount > 1 ? 's' : ''} — will be sent when you're back online`;

  return (
    <View style={styles.banner}>
      <View style={styles.info}>
        {syncing ? (
          <ActivityIndicator size="small" color={colors.brandPrimary} />
        ) : (
          <View style={[styles.dot, { backgroundColor: isOnline ? colors.success : colors.warning }]} />
        )}
        <Text style={styles.text}>{label}</Text>
      </View>
      {!syncing && isOnline && (
        <TouchableOpacity onPress={onSync} style={styles.syncBtn} activeOpacity={0.85}>
          <Text style={styles.syncBtnText}>Sync now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    shadowColor: colors.neutral900,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 13,
    color: colors.neutral900,
    flexShrink: 1,
  },
  syncBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  syncBtnText: {
    color: colors.neutral0,
    fontSize: 13,
    fontWeight: '700',
  },
});
