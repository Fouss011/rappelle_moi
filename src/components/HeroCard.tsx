import { StyleSheet, Text, View } from 'react-native';

type HeroCardProps = {
  userName?: string;
};

export function HeroCard({ userName = 'Fousséni' }: HeroCardProps) {
  const today = new Date();

  const dateLabel = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.greeting}>Bonjour, {userName}</Text>
        <Text style={styles.date}>{dateLabel}</Text>
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>Aujourd’hui</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  greeting: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },

  date: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },

  badge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2563EB',
  },
});