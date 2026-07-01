import { StyleSheet, Text, View } from 'react-native';

export function HomeHeader() {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.hello}>Bonjour 👋</Text>
        <Text style={styles.title}>RappelleMoi</Text>
        <Text style={styles.subtitle}>Ta mémoire personnelle intelligente.</Text>
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>IA</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 22,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  hello: {
    fontSize: 15,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
  },

  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#64748B',
  },

  badge: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});