import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  const scrollViewRef = useRef<ScrollView | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      Keyboard.dismiss();
      return;
    }

    /**
     * Petit délai pour laisser la fenêtre s'afficher avant
     * d'interagir avec le champ.
     */
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    /**
     * Dès qu'un nouveau message apparaît,
     * la conversation descend automatiquement.
     */
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [messages, loading, visible]);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const askMemory = async () => {
    const cleanQuestion = question.trim();

    if (!cleanQuestion || loading) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        role: 'user',
        content: cleanQuestion,
      },
    ]);

    setQuestion('');
    Keyboard.dismiss();

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/summary/ask-memory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: cleanQuestion,
        }),
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
      console.error("Erreur pendant l'interrogation de la mémoire :", error);

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            "Impossible de contacter le serveur. Vérifie que le backend est disponible.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      hardwareAccelerated
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Mémoire</Text>

              <Text style={styles.subtitle}>
                Pose une question à tes captures.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesBox}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }}
          >
            {messages.length === 0 ? (
              <Text style={styles.emptyText}>
                Pose une question à ta mémoire.
              </Text>
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

          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Pose une question à ta mémoire..."
              placeholderTextColor="#94A3B8"
              value={question}
              onChangeText={setQuestion}
              multiline
              numberOfLines={2}
              maxLength={500}
              editable={!loading}
              textAlignVertical="top"
              returnKeyType="default"
              blurOnSubmit={false}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 200);
              }}
            />

            <TouchableOpacity
              style={[
                styles.askButton,
                (!question.trim() || loading) && styles.askButtonDisabled,
              ]}
              onPress={() => {
                void askMemory();
              }}
              disabled={!question.trim() || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.askButtonText}>Envoyer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.32)',
},

  sheet: {
    width: '100%',
    maxHeight: '88%',
    minHeight: 430,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    overflow: 'hidden',
  },

  handle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
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
    marginTop: -2,
    fontSize: 27,
    fontWeight: '900',
    color: '#0F172A',
  },

  messagesBox: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 150,
    maxHeight: 300,
    backgroundColor: '#F8FBFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },

  messagesContent: {
    flexGrow: 1,
    padding: 14,
  },

  messageBubble: {
    maxWidth: '90%',
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 18,
    marginBottom: 12,
  },

  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 6,
  },

  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2F7',
    borderBottomLeftRadius: 6,
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

  composer: {
    paddingTop: 14,
  },

  input: {
  minHeight: 54,
  maxHeight: 100,
  backgroundColor: '#F8FBFF',
  borderRadius: 18,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 15,
  lineHeight: 21,
  color: '#0F172A',
  borderWidth: 1,
  borderColor: '#DCE5F1',
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