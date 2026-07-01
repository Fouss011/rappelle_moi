import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Note, useNotes } from '../context/NotesContext';

export default function ArchivesScreen() {
  const { notes, toggleDone, deleteNote } = useNotes();
  const [search, setSearch] = useState('');

  const archivedNotes = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return notes
      .filter((item) => {
        const isPastReminder =
          item.reminderAtIso &&
          new Date(item.reminderAtIso).getTime() < Date.now();

        return item.isDone || isPastReminder;
      })
      .filter((item) => {
        if (!cleanSearch) return true;
        return item.text.toLowerCase().includes(cleanSearch);
      })
      .sort(
        (a, b) =>
          new Date(b.createdAtIso).getTime() -
          new Date(a.createdAtIso).getTime()
      );
  }, [notes, search]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Archives</Text>
        <Text style={styles.subtitle}>
          Retrouve les captures terminées, anciennes ou dépassées.
        </Text>

        <TextInput
          style={styles.search}
          placeholder="Rechercher dans les archives..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />

        <Text style={styles.count}>{archivedNotes.length} archive(s)</Text>

        {archivedNotes.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Aucune archive</Text>
            <Text style={styles.emptyText}>
              Les notes terminées ou les rappels dépassés apparaîtront ici.
            </Text>
          </View>
        ) : (
          archivedNotes.map((item: Note) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.type}>
                  {item.type === 'reminder' ? 'Rappel' : 'Note'}
                </Text>
                <Text style={styles.time}>{item.createdAt}</Text>
              </View>

              <Text style={styles.noteText}>{item.text}</Text>

              {item.reminderAt && (
                <Text style={styles.reminder}>Rappel prévu à {item.reminderAt}</Text>
              )}

              <View style={styles.actions}>
                {item.isDone && (
                  <TouchableOpacity onPress={() => toggleDone(item.id)}>
                    <Text style={styles.restore}>Réouvrir</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={() => deleteNote(item.id)}>
                  <Text style={styles.delete}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
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
  search: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },
  count: {
    marginTop: 14,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '900',
    color: '#64748B',
  },
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  type: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  time: { fontSize: 12, fontWeight: '900', color: '#94A3B8' },
  noteText: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '800',
    color: '#0F172A',
  },
  reminder: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '900',
    color: '#EA580C',
  },
  actions: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  restore: { fontSize: 12, fontWeight: '900', color: '#16A34A' },
  delete: { fontSize: 12, fontWeight: '900', color: '#EF4444' },
});