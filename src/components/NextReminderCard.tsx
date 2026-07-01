import { StyleSheet, Text, View } from 'react-native';

type NextReminderCardProps = {
  reminder?: {
    text: string;
    reminderAt?: string;
    notifyAt?: string;
  };
};

export function NextReminderCard({
  reminder,
}: NextReminderCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.smallTitle}>
        Prochain rappel
      </Text>

      {reminder ? (
        <>
          <Text style={styles.title}>
            {reminder.text}
          </Text>

          <Text style={styles.time}>
            {reminder.reminderAt}
          </Text>

          <Text style={styles.info}>
            Notification prévue à {reminder.notifyAt}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.title}>
            Rien de prévu
          </Text>

          <Text style={styles.info}>
            Tu n'as aucun rappel programmé.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 22,
    marginBottom: 18,

    borderWidth: 1,
    borderColor: '#E7EDF5',

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },

    elevation: 4,
  },

  smallTitle: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '800',
  },

  title: {
    marginTop: 10,
    color: '#0F172A',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
  },

  time: {
    marginTop: 18,
    fontSize: 36,
    color: '#2563EB',
    fontWeight: '900',
  },

  info: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
});