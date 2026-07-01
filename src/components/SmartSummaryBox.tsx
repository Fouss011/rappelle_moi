import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SmartSummaryBoxProps = {
  dailySummary: string;
};

export function SmartSummaryBox({ dailySummary }: SmartSummaryBoxProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBubble}>
          <Text style={styles.icon}>✨</Text>
        </View>

        <View style={styles.titleBox}>
          <Text style={styles.title}>Résumé intelligent</Text>
          <Text style={styles.subtitle}>Ce que ton cerveau a capturé aujourd’hui</Text>
        </View>
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>
          {dailySummary || 'Ajoute quelques idées et je te préparerai un résumé clair de ta journée.'}
        </Text>
      </View>

      <TouchableOpacity style={styles.button} activeOpacity={0.85}>
        <Text style={styles.buttonText}>Analyser ma journée</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
    backgroundColor: '#111827',
    borderRadius: 30,
    padding: 18,
    shadowColor: '#111827',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  icon: {
    fontSize: 24,
  },

  titleBox: {
    flex: 1,
  },

  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#CBD5E1',
  },

  summaryBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  summaryText: {
    color: '#F8FAFC',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },

  button: {
    marginTop: 14,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
});