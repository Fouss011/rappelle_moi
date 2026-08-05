import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../components/AppBackground';
import { Note, useNotes } from '../context/NotesContext';

type ReminderGroup = {
  key: string;
  title: string;
  date: Date;
  items: Note[];
  isOverdue: boolean;
};

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function getReminderDayLabel(date: Date) {
  const today = startOfDay(new Date());

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const target = startOfDay(date);

  if (target.getTime() === today.getTime()) {
    return `Aujourd'hui — ${date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    })}`;
  }

  if (target.getTime() === tomorrow.getTime()) {
    return `Demain — ${date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    })}`;
  }

  if (target.getTime() === yesterday.getTime()) {
    return `Hier — ${date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    })}`;
  }

  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year:
      date.getFullYear() !== today.getFullYear()
        ? 'numeric'
        : undefined,
  });
}

function formatReminderTime(dateIso: string) {
  const date = new Date(dateIso);

  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupReminders(items: Note[]): ReminderGroup[] {
  const now = new Date();
  const groups = new Map<string, ReminderGroup>();

  items.forEach((item) => {
    if (!item.reminderAtIso) {
      return;
    }

    const reminderDate = new Date(item.reminderAtIso);

    if (Number.isNaN(reminderDate.getTime())) {
      return;
    }

    const key = getDateKey(reminderDate);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: getReminderDayLabel(reminderDate),
        date: startOfDay(reminderDate),
        items: [],
        isOverdue:
          reminderDate.getTime() < now.getTime(),
      });
    }

    const group = groups.get(key);

    if (group) {
      group.items.push(item);

      if (reminderDate.getTime() < now.getTime()) {
        group.isOverdue = true;
      }
    }
  });

  return Array.from(groups.values())
    .sort((a, b) => {
      /**
       * Les journées contenant des rappels futurs
       * passent avant les journées entièrement dépassées.
       */
      if (a.isOverdue !== b.isOverdue) {
        return a.isOverdue ? 1 : -1;
      }

      /**
       * Rappels à venir :
       * la date la plus proche en premier.
       */
      if (!a.isOverdue && !b.isOverdue) {
        return a.date.getTime() - b.date.getTime();
      }

      /**
       * Rappels dépassés :
       * le plus récent en premier.
       */
      return b.date.getTime() - a.date.getTime();
    })
    .map((group) => ({
      ...group,

      items: [...group.items].sort((a, b) => {
        const dateA = new Date(
          a.reminderAtIso ?? ''
        ).getTime();

        const dateB = new Date(
          b.reminderAtIso ?? ''
        ).getTime();

        if (group.isOverdue) {
          return dateB - dateA;
        }

        return dateA - dateB;
      }),
    }));
}

export default function RemindersScreen() {
  const { notes, toggleDone } = useNotes();

  const reminderGroups = useMemo(() => {
    const activeReminders = notes.filter(
      (item) =>
        item.type === 'reminder' &&
        !item.isDone &&
        Boolean(item.reminderAtIso)
    );

    return groupReminders(activeReminders);
  }, [notes]);

  const total = reminderGroups.reduce(
    (sum, group) => sum + group.items.length,
    0
  );

  return (
    <AppBackground>
     <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Mes rappels</Text>

        <Text style={styles.subtitle}>
          Tes rappels sont classés selon leur date prévue.
        </Text>

        <View style={styles.summary}>
          <Text style={styles.summaryValue}>{total}</Text>

          <Text style={styles.summaryText}>
            rappel{total > 1 ? 's' : ''} à suivre
          </Text>
        </View>

        {total === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>
              Aucun rappel actif
            </Text>

            <Text style={styles.emptyText}>
              Exemple : « Appeler Rachel demain à 18 h ».
            </Text>
          </View>
        ) : (
          reminderGroups.map((group) => (
            <View key={group.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    group.isOverdue &&
                      styles.overdueSectionTitle,
                  ]}
                >
                  {group.title}
                </Text>

                <Text style={styles.sectionCount}>
                  {group.items.length}
                </Text>
              </View>

              {group.items.map((item) => {
                const isOverdue =
                  item.reminderAtIso &&
                  new Date(item.reminderAtIso).getTime() <
                    Date.now();

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.card,
                      isOverdue && styles.overdueCard,
                    ]}
                  >
                    <View style={styles.reminderHeader}>
                      <Text
                        style={[
                          styles.time,
                          isOverdue && styles.overdueTime,
                        ]}
                      >
                        {formatReminderTime(
                          item.reminderAtIso ?? ''
                        )}
                      </Text>

                      {isOverdue && (
                        <Text style={styles.overdueBadge}>
                          En retard
                        </Text>
                      )}
                    </View>
                    
                    <Text style={styles.reminderTitle}>
                      {item.title}
                    </Text>

                    <Text style={styles.text}>
                      {item.text}
                    </Text>

                    <TouchableOpacity
                      style={styles.doneButton}
                      onPress={() =>
                        void toggleDone(item.id)
                      }
                    >
                      <Text style={styles.doneText}>
                        Terminer
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: 'transparent',
},

  content: {
    padding: 22,
    paddingBottom: 50,
  },

  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    marginBottom: 18,
  },

  backText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },

  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#64748B',
  },

  summary: {
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },

  summaryValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#2563EB',
  },

  summaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },

  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#64748B',
  },

  section: {
    marginBottom: 20,
  },

  sectionHeader: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    flex: 1,
    paddingRight: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#2563EB',
    textTransform: 'capitalize',
  },

  overdueSectionTitle: {
    color: '#DC2626',
  },

  sectionCount: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 12,
    fontWeight: '900',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },

  overdueCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF8F8',
  },

  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  time: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2563EB',
  },

  overdueTime: {
    color: '#DC2626',
  },

  overdueBadge: {
    fontSize: 11,
    fontWeight: '900',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  reminderTitle: {
  marginTop: 10,
  fontSize: 17,
  lineHeight: 23,
  fontWeight: '900',
  color: '#0F172A',
},

  text: {
  marginTop: 5,
  fontSize: 14,
  lineHeight: 21,
  fontWeight: '700',
  color: '#64748B',
},

  doneButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  doneText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#16A34A',
  },
});