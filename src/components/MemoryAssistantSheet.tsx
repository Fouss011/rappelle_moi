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
  const { profile, user } = useAuth();

const firstName =
  profile?.first_name ||
  user?.email?.split('@')[0] ||
  'toi';

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
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/summary/ask-memory`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: cleanQuestion,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content:
              "Je n'ai pas réussi à interroger ta mémoire.",
          },
        ]);

        return;
      }

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            data.answer || 'Aucune réponse trouvée.',
        },
      ]);
    } catch (error) {
      console.error(
        "Erreur pendant l'interrogation de la mémoire :",
        error
      );

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
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Mémoire de {firstName}</Text>

            <Text style={styles.subtitle}>
              Retrouve une idée, un rappel ou un souvenir enregistré.
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
          style={[
            styles.messagesBox,
            messages.length === 0
              ? styles.messagesBoxEmpty
              : styles.messagesBoxFilled,
          ]}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 &&
              styles.emptyMessagesContent,
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
            <Text style={styles.emptyText}>
              Tes réponses apparaîtront ici.
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
            style={styles.input}
            placeholder="Pose ta question..."
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
              styles.askButton,
              (!question.trim() || loading) &&
                styles.askButtonDisabled,
            ]}
            onPress={() => void askMemory()}
            disabled={!question.trim() || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.loadingButtonContent}>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text style={styles.askButtonText}>
                  Recherche...
                </Text>
              </View>
            ) : (
              <Text style={styles.askButtonText}>
                Envoyer
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
    marginBottom: 12,
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

  messagesBox: {
    flexGrow: 0,
    flexShrink: 1,
    backgroundColor: '#F8FBFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },

  messagesBoxEmpty: {
    height: 58,
  },

  messagesBoxFilled: {
    minHeight: 90,
    maxHeight: 260,
  },

  messagesContent: {
    padding: 12,
  },

  emptyMessagesContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  messageBubble: {
    maxWidth: '90%',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 17,
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

  composer: {
    paddingTop: 12,
  },

  input: {
    height: 52,
    maxHeight: 86,
    backgroundColor: '#F8FBFF',
    borderRadius: 17,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 20,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#DCE5F1',
    fontWeight: '700',
  },

  askButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  askButtonDisabled: {
    opacity: 0.48,
  },

  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  askButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  emptyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
});