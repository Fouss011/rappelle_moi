import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type AddNoteFormProps = {
  note: string;
  setNote: (text: string) => void;
  onAddNote: () => void;
};

export function AddNoteForm({ note, setNote, onAddNote }: AddNoteFormProps) {
  const handleVoicePress = () => {
    Alert.alert(
      'Micro bientôt disponible',
      'On va brancher la dictée vocale à l’étape suivante.'
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconBubble}>
          <Text style={styles.iconText}>💡</Text>
        </View>

        <View style={styles.titleBox}>
          <Text style={styles.title}>Tu as une idée ?</Text>
          <Text style={styles.subtitle}>Parle ou écris, je la garde pour toi.</Text>
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Écris ton idée, ta note ou ton rappel..."
        placeholderTextColor="#94A3B8"
        value={note}
        onChangeText={setNote}
        multiline
      />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.voiceButton} onPress={handleVoicePress}>
          <Text style={styles.voiceIcon}>🎤</Text>
          <Text style={styles.voiceText}>Parler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, !note.trim() && styles.saveButtonDisabled]}
          onPress={onAddNote}
          activeOpacity={0.85}
        >
          <Text style={styles.saveText}>Sauvegarder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  iconText: {
    fontSize: 25,
  },

  titleBox: {
    flex: 1,
  },

  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#64748B',
  },

  input: {
    minHeight: 110,
    backgroundColor: '#F8FBFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 22,
    color: '#0F172A',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E6ECF5',
    fontWeight: '600',
  },

  actions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 12,
  },

  voiceButton: {
    flex: 0.9,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  voiceIcon: {
    fontSize: 18,
    marginRight: 7,
  },

  voiceText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#EA580C',
  },

  saveButton: {
    flex: 1.2,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },

  saveButtonDisabled: {
    opacity: 0.45,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});