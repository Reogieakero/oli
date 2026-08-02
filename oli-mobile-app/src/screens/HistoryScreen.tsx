import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getHistory } from '../storage';
import { colors } from '../theme';
import type { ScanHistoryEntry } from '../types';

interface Props {
  onClose: () => void;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function HistoryScreen({ onClose }: Props) {
  const [entries, setEntries] = useState<ScanHistoryEntry[]>([]);

  useEffect(() => {
    getHistory().then(setEntries);
  }, []);

  const syncedCount = entries.filter((e) => e.synced).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.85}
        >
          <View style={styles.chevron} />
        </TouchableOpacity>
        <Text style={styles.title}>Scanned QR</Text>
        <View style={styles.headerSpacer} />
      </View>

      {entries.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptyText}>
            Scans made on this phone will show up here, so you can see what has been saved
            to the database and what is still only on this phone.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {entries.length} scan{entries.length > 1 ? 's' : ''} · {syncedCount} saved to
              database · {entries.length - syncedCount} local only
            </Text>
          </View>
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const synced = item.synced;
              return (
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.studentName}>{item.studentName ?? 'Unknown student'}</Text>
                      {item.studentNumber ? (
                        <Text style={styles.studentNumber}>{item.studentNumber}</Text>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: synced ? colors.successBg : colors.warningBg },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: synced ? colors.success : colors.warning }]}>
                        {synced ? 'Saved to database' : 'Local only'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardBottom}>
                    <Text style={styles.eventText}>{item.eventTitle}</Text>
                    <Text style={styles.timeText}>{formatTime(item.scannedAt)}</Text>
                  </View>
                  {!synced && (
                    <Text style={styles.notSentText}>Not sent yet — will send when you're back online.</Text>
                  )}
                </View>
              );
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.brandDark,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: 11,
    height: 11,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: colors.neutral0,
    transform: [{ rotate: '45deg' }],
    marginLeft: 4,
  },
  title: {
    color: colors.neutral0,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 40,
  },
  summaryRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  summaryText: {
    fontSize: 13,
    color: colors.mutedFg,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    backgroundColor: colors.neutral0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
    shadowColor: colors.neutral900,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral900,
  },
  studentNumber: {
    fontSize: 13,
    color: colors.mutedFg,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  eventText: {
    flex: 1,
    fontSize: 13,
    color: colors.brandDark,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: colors.mutedFg,
  },
  notSentText: {
    fontSize: 12,
    color: colors.warning,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral900,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedFg,
    textAlign: 'center',
    lineHeight: 20,
  },
});
