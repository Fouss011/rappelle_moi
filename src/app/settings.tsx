import { router } from 'expo-router';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { useAuth } from '../context/AuthContext';

export default function SettingsScreen() {
  const { signOut, profile, user } = useAuth();

  const handleLogout = async () => {
  await signOut();
  router.replace('/login' as any);
};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Paramètres</Text>
        <Text style={styles.subtitle}>
          Compte connecté : {profile?.first_name || user?.email}
        </Text>

        <TouchableOpacity
  style={styles.logoutButton}
  onPress={handleLogout}
>
  <Text style={styles.logoutText}>Se déconnecter</Text>
</TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FC' },
  content: { padding: 22 },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    marginBottom: 18,
  },
  backText: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  title: { fontSize: 34, fontWeight: '900', color: '#0F172A' },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#64748B',
  },
  logoutButton: {
    marginTop: 26,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '900' },
});