import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { supabase } from '../services/supabase';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [saving, setSaving] = useState(false);
  const [checkingSession, setCheckingSession] =
    useState(true);

  const [sessionAvailable, setSessionAvailable] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkRecoverySession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error(
            'Erreur de vérification de la session :',
            error.message
          );

          setSessionAvailable(false);
          return;
        }

        setSessionAvailable(Boolean(session));
      } catch (error) {
        console.error(
          'Erreur inattendue pendant la vérification de la session :',
          error
        );

        if (mounted) {
          setSessionAvailable(false);
        }
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    void checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) {
          return;
        }

        if (
          event === 'PASSWORD_RECOVERY' ||
          Boolean(session)
        ) {
          setSessionAvailable(true);
          setCheckingSession(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const submitNewPassword = async () => {
    if (saving) {
      return;
    }

    if (!password || !confirmPassword) {
      Alert.alert(
        'Champs manquants',
        'Entre et confirme ton nouveau mot de passe.'
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

    if (password !== confirmPassword) {
      Alert.alert(
        'Mots de passe différents',
        'Les deux mots de passe doivent être identiques.'
      );

      return;
    }

    setSaving(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        Alert.alert(
          'Impossible de modifier le mot de passe',
          error.message
        );

        return;
      }

      Alert.alert(
        'Mot de passe modifié',
        'Ton nouveau mot de passe a bien été enregistré.',
        [
          {
            text: 'Continuer',
            onPress: () => {
              router.replace('/');
            },
          },
        ]
      );
    } catch (error) {
      console.error(
        'Erreur inattendue pendant la modification du mot de passe :',
        error
      );

      Alert.alert(
        'Erreur',
        'Impossible de modifier ton mot de passe pour le moment.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (checkingSession) {
  return (
    <AppBackground>
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingTitle}>
          Vérification du lien…
        </Text>

        <Text style={styles.loadingText}>
          Daya prépare la modification de ton mot de passe.
        </Text>
      </SafeAreaView>
    </AppBackground>
  );
}

  if (!sessionAvailable) {
  return (
    <AppBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.icon}>🔐</Text>

          <Text style={styles.title}>
            Lien invalide ou expiré
          </Text>

          <Text style={styles.subtitle}>
            Demande un nouveau lien depuis la page de
            connexion.
          </Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.secondaryButtonText}>
              Revenir à la connexion
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </AppBackground>
  );
}

  return (
  <AppBackground>
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>🔐</Text>

        <Text style={styles.title}>
          Nouveau mot de passe
        </Text>

        <Text style={styles.subtitle}>
          Choisis un nouveau mot de passe sécurisé pour
          ton compte Daya.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Nouveau mot de passe"
          placeholderTextColor="#94A3B8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!saving}
          autoComplete="new-password"
          textContentType="newPassword"
        />

        <TextInput
          style={styles.input}
          placeholder="Confirmer le mot de passe"
          placeholderTextColor="#94A3B8"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!saving}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={() => {
            void submitNewPassword();
          }}
        />

        <Text style={styles.passwordHint}>
          Utilise au moins 8 caractères.
        </Text>

        <TouchableOpacity
          style={[
            styles.button,
            saving && styles.buttonDisabled,
          ]}
          onPress={() => {
            void submitNewPassword();
          }}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              Enregistrer le mot de passe
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.replace('/login')}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>
            Annuler
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
  justifyContent: 'center',
  padding: 22,
  backgroundColor: 'transparent',
},

loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 24,
  backgroundColor: 'transparent',
},

  loadingTitle: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },

  loadingText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: '#64748B',
  },

  card: {
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    backgroundColor: 'transparent',
  },

  icon: {
    fontSize: 38,
    marginBottom: 14,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 22,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: '#64748B',
  },

  input: {
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    backgroundColor: 'transparent',
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },

  passwordHint: {
    marginTop: -2,
    marginBottom: 16,
    paddingHorizontal: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  button: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'transparent',
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  cancelButton: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 8,
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },

  secondaryButton: {
    height: 52,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'transparent',
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563EB',
  },
});