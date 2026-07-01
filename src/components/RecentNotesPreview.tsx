import { StyleSheet, Text, View } from 'react-native';

type Note = {
  id: string;
  text: string;
  createdAt: string;
  type: 'note' | 'reminder';
  reminderAt?: string;
  isDone: boolean;
};

type RecentNotesPreviewProps = {
  notes: Note[];
};

export function RecentNotesPreview({ notes }: RecentNotesPreviewProps) {
  const recentNotes = notes.slice(0, 5);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
Dernières captures
</Text>

      {recentNotes.length === 0 ? (
        <Text style={styles.emptyText}>Aucune note en attente pour l’instant.</Text>
      ) : (
        recentNotes.map((item) => (
          <View key={item.id} style={styles.item}>
            <Text style={styles.time}>{item.createdAt}</Text>

            <View style={styles.content}>
              <Text numberOfLines={1} style={styles.text}>
                {item.text}
              </Text>

              {item.type === 'reminder' && (
                <Text style={styles.reminder}>Rappel à {item.reminderAt}</Text>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },

  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
  },

  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },

  time: {
    width: 54,
    fontSize: 13,
    fontWeight: '900',
    color: '#64748B',
  },

  content: {
    flex: 1,
  },

  text: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },

  reminder: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
});