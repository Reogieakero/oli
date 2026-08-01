import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { ScanFeedback } from '../types';

export default function ResultCard({ feedback }: { feedback: ScanFeedback }) {
  const accent =
    feedback.kind === 'online'
      ? feedback.status === 'late'
        ? colors.warning
        : colors.success
      : feedback.kind === 'offline'
        ? colors.warning
        : colors.danger;

  const icon =
    feedback.kind === 'online'
      ? feedback.status === 'late'
        ? '!'
        : '✓'
      : feedback.kind === 'offline'
        ? '↻'
        : '×';

  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <View style={[styles.iconBadge, { backgroundColor: accent }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{feedback.title}</Text>
          {feedback.studentName ? (
            <Text style={styles.student}>{feedback.studentName}</Text>
          ) : null}
          <Text style={styles.message}>{feedback.message}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.neutral0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: colors.neutral900,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  accent: {
    width: 5,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: colors.neutral0,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral900,
  },
  student: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brandDark,
  },
  message: {
    fontSize: 13,
    color: colors.mutedFg,
    lineHeight: 18,
  },
});
