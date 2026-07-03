import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNotes } from '../context/NotesContext';

function getDayLabel(dateIso: string) {
  const date = new Date(dateIso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Aujourd'hui";
  if (sameDay(date, yesterday)) return 'Hier';

  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function NotesScreen() {
  const { notes, deleteNote, toggleDone, toggleImportant } = useNotes();
  const [search, setSearch] = useState('');

  const groupedNotes = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    const filtered = notes
      .filter((item) => !cleanSearch || item.text.toLowerCase().includes(cleanSearch))
      .sort((a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime());

    return filtered.reduce((groups: Record<string, typeof filtered>, item) => {
      const label = getDayLabel(item.createdAtIso);
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
      return groups;
    }, {});
  }, [notes, search]);

  const total = Object.values(groupedNotes).reduce((sum, items) => sum + items.length, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Mes notes</Text>
        <Text style={styles.subtitle}>Toutes tes captures, idées et pensées sauvegardées.</Text>

        <TextInput
          style={styles.search}
          placeholder="Rechercher dans mes notes..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />

        <Text style={styles.count}>{total} note(s)</Text>

        {total === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Aucune note trouvée</Text>
            <Text style={styles.emptyText}>Essaie un autre mot ou ajoute une nouvelle capture.</Text>
          </View>
        ) : (
          Object.entries(groupedNotes).map(([day, items]) => (
            <View key={day}>
              <Text style={styles.dayTitle}>{day}</Text>

              {items.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.type}>{item.type === 'reminder' ? 'Rappel' : 'Note'}</Text>
                    <Text style={styles.time}>{item.createdAt}</Text>
                  </View>

                  <Text style={[styles.noteText, item.isDone && styles.doneText]}>{item.text}</Text>

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
                      <Text style={styles.done}>{item.isDone ? 'Réouvrir' : 'Terminer'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => deleteNote(item.id)}>
                      <Text style={styles.delete}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
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
    alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1,
    borderColor: '#E6ECF5', marginBottom: 18,
  },
  backText: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  title: { fontSize: 34, fontWeight: '900', color: '#0F172A' },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 21, fontWeight: '700', color: '#64748B' },
  search: {
    marginTop: 20, backgroundColor: '#FFFFFF', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    fontWeight: '700', color: '#0F172A', borderWidth: 1, borderColor: '#E6ECF5',
  },
  count: { marginTop: 14, marginBottom: 12, fontSize: 13, fontWeight: '900', color: '#64748B' },
  dayTitle: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '900',
    color: '#2563EB',
  },
  emptyBox: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 22, borderWidth: 1, borderColor: '#E6ECF5' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  emptyText: { marginTop: 6, fontSize: 14, lineHeight: 20, fontWeight: '700', color: '#64748B' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 26, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#E6ECF5',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  type: {
    fontSize: 12, fontWeight: '900', color: '#2563EB',
    backgroundColor: '#EFF6FF', paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 999,
  },
  time: { fontSize: 12, fontWeight: '900', color: '#94A3B8' },
  noteText: { fontSize: 16, lineHeight: 23, fontWeight: '800', color: '#0F172A' },
  doneText: { textDecorationLine: 'line-through', color: '#94A3B8' },
  reminder: { marginTop: 10, fontSize: 13, fontWeight: '900', color: '#EA580C' },
  actions: {
    marginTop: 14, paddingTop: 12, borderTopWidth: 1,
    borderTopColor: '#EEF2F7', flexDirection: 'row', justifyContent: 'space-between',
  },
  important: { fontSize: 12, fontWeight: '900', color: '#F59E0B' },
  done: { fontSize: 12, fontWeight: '900', color: '#16A34A' },
  delete: { fontSize: 12, fontWeight: '900', color: '#EF4444' },
});