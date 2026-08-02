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

import { AppBackground } from '../components/AppBackground';
import { Note, useNotes } from '../context/NotesContext';

type ArchiveGroup = {
  key: string;
  title: string;
  date: Date;
  items: Note[];
};

const INITIAL_ARCHIVE_DAYS = 30;

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

function getArchiveDate(item: Note) {
  if (item.type === 'reminder' && item.reminderAtIso) {
    const reminderDate = new Date(item.reminderAtIso);

    if (!Number.isNaN(reminderDate.getTime())) {
      return reminderDate;
    }
  }

  return new Date(item.createdAtIso);
}

function getDayLabel(date: Date) {
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const target = startOfDay(date);

  if (target.getTime() === today.getTime()) {
    return "Aujourd'hui";
  }

  if (target.getTime() === yesterday.getTime()) {
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

function groupArchives(items: Note[]): ArchiveGroup[] {
  const groups = new Map<string, ArchiveGroup>();

  items.forEach((item) => {
    const date = getArchiveDate(item);

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
          getArchiveDate(b).getTime() -
          getArchiveDate(a).getTime()
      ),
    }));
}

function formatArchiveTime(item: Note) {
  const date = getArchiveDate(item);

  if (Number.isNaN(date.getTime())) {
    return item.createdAt;
  }

  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ArchivesScreen() {
  const { notes, toggleDone, deleteNote } = useNotes();

  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const archiveResult = useMemo(() => {
    const now = Date.now();

    const threshold = new Date();
    threshold.setDate(
      threshold.getDate() - INITIAL_ARCHIVE_DAYS
    );
    threshold.setHours(0, 0, 0, 0);

    const cleanSearch = search.trim().toLowerCase();

    const allArchivedItems = notes
      .filter((item) => {
        const reminderIsPast =
          item.type === 'reminder' &&
          item.reminderAtIso &&
          new Date(item.reminderAtIso).getTime() < now;

        return item.isDone || reminderIsPast;
      })
      .filter((item) => {
        if (!cleanSearch) {
          return true;
        }

        return item.text.toLowerCase().includes(cleanSearch);
      });

    const visibleItems = showAll
      ? allArchivedItems
      : allArchivedItems.filter(
          (item) =>
            getArchiveDate(item).getTime() >=
            threshold.getTime()
        );

    const olderCount = allArchivedItems.filter(
      (item) =>
        getArchiveDate(item).getTime() <
        threshold.getTime()
    ).length;

    return {
      groups: groupArchives(visibleItems),
      totalVisible: visibleItems.length,
      totalAll: allArchivedItems.length,
      olderCount,
    };
  }, [notes, search, showAll]);

  return (
  <AppBackground>
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

        <Text style={styles.title}>Archives</Text>

        <Text style={styles.subtitle}>
          Les éléments terminés et les rappels dépassés.
        </Text>

        <TextInput
          style={styles.search}
          placeholder="Rechercher dans les archives..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.archiveInfo}>
          <Text style={styles.count}>
            {archiveResult.totalVisible} archive
            {archiveResult.totalVisible > 1 ? 's' : ''}
          </Text>

          {!showAll && (
            <Text style={styles.periodText}>
              30 derniers jours
            </Text>
          )}
        </View>

        {archiveResult.totalVisible === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>
              Aucune archive
            </Text>

            <Text style={styles.emptyText}>
              Les notes terminées et les rappels dépassés apparaîtront ici.
            </Text>
          </View>
        ) : (
          archiveResult.groups.map((group) => (
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
                    <Text style={styles.type}>
                      {item.type === 'reminder'
                        ? 'Rappel'
                        : 'Note'}
                    </Text>

                    <Text style={styles.time}>
                      {formatArchiveTime(item)}
                    </Text>
                  </View>
                  
                  <Text style={styles.noteTitle}>
                    {item.title}
                  </Text>

                  <Text style={styles.noteText}>
                    {item.text}
                  </Text>

                  {item.type === 'reminder' &&
                    item.reminderAtIso && (
                      <Text style={styles.reminder}>
                        Prévu le{' '}
                        {new Date(
                          item.reminderAtIso
                        ).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}{' '}
                        à {formatArchiveTime(item)}
                      </Text>
                    )}

                  <View style={styles.actions}>
                    {item.isDone && (
                      <TouchableOpacity
                        onPress={() =>
                          void toggleDone(item.id)
                        }
                      >
                        <Text style={styles.restore}>
                          Réouvrir
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() =>
                        void deleteNote(item.id)
                      }
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

        {archiveResult.olderCount > 0 && (
          <TouchableOpacity
            style={styles.showMoreButton}
            onPress={() => setShowAll((current) => !current)}
          >
            <Text style={styles.showMoreText}>
              {showAll
                ? 'Afficher seulement les 30 derniers jours'
                : `Afficher ${archiveResult.olderCount} ancienne(s) archive(s)`}
            </Text>
          </TouchableOpacity>
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

  archiveInfo: {
    marginTop: 14,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  count: {
    fontSize: 13,
    fontWeight: '900',
    color: '#64748B',
  },

  periodText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2563EB',
  },

  section: {
    marginBottom: 18,
  },

  sectionHeader: {
    marginTop: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  dayTitle: {
    flex: 1,
    paddingRight: 12,
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
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  time: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8',
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

  reminder: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
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

  restore: {
    fontSize: 12,
    fontWeight: '900',
    color: '#16A34A',
  },

  delete: {
    fontSize: 12,
    fontWeight: '900',
    color: '#EF4444',
  },

  showMoreButton: {
    marginTop: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },

  showMoreText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2563EB',
    textAlign: 'center',
  },

});