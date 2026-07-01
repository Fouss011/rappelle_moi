import { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { API_URL } from '../config/api';

export function HabitsInsightCard() {
  const [patterns, setPatterns] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPatterns = async () => {
    if (loading) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/summary/patterns`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setPatterns("Impossible d'analyser tes habitudes pour l’instant.");
        return;
      }

      setPatterns(data.patterns || 'Aucune habitude détectée pour le moment.');
    } catch (error) {
      setPatterns('Serveur inaccessible. Vérifie que le backend est lancé.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Habitudes</Text>
      <Text style={styles.subtitle}>
        Repère les sujets et comportements qui reviennent souvent.
      </Text>

      {patterns ? (
        <Text style={styles.result}>{patterns}</Text>
      ) : (
        <Text style={styles.empty}>L’analyse apparaîtra ici.</Text>
      )}

      <TouchableOpacity style={styles.button} onPress={loadPatterns}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Analyser mes habitudes</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E6ECF5',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#64748B',
  },
  result: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
    color: '#0F172A',
  },
  empty: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  button: {
    marginTop: 14,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});