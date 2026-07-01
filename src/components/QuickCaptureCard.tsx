import Voice from '@react-native-voice/voice';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type QuickCaptureCardProps = {
  note: string;
  setNote: (text: string) => void;
  onAddNote: () => void;
};

export function QuickCaptureCard({
  note,
  setNote,
  onAddNote,
}: QuickCaptureCardProps) {
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
  if (Platform.OS === 'web' || !Voice) {
    return;
  }

  Voice.onSpeechStart = () => {
    setIsListening(true);
  };

  Voice.onSpeechEnd = () => {
    setIsListening(false);
  };

  Voice.onSpeechError = () => {
    setIsListening(false);
    Alert.alert(
      'Erreur micro',
      'Impossible de récupérer la voix. Vérifie que le micro est autorisé.'
    );
  };

  Voice.onSpeechResults = (event) => {
    const transcript = event.value?.[0];

    if (transcript) {
      setNote(note ? `${note} ${transcript}` : transcript);
    }
  };

  return () => {
    Voice.destroy().then(Voice.removeAllListeners);
  };
}, [note, setNote]);

  const startListening = async () => {
    try {
      await Voice.start('fr-FR');
    } catch (error) {
      setIsListening(false);
      Alert.alert(
        'Micro indisponible',
        'Impossible de démarrer la reconnaissance vocale.'
      );
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (error) {
      setIsListening(false);
    }
  };

  const handleVoicePress = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Micro mobile',
        'Le micro natif fonctionne sur Android/iOS. Sur web, on gardera une solution différente.'
      );
      return;
    }

    if (isListening) {
      await stopListening();
      return;
    }

    await startListening();
  };

  return (
    <View style={styles.card}>
      <Text style={styles.question}>Qu’aimerais-tu retenir ?</Text>

      <TextInput
        style={styles.input}
        placeholder="Écris une idée, une tâche ou un rappel..."
        placeholderTextColor="#94A3B8"
        value={note}
        onChangeText={setNote}
        multiline
      />

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
          onPress={handleVoicePress}
        >
          <Text style={[styles.voiceText, isListening && styles.voiceTextActive]}>
            {isListening ? '🎙️ J’écoute...' : '🎤 Parler'}
          </Text>
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
    borderRadius: 34,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },

  question: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
    letterSpacing: -0.4,
  },

  input: {
    minHeight: 118,
    backgroundColor: '#F8FBFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    lineHeight: 23,
    color: '#0F172A',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E6ECF5',
    fontWeight: '700',
  },

  actions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 12,
  },

  voiceButton: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  voiceButtonActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },

  voiceText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#EA580C',
  },

  voiceTextActive: {
    color: '#DC2626',
  },

  saveButton: {
    flex: 1.35,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.25,
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