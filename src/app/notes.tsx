import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Note, useNotes } from '../context/NotesContext';

type NoteGroup = {
  key: string;
  title: string;
  date: Date;
  items: Note[];
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

function getDayLabel(date: Date) {
  const today = startOfDay(new Date());
  const target = startOfDay(date);

  const differenceInDays = Math.round(
    (today.getTime() - target.getTime()) /
      (24 * 60 * 60 * 1000)
  );

  if (differenceInDays === 0) {
    return "Aujourd'hui";
  }

  if (differenceInDays === 1) {
    return 'Hier';
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

function groupNotesByCreationDate(items: Note[]): NoteGroup[] {
  const groups = new Map<string, NoteGroup>();

  items.forEach((item) => {
    const date = new Date(item.createdAtIso);

    if (Number.isNaN(date.getTime())) {
      return;
    }

    const key = getDateKey(date);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: getDayLabel(date),
        date: startOfDay(date),
        items: [],
      });
    }

    groups.get(key)?.items.push(item);
  });

  return Array.from(groups.values())
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((group) => ({
      ...group,
      items: group.items.sort(
        (a, b) =>
          new Date(b.createdAtIso).getTime() -
          new Date(a.createdAtIso).getTime()
      ),
    }));
}

export default function NotesScreen() {
  const {
    notes,
    deleteNote,
    toggleDone,
    toggleImportant,
  } = useNotes();

  const [search, setSearch] = useState('');

  const noteGroups = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    const filteredNotes = notes.filter((item) => {
      if (item.type !== 'note' || item.isDone) {
        return false;
      }

      if (!cleanSearch) {
        return true;
      }

      return item.text.toLowerCase().includes(cleanSearch);
    });

    return groupNotesByCreationDate(filteredNotes);
  }, [notes, search]);

  const total = noteGroups.reduce(
    (sum, group) => sum + group.items.length,
    0
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Mes notes</Text>

        <Text style={styles.subtitle}>
          Tes idées et pensées sans heure de rappel.
        </Text>

        <TextInput
          style={styles.search}
          placeholder="Rechercher dans mes notes..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />

        <Text style={styles.count}>
          {total} note{total > 1 ? 's' : ''}
        </Text>

        {total === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>
              Aucune note trouvée
            </Text>

            <Text style={styles.emptyText}>
              Les idées et captures sans rappel apparaîtront ici.
            </Text>
          </View>
        ) : (
          noteGroups.map((group) => (
            <View key={group.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.dayTitle}>
                  {group.title}
                </Text>

                <Text style={styles.sectionCount}>
                  {group.items.length}
                </Text>
              </View>

              {group.items.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.type}>Note</Text>

                    <Text style={styles.time}>
                      {item.createdAt}
                    </Text>
                  </View>
                  
                  <Text style={styles.noteTitle}>
                    {item.title}
                  </Text>

                  <Text style={styles.noteText}>
                    {item.text}
                  </Text>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() =>
                        void toggleImportant(item.id)
                      }
                    >
                      <Text style={styles.important}>
                        {item.isImportant
                          ? '★ Important'
                          : '☆ Important'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => void toggleDone(item.id)}
                    >
                      <Text style={styles.done}>
                        Archiver
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => void deleteNote(item.id)}
                    >
                      <Text style={styles.delete}>
                        Supprimer
                      </Text>
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
  container: {
    flex: 1,
    backgroundColor: '#F6F8FC',
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

  section: {
    marginBottom: 18,
  },

  sectionHeader: {
    marginTop: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dayTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2563EB',
    textTransform: 'capitalize',
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

  noteTitle: {
  fontSize: 17,
  lineHeight: 23,
  fontWeight: '900',
  color: '#0F172A',
  marginBottom: 5,
},

noteText: {
  fontSize: 14,
  lineHeight: 21,
  fontWeight: '700',
  color: '#64748B',
},
});