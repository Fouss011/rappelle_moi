import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { signIn, signUp, loading } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Champs manquants', 'Email et mot de passe sont obligatoires.');
      return;
    }

    if (mode === 'signup' && !firstName.trim()) {
      Alert.alert('Prénom manquant', 'Entre ton prénom.');
      return;
    }

    const error =
      mode === 'login'
        ? await signIn(email.trim(), password)
        : await signUp(firstName.trim(), email.trim(), password);

    if (error) {
      Alert.alert('Erreur', error);
      return;
    }

    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>RappelleMoi</Text>
        <Text style={styles.subtitle}>
          Connecte-toi pour retrouver ta mémoire personnelle.
        </Text>

        {mode === 'signup' && (
          <TextInput
            style={styles.input}
            placeholder="Prénom"
            placeholderTextColor="#94A3B8"
            value={firstName}
            onChangeText={setFirstName}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#94A3B8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#94A3B8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={submit}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          <Text style={styles.switchText}>
            {mode === 'login'
              ? 'Créer un compte'
              : 'J’ai déjà un compte'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FC',
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: '#64748B',
  },
  input: {
    backgroundColor: '#F8FBFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E6ECF5',
    marginBottom: 12,
  },
  button: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '900',
  },
});