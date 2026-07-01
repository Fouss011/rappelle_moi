import { StyleSheet, Text, View } from 'react-native';

type ReminderSummaryProps = {
  count: number;
};

export function ReminderSummary({ count }: ReminderSummaryProps) {
  return (
    <View style={styles.reminderSummary}>
      <Text style={styles.reminderSummaryText}>
        🔔 Rappels programmés : {count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  reminderSummary: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  reminderSummaryText: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
});