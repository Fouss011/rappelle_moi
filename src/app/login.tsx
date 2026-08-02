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

import { AppBackground } from '../components/AppBackground';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const {
    signIn,
    signUp,
    resetPassword,
    loading,
  } = useAuth();

  const [mode, setMode] =
    useState<'login' | 'signup'>('login');

  const [firstName, setFirstName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const submit = async () => {
    const cleanFirstName = firstName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      Alert.alert(
        'Champs manquants',
        'Email et mot de passe sont obligatoires.'
      );

      return;
    }

    if (
      mode === 'signup' &&
      !cleanFirstName
    ) {
      Alert.alert(
        'Prénom manquant',
        'Entre ton prénom.'
      );

      return;
    }

    if (password.length < 8) {
      Alert.alert(
        'Mot de passe trop court',
        'Utilise au moins 8 caractères.'
      );

      return;
    }

    if (mode === 'login') {
      const error = await signIn(
        cleanEmail,
        password
      );

      if (error) {
        Alert.alert(
          'Erreur de connexion',
          error
        );

        return;
      }

      router.replace('/');
      return;
    }

    const result = await signUp(
      cleanFirstName,
      cleanEmail,
      password
    );

    if (result.error) {
      Alert.alert(
        'Erreur de création',
        result.error
      );

      return;
    }

    if (result.requiresEmailConfirmation) {
      Alert.alert(
        'Vérifie ton email',
        "Ton compte a été créé. Ouvre l'email envoyé par Daya pour confirmer ton adresse, puis connecte-toi."
      );

      setMode('login');
      setPassword('');

      return;
    }

    router.replace('/');
  };

 const handleForgotPassword = async () => {
  const cleanEmail =
    email.trim().toLowerCase();

  if (!cleanEmail) {
    Alert.alert(
      'Email nécessaire',
      'Entre ton adresse email avant de continuer.'
    );

    return;
  }

  const error =
    await resetPassword(cleanEmail);

  if (error) {
    Alert.alert(
      'Erreur',
      error
    );

    return;
  }

  Alert.alert(
    'Email envoyé',
    'Consulte ta boîte email et ouvre le lien pour choisir un nouveau mot de passe.'
  );
};

  const switchMode = () => {
    if (loading) {
      return;
    }

    setMode((currentMode) =>
      currentMode === 'login'
        ? 'signup'
        : 'login'
    );

    setPassword('');
  };

  return (
    <AppBackground>
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>
          Daya
        </Text>

        <Text style={styles.subtitle}>
          Ton assistant personnel pour retenir,
          retrouver et organiser ce qui compte.
        </Text>

        {mode === 'signup' && (
          <TextInput
            style={styles.input}
            placeholder="Prénom"
            placeholderTextColor="#94A3B8"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
            returnKeyType="next"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#94A3B8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          editable={!loading}
          returnKeyType="next"
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#94A3B8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType={
            mode === 'signup'
              ? 'newPassword'
              : 'password'
          }
          autoComplete={
            mode === 'signup'
              ? 'new-password'
              : 'password'
          }
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={() => {
            void submit();
          }}
        />

        {mode === 'signup' && (
          <Text style={styles.passwordHint}>
            Utilise au moins 8 caractères.
          </Text>
        )}

        {mode === 'login' && (
  <TouchableOpacity
    style={styles.forgotButton}
    onPress={() => {
      void handleForgotPassword();
    }}
    disabled={loading}
  >
    <Text style={styles.forgotText}>
      Mot de passe oublié ?
    </Text>
  </TouchableOpacity>
)}

        <TouchableOpacity
          style={[
            styles.button,
            loading &&
              styles.buttonDisabled,
          ]}
          onPress={() => {
            void submit();
          }}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.buttonText}>
              {mode === 'login'
                ? 'Se connecter'
                : 'Créer mon compte'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={switchMode}
          disabled={loading}
        >
          <Text style={styles.switchText}>
            {mode === 'login'
              ? 'Créer un compte'
              : 'J’ai déjà un compte'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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

  passwordHint: {
    marginTop: -3,
    marginBottom: 12,
    paddingHorizontal: 4,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  button: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  switchButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 4,
  },

  switchText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '900',
  },

  forgotButton: {
  alignSelf: 'flex-end',
  marginTop: -2,
  marginBottom: 14,
  paddingVertical: 4,
},

forgotText: {
  fontSize: 13,
  fontWeight: '800',
  color: '#2563EB',
},
});