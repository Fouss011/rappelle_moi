import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

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

  const { session } = useAuth();

  const scrollViewRef = useRef<ScrollView | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      Keyboard.dismiss();
      return;
    }

    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({
        animated: false,
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible || messages.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [messages, visible]);

  if (!visible) {
    return null;
  }

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const addAssistantMessage = (content: string) => {
    setMessages((current) => [
      ...current,
      {
        role: 'assistant',
        content,
      },
    ]);
  };

  const askMemory = async () => {
    const cleanQuestion = question.trim();

    if (!cleanQuestion || loading) {
      return;
    }

    const accessToken = session?.access_token;

    if (!accessToken) {
      addAssistantMessage(
        'Ta session a expiré. Reconnecte-toi pour interroger ta mémoire.'
      );
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
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/summary/ask-memory`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            question: cleanQuestion,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        addAssistantMessage(
          'Ta session a expiré. Ferme ta session puis reconnecte-toi.'
        );
        return;
      }

      if (!response.ok || !data.success) {
        addAssistantMessage(
          data.error ||
            "Je n'ai pas réussi à interroger ta mémoire."
        );
        return;
      }

      addAssistantMessage(
        data.answer || 'Aucune réponse trouvée.'
      );
    } catch (error) {
      console.error(
        "Erreur pendant l'interrogation de la mémoire :",
        error
      );

      addAssistantMessage(
        "Impossible de contacter Daya. Vérifie que le backend est disponible."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <Pressable
        style={styles.backdrop}
        onPress={handleClose}
      />

      <View
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(
              insets.bottom + 8,
              18
            ),
          },
        ]}
      >
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>
              Ma mémoire
            </Text>

            <Text style={styles.subtitle}>
              Retrouve ce que tu as confié à Daya.
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
          style={styles.conversation}
          contentContainerStyle={[
            styles.conversationContent,
            messages.length === 0 &&
              styles.conversationEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              scrollViewRef.current?.scrollToEnd({
                animated: true,
              });
            }
          }}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>
                🧠
              </Text>

              <Text style={styles.emptyTitle}>
                Demande quelque chose à ta mémoire
              </Text>

              <Text style={styles.emptySubtitle}>
                Une idée, un rappel, un projet ou un souvenir.
              </Text>
            </View>
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
            <View
              style={[
                styles.messageBubble,
                styles.assistantBubble,
                styles.loadingBubble,
              ]}
            >
              <ActivityIndicator
                size="small"
                color="#64748B"
              />

              <Text style={styles.loadingText}>
                Daya cherche dans ta mémoire...
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder={
              messages.length === 0
                ? 'Demande à ta mémoire...'
                : 'Demande autre chose...'
            }
            placeholderTextColor="#94A3B8"
            value={question}
            onChangeText={setQuestion}
            multiline
            scrollEnabled
            maxLength={500}
            editable={!loading}
            textAlignVertical="center"
            blurOnSubmit={false}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!question.trim() || loading) &&
                styles.sendButtonDisabled,
            ]}
            onPress={() => {
              void askMemory();
            }}
            disabled={!question.trim() || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Text style={styles.sendIcon}>
                ➤
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 9999,
    elevation: 9999,
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
    maxHeight: '86%',
    minHeight: '58%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },

  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
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
    fontSize: 25,
    fontWeight: '900',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: '#64748B',
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeText: {
    marginTop: -2,
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },

  conversation: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 220,
    maxHeight: 390,
  },

  conversationContent: {
    paddingVertical: 6,
    paddingHorizontal: 2,
  },

  conversationEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 34,
  },

  emptyIcon: {
    fontSize: 30,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },

  emptySubtitle: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
  },

  messageBubble: {
    maxWidth: '88%',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
    marginBottom: 10,
  },

  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 5,
  },

  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2F7',
    borderBottomLeftRadius: 5,
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

  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingTop: 12,
  },

  input: {
    flex: 1,
    minHeight: 54,
    maxHeight: 100,
    backgroundColor: '#F8FBFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    lineHeight: 20,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#DCE5F1',
    fontWeight: '700',
  },

  sendButton: {
    width: 54,
    height: 54,
    borderRadius: 19,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendButtonDisabled: {
    opacity: 0.4,
  },

  sendIcon: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    marginLeft: 2,
  },
});