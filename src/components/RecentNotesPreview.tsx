import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Note = {
  id: string;
  title: string;
  text: string;
  createdAt: string;
};

type RecentNotesPreviewProps = {
  notes: Note[];
  onSeeAll: () => void;
};

export function RecentNotesPreview({
  notes,
  onSeeAll,
}: RecentNotesPreviewProps) {
  const recentNotes = notes.slice(0, 3);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dernières notes</Text>
          <Text style={styles.subtitle}>
            Tes 3 captures les plus récentes.
          </Text>
        </View>

        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.link}>Voir tout</Text>
        </TouchableOpacity>
      </View>

      {recentNotes.length === 0 ? (
        <Text style={styles.emptyText}>
          Aucune note simple pour l’instant.
        </Text>
      ) : (
        recentNotes.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.item,
              index === recentNotes.length - 1 && styles.lastItem,
            ]}
          >
            <Text style={styles.time}>{item.createdAt}</Text>

            <View style={styles.content}>
              <Text numberOfLines={1} style={styles.noteTitle}>
                {item.title}
              </Text>

              <Text numberOfLines={2} style={styles.noteText}>
                {item.text}
              </Text>
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
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },

  header: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#94A3B8',
  },

  link: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563EB',
  },

  emptyText: {
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },

  lastItem: {
    borderBottomWidth: 0,
  },

  time: {
    width: 112,
    minWidth: 112,
    paddingTop: 2,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '900',
    color: '#8190A6',
  },

  content: {
    flex: 1,
    marginLeft: 12,
  },

  noteTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    color: '#0F172A',
  },

  noteText: {
    marginTop: 3,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#5F6F85',
  },
});