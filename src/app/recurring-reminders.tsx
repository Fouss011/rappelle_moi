import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../components/AppBackground';
import { useNotes } from '../context/NotesContext';

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(
    minute
  ).padStart(2, '0')}`;
}

export default function RecurringRemindersScreen() {
  const {
    recurringReminders,
    toggleRecurringReminder,
    removeRecurringReminder,
  } = useNotes();

  const [busyId, setBusyId] = useState<string | null>(null);

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

          <Text style={styles.title}>Rappels récurrents</Text>
          <Text style={styles.subtitle}>
            Les habitudes que tu as demandé à Daya de gérer automatiquement.
          </Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Comment ça marche ?</Text>
            <Text style={styles.infoText}>
              Daya peut proposer un rappel quotidien lorsqu’elle repère une vraie
              habitude. Rien n’est activé sans ton accord.
            </Text>
          </View>

          {recurringReminders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                Aucun rappel récurrent
              </Text>
              <Text style={styles.emptyText}>
                Quand Daya repérera une habitude, elle te proposera de
                l’automatiser.
              </Text>
            </View>
          ) : (
            recurringReminders.map((item) => {
              const busy = busyId === item.id;

              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.timePill}>
                      <Text style={styles.timeText}>
                        {formatTime(item.hour, item.minute)}
                      </Text>
                    </View>

                    <View style={styles.cardHeaderText}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.frequency}>Tous les jours</Text>
                    </View>

                    {busy ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Switch
                        value={item.enabled}
                        onValueChange={async (enabled) => {
                          setBusyId(item.id);
                          try {
                            await toggleRecurringReminder(
                              item.id,
                              enabled
                            );
                          } finally {
                            setBusyId(null);
                          }
                        }}
                      />
                    )}
                  </View>

                  <Text style={styles.cardText}>{item.text}</Text>

                  <View style={styles.statusRow}>
                    <Text
                      style={
                        item.enabled
                          ? styles.activeStatus
                          : styles.pausedStatus
                      }
                    >
                      {item.enabled ? 'Actif' : 'En pause'}
                    </Text>

                    <TouchableOpacity
                      disabled={busy}
                      onPress={() => {
                        Alert.alert(
                          'Supprimer ce rappel récurrent ?',
                          'Daya ne le programmera plus automatiquement.',
                          [
                            { text: 'Annuler', style: 'cancel' },
                            {
                              text: 'Supprimer',
                              style: 'destructive',
                              onPress: async () => {
                                setBusyId(item.id);
                                try {
                                  await removeRecurringReminder(item.id);
                                } finally {
                                  setBusyId(null);
                                }
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.deleteText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 80,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  backText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2563EB',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: '#64748B',
  },
  infoCard: {
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 22,
    padding: 17,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1D4ED8',
  },
  infoText: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#5F6F85',
  },
  emptyCard: {
    borderRadius: 24,
    padding: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    color: '#64748B',
  },
  card: {
    marginBottom: 12,
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timePill: {
    minWidth: 68,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2563EB',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    color: '#0F172A',
  },
  frequency: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  cardText: {
    marginTop: 13,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    color: '#5F6F85',
  },
  statusRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeStatus: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803D',
  },
  pausedStatus: {
    fontSize: 13,
    fontWeight: '900',
    color: '#92400E',
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#DC2626',
  },
});
