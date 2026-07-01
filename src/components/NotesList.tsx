import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

function NoteCard({
  item,
  editingNoteId,
  editingText,
  setEditingText,
  saveEditedNote,
  cancelEditingNote,
  toggleImportant,
  startEditingNote,
  deleteNote,
  toggleDone,
}: any) {
  const isEditing = editingNoteId === item.id;

  return (
    <View style={[styles.noteCard, item.isDone && styles.noteCardDone]}>
      <View style={styles.noteTopRow}>
        <View style={styles.timePill}>
          <Text style={styles.timeText}>{item.createdAt}</Text>
        </View>

        <TouchableOpacity onPress={() => toggleDone(item.id)} style={styles.donePill}>
          <Text style={styles.doneText}>{item.isDone ? '☑ Fait' : '☐ À faire'}</Text>
        </TouchableOpacity>
      </View>

      {isEditing ? (
        <View>
          <TextInput
            style={styles.editInput}
            value={editingText}
            onChangeText={setEditingText}
            multiline
          />

          <View style={styles.editActions}>
            <TouchableOpacity style={styles.saveEditButton} onPress={saveEditedNote}>
              <Text style={styles.saveEditText}>Enregistrer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelEditButton} onPress={cancelEditingNote}>
              <Text style={styles.cancelEditText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={[styles.noteText, item.isDone && styles.noteTextDone]}>
          {item.text}
        </Text>
      )}

      <View style={styles.metaRow}>
        <Text style={styles.categoryText}>📂 {item.category}</Text>

        {item.type === 'reminder' && (
          <Text style={styles.reminderText}>🔔 {item.reminderAt}</Text>
        )}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={() => toggleImportant(item.id)}>
          <Text style={styles.importantText}>
            {item.isImportant ? '⭐ Important' : '☆ Important'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => startEditingNote(item)}>
          <Text style={styles.editText}>Modifier</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => deleteNote(item.id)}>
          <Text style={styles.deleteText}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SimpleNoteCard({ item }: any) {
  return (
    <View style={styles.simpleCard}>
      <View style={styles.noteTopRow}>
        <View style={styles.timePill}>
          <Text style={styles.timeText}>{item.createdAt}</Text>
        </View>
      </View>

      <Text style={styles.noteText}>{item.text}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.categoryText}>📂 {item.category}</Text>

        {item.type === 'reminder' && (
          <Text style={styles.reminderText}>🔔 {item.reminderAt}</Text>
        )}
      </View>
    </View>
  );
}

export function NotesList({
  todayNotes,
  yesterdayNotes,
  olderNotes,
  editingNoteId,
  editingText,
  setEditingText,
  saveEditedNote,
  cancelEditingNote,
  toggleImportant,
  startEditingNote,
  deleteNote,
  toggleDone,
}: any) {
  return (
    <FlatList
      data={todayNotes}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🧠</Text>
          <Text style={styles.emptyTitle}>Aucune idée aujourd’hui</Text>
          <Text style={styles.emptyText}>
            Écris une première pensée ou utilise le micro quand il sera branché.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <NoteCard
          item={item}
          editingNoteId={editingNoteId}
          editingText={editingText}
          setEditingText={setEditingText}
          saveEditedNote={saveEditedNote}
          cancelEditingNote={cancelEditingNote}
          toggleImportant={toggleImportant}
          startEditingNote={startEditingNote}
          deleteNote={deleteNote}
          toggleDone={toggleDone}
        />
      )}
      ListFooterComponent={
        <>
          {yesterdayNotes.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Hier</Text>
              <Text style={styles.sectionSubtitle}>
                {yesterdayNotes.length} élément(s) sauvegardé(s)
              </Text>

              {yesterdayNotes.map((item: any) => (
                <SimpleNoteCard key={item.id} item={item} />
              ))}
            </View>
          )}

          {olderNotes.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Anciennes notes</Text>
              <Text style={styles.sectionSubtitle}>
                {olderNotes.length} élément(s) retrouvé(s)
              </Text>

              {olderNotes.map((item: any) => (
                <SimpleNoteCard key={item.id} item={item} />
              ))}
            </View>
          )}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6ECF5',
    marginBottom: 16,
  },

  emptyIcon: {
    fontSize: 34,
    marginBottom: 10,
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
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },

  noteCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 26,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  noteCardDone: {
    opacity: 0.7,
  },

  simpleCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },

  noteTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  timePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  timeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '900',
  },

  donePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  doneText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '900',
  },

  noteText: {
    fontSize: 16,
    color: '#0F172A',
    lineHeight: 23,
    fontWeight: '700',
  },

  noteTextDone: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },

  editInput: {
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#DCE6F3',
    borderRadius: 18,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    minHeight: 78,
    textAlignVertical: 'top',
    fontWeight: '600',
  },

  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },

  saveEditButton: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },

  cancelEditButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },

  saveEditText: {
    color: '#16A34A',
    fontWeight: '900',
    fontSize: 13,
  },

  cancelEditText: {
    color: '#64748B',
    fontWeight: '900',
    fontSize: 13,
  },

  metaRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  categoryText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '900',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  reminderText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '900',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  actionsRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  importantText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '900',
  },

  editText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
  },

  deleteText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
  },

  historySection: {
    marginTop: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 3,
  },

  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 12,
  },
});