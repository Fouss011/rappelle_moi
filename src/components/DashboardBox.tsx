import { StyleSheet, Text, View } from 'react-native';

type DashboardBoxProps = {
  todayNotesCount: number;
  todayReminderCount: number;
  todayImportantCount: number;
  todayDoneCount: number;
};

export function DashboardBox({
  todayNotesCount,
  todayReminderCount,
  todayImportantCount,
  todayDoneCount,
}: DashboardBoxProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Vue du jour</Text>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.icon}>📝</Text>
          <Text style={styles.value}>{todayNotesCount}</Text>
          <Text style={styles.label}>Notes</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.icon}>⏰</Text>
          <Text style={styles.value}>{todayReminderCount}</Text>
          <Text style={styles.label}>Rappels</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.icon}>⭐</Text>
          <Text style={styles.value}>{todayImportantCount}</Text>
          <Text style={styles.label}>Importants</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.icon}>✅</Text>
          <Text style={styles.value}>{todayDoneCount}</Text>
          <Text style={styles.label}>Terminés</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  icon: {
    fontSize: 23,
    marginBottom: 10,
  },

  value: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },

  label: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
});