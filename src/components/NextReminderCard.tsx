import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Reminder = {
  id: string;
  title: string;
  text: string;
  reminderAt?: string;
  reminderAtIso?: string;
  notifyAt?: string;
};

type NextReminderCardProps = {
  reminders: Reminder[];
  onSeeAll: () => void;
};

function formatReminderDate(dateIso?: string) {
  if (!dateIso) {
    return '';
  }

  const date = new Date(dateIso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const time = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSameDay(date, today)) {
    return `Aujourd’hui à ${time}`;
  }

  if (isSameDay(date, tomorrow)) {
    return `Demain à ${time}`;
  }

  const day = date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return `${day} à ${time}`;
}

export function NextReminderCard({
  reminders,
  onSeeAll,
}: NextReminderCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.smallTitle}>Prochains rappels</Text>
          <Text style={styles.subtitle}>
            Tous tes rappels à venir.
          </Text>
        </View>

        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.link}>Voir tout</Text>
        </TouchableOpacity>
      </View>

      {reminders.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Rien de prévu</Text>

          <Text style={styles.emptyText}>
            Tu n’as aucun rappel à venir.
          </Text>
        </View>
      ) : (
        reminders.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.item,
              index === reminders.length - 1 && styles.lastItem,
            ]}
          >
            <View style={styles.dateBox}>
              <Text style={styles.dateText}>
                {formatReminderDate(item.reminderAtIso)}
              </Text>
            </View>

            <Text numberOfLines={1} style={styles.reminderTitle}>
              {item.title}
            </Text>

            <Text numberOfLines={2} style={styles.reminderText}>
              {item.text}
            </Text>

            {item.notifyAt && (
              <Text style={styles.info}>
                Notification vers {item.notifyAt}
              </Text>
            )}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7EDF5',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 3,
  },

  header: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  smallTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },

  subtitle: {
    marginTop: 3,
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },

  link: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '900',
  },

  emptyBox: {
    paddingVertical: 8,
  },

  emptyTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },

  emptyText: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },

  item: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },

  lastItem: {
    borderBottomWidth: 0,
  },

  dateBox: {
    alignSelf: 'flex-start',
    marginBottom: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },

  dateText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },

  reminderTitle: {
    color: '#0F172A',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },

  reminderText: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  info: {
    marginTop: 6,
    color: '#EA580C',
    fontSize: 11,
    fontWeight: '800',
  },
});