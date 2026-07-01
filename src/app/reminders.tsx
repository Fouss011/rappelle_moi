import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Note, useNotes } from '../context/NotesContext';

function isSameDay(dateA: Date, dateB: Date) {
  return dateA.toDateString() === dateB.toDateString();
}

function Section({
  title,
  notes,
  onDone,
}: {
  title: string;
  notes: Note[];
  onDone: (id: string) => void;
}) {
  if (notes.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {notes.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.time}>{item.reminderAt}</Text>
          <Text style={styles.text}>{item.text}</Text>

          <TouchableOpacity style={styles.doneButton} onPress={() => onDone(item.id)}>
            <Text style={styles.doneText}>Terminer</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

export default function RemindersScreen() {
  const { notes, toggleDone } = useNotes();

  const groups = useMemo(() => {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    const reminders = notes
      .filter((item) => item.type === 'reminder' && item.reminderAtIso)
      .sort(
        (a, b) =>
          new Date(a.reminderAtIso || '').getTime() -
          new Date(b.reminderAtIso || '').getTime()
      );

    return {
      overdue: reminders.filter(
        (item) =>
          !item.isDone &&
          new Date(item.reminderAtIso || '').getTime() < now.getTime()
      ),
      today: reminders.filter(
        (item) =>
          !item.isDone && isSameDay(new Date(item.reminderAtIso || ''), now)
      ),
      tomorrow: reminders.filter(
        (item) =>
          !item.isDone &&
          isSameDay(new Date(item.reminderAtIso || ''), tomorrow)
      ),
      later: reminders.filter((item) => {
        const date = new Date(item.reminderAtIso || '');
        return !item.isDone && date > tomorrow && !isSameDay(date, tomorrow);
      }),
      done: reminders.filter((item) => item.isDone),
    };
  }, [notes]);

  const total =
    groups.overdue.length +
    groups.today.length +
    groups.tomorrow.length +
    groups.later.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Mes rappels</Text>
        <Text style={styles.subtitle}>
          Tes rappels actifs, en retard et terminés.
        </Text>

        <View style={styles.summary}>
          <Text style={styles.summaryValue}>{total}</Text>
          <Text style={styles.summaryText}>rappel(s) à suivre</Text>
        </View>

        {total === 0 && groups.done.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Aucun rappel</Text>
            <Text style={styles.emptyText}>
              Ajoute une phrase avec une heure, par exemple : “Appeler Rachel à 18h”.
            </Text>
          </View>
        ) : (
          <>
            <Section title="En retard" notes={groups.overdue} onDone={toggleDone} />
            <Section title="Aujourd’hui" notes={groups.today} onDone={toggleDone} />
            <Section title="Demain" notes={groups.tomorrow} onDone={toggleDone} />
            <Section title="Plus tard" notes={groups.later} onDone={toggleDone} />
            <Section title="Terminés" notes={groups.done} onDone={toggleDone} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FC' },
  content: { padding: 22, paddingBottom: 40 },
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
  backText: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  title: { fontSize: 34, fontWeight: '900', color: '#0F172A' },
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
  summaryValue: { fontSize: 36, fontWeight: '900', color: '#2563EB' },
  summaryText: { fontSize: 14, fontWeight: '800', color: '#64748B' },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#64748B',
  },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },
  time: { fontSize: 24, fontWeight: '900', color: '#2563EB' },
  text: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '800',
    color: '#0F172A',
  },
  doneButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  doneText: { fontSize: 13, fontWeight: '900', color: '#16A34A' },
});