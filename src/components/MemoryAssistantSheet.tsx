import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_URL } from '../config/api';

type MemoryAssistantSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export function MemoryAssistantSheet({
  visible,
  onClose,
}: MemoryAssistantSheetProps) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  const askMemory = async () => {
    const cleanQuestion = question.trim();

    if (!cleanQuestion || loading) return;

    setMessages((current) => [
      ...current,
      {
        role: 'user',
        content: cleanQuestion,
      },
    ]);

    setQuestion('');

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/summary/ask-memory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: cleanQuestion }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: "Je n'ai pas réussi à interroger ta mémoire.",
          },
        ]);
        return;
      }

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: data.answer || 'Aucune réponse trouvée.',
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            "Impossible de contacter le serveur. Vérifie que le backend est lancé.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheet}
      >
        <View style={styles.handle} />

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Mémoire</Text>
            <Text style={styles.subtitle}>Pose une question à tes captures.</Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.messagesBox}>
          {messages.length === 0 ? (
            <Text style={styles.emptyText}>Pose une question à ta mémoire.</Text>
          ) : (
            messages.map((message, index) => (
              <View
                key={`${message.role}-${index}`}
                style={[
                  styles.messageBubble,
                  message.role === 'user'
                    ? styles.userBubble
                    : styles.assistantBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.role === 'user'
                      ? styles.userText
                      : styles.assistantText,
                  ]}
                >
                  {message.content}
                </Text>
              </View>
            ))
          )}

          {loading && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <Text style={styles.assistantText}>Mémoire réfléchit...</Text>
            </View>
          )}
        </ScrollView>

        <TextInput
          style={styles.input}
          placeholder="Ex : Quelles notes parlent de SNPT ?"
          placeholderTextColor="#94A3B8"
          value={question}
          onChangeText={setQuestion}
          multiline
        />

        <TouchableOpacity
          style={[
            styles.askButton,
            (!question.trim() || loading) && styles.askButtonDisabled,
          ]}
          onPress={askMemory}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.askButtonText}>Envoyer</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1200,
  },

  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
  },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '82%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },

  handle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 18,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },

  messagesBox: {
    backgroundColor: '#F8FBFF',
    borderRadius: 22,
    padding: 14,
    maxHeight: 260,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    marginBottom: 14,
  },

  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '90%',
    marginBottom: 12,
  },

  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563EB',
  },

  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
  },

  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },

  userText: {
    color: '#FFFFFF',
  },

  assistantText: {
    color: '#0F172A',
  },

  input: {
    minHeight: 76,
    backgroundColor: '#F8FBFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    lineHeight: 22,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E6ECF5',
    textAlignVertical: 'top',
    fontWeight: '700',
  },

  askButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  askButtonDisabled: {
    opacity: 0.45,
  },

  askButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
});