import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../components/AppBackground';
import { useAuth } from '../context/AuthContext';
import {
    getConfirmedMemoryConnections,
    type ConfirmedMemoryConnection,
} from '../services/relatedNotesService';

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function MemoryConnectionsScreen() {
  const { user, session, loading: authLoading } = useAuth();
  const [connections, setConnections] = useState<ConfirmedMemoryConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadConnections = useCallback(async () => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const result = await getConfirmedMemoryConnections(accessToken);

    if (!result.success) {
      setErrorMessage(result.error || 'Impossible de charger les connexions.');
      setConnections([]);
    } else {
      setConnections(result.connections);
    }

    setLoading(false);
  }, [session?.access_token]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    void loadConnections();
  }, [authLoading, loadConnections, user]);

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>

            <View style={styles.headingBlock}>
              <Text style={styles.eyebrow}>MÉMOIRE VIVANTE</Text>
              <Text style={styles.title}>Connexions</Text>
              <Text style={styles.subtitle}>
                Les fils que tu as confirmés avec Daya.
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator />
              <Text style={styles.stateText}>Daya rassemble tes fils de réflexion…</Text>
            </View>
          ) : null}

          {!loading && errorMessage ? (
            <View style={styles.stateCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => void loadConnections()}>
                <Text style={styles.retryText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!loading && !errorMessage && connections.length === 0 ? (
            <View style={styles.stateCard}>
              <Text style={styles.emptyTitle}>Aucune connexion confirmée</Text>
              <Text style={styles.stateText}>
                Quand Daya te proposera un lien et que tu répondras « Oui, c’est la suite », il apparaîtra ici.
              </Text>
            </View>
          ) : null}

          <View style={styles.list}>
            {connections.map((connection) => (
              <TouchableOpacity
                key={connection.id}
                style={styles.connectionCard}
                activeOpacity={0.8}
                onPress={() => {
                  router.push({
                    pathname: '/memory-topic',
                    params: {
                      source: 'connection',
                      title: connection.title,
                      description: connection.preview,
                      noteIds: connection.noteIds.join(','),
                    },
                  } as never);
                }}
              >
                <View style={styles.connectionMeta}>
                  <View style={styles.countPill}>
                    <Text style={styles.countText}>
                      {connection.noteCount} {connection.noteCount > 1 ? 'traces' : 'trace'}
                    </Text>
                  </View>

                  {connection.lastActivityAt ? (
                    <Text style={styles.dateText}>
                      {formatDate(connection.lastActivityAt)}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.connectionTitle} numberOfLines={2}>
                  {connection.title}
                </Text>

                {connection.preview ? (
                  <Text style={styles.preview} numberOfLines={2}>
                    {connection.preview}
                  </Text>
                ) : null}

                <View style={styles.openRow}>
                  <Text style={styles.openText}>Voir la chronologie</Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    width: '100%',
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 130,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 14,
  },
  backText: {
    marginTop: -2,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '700',
    color: '#0F172A',
  },
  headingBlock: { flex: 1 },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 0.9,
    fontWeight: '900',
    color: '#8B5CF6',
  },
  title: {
    marginTop: 3,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: '#64748B',
  },
  list: { gap: 16 },
  connectionCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  connectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
  },
  countText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#5B5BD6',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8190A6',
  },
  connectionTitle: {
    marginTop: 12,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  preview: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: '#5F6F85',
  },
  openRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  openText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563EB',
  },
  chevron: {
    fontSize: 24,
    lineHeight: 24,
    color: '#94A3B8',
  },
  stateCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stateText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: '#B91C1C',
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#2563EB',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
