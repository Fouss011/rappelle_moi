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

import { useNotes } from '../context/NotesContext';

export default function NotesScreen() {
  const { notes, deleteNote, toggleDone, toggleImportant } = useNotes();
  const [search, setSearch] = useState('');

  const filteredNotes = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return notes
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

        <Text style={styles.title}>Mes notes</Text>
        <Text style={styles.subtitle}>
          Toutes tes captures, idées et pensées sauvegardées.
        </Text>

        <TextInput
          style={styles.search}
          placeholder="Rechercher dans mes notes..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />

        <Text style={styles.count}>{filteredNotes.length} note(s)</Text>

        {filteredNotes.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Aucune note trouvée</Text>
            <Text style={styles.emptyText}>
              Essaie un autre mot ou ajoute une nouvelle capture.
            </Text>
          </View>
        ) : (
          filteredNotes.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.type}>
                  {item.type === 'reminder' ? 'Rappel' : 'Note'}
                </Text>
                <Text style={styles.time}>{item.createdAt}</Text>
              </View>

              <Text style={[styles.noteText, item.isDone && styles.doneText]}>
                {item.text}
              </Text>

              {item.reminderAt && (
                <Text style={styles.reminder}>Rappel prévu à {item.reminderAt}</Text>
              )}

              <View style={styles.actions}>
                <TouchableOpacity onPress={() => toggleImportant(item.id)}>
                  <Text style={styles.important}>
                    {item.isImportant ? '★ Important' : '☆ Important'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => toggleDone(item.id)}>
                  <Text style={styles.done}>
                    {item.isDone ? 'Réouvrir' : 'Terminer'}
                  </Text>
                </TouchableOpacity>

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
  container: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  content: {
    padding: 22,
    paddingBottom: 40,
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
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  time: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8',
  },
  noteText: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '800',
    color: '#0F172A',
  },
  doneText: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
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
  important: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F59E0B',
  },
  done: {
    fontSize: 12,
    fontWeight: '900',
    color: '#16A34A',
  },
  delete: {
    fontSize: 12,
    fontWeight: '900',
    color: '#EF4444',
  },
});