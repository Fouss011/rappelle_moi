import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { RecurringReminderSuggestion } from '../services/recurringReminderService';

type Props = {
  suggestion: RecurringReminderSuggestion;
  onConfirm: () => Promise<boolean>;
  onDismiss: () => void;
  loading?: boolean;
};

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(
    minute
  ).padStart(2, '0')}`;
}

export function RecurringReminderSuggestionCard({
  suggestion,
  onConfirm,
  onDismiss,
  loading = false,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>↻</Text>
        </View>

        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>HABITUDE REPÉRÉE</Text>
          <Text style={styles.title}>
            Tu répètes souvent ce rappel
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={onDismiss}
          disabled={loading}
        >
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.body}>
        Tu as demandé ce rappel {suggestion.occurrenceCount} fois autour de{' '}
        {formatTime(suggestion.hour, suggestion.minute)}. Veux-tu que Daya le
        programme automatiquement chaque jour ?
      </Text>

      <View style={styles.subjectBox}>
        <Text style={styles.subjectTitle} numberOfLines={1}>
          {suggestion.title}
        </Text>
        <Text style={styles.subjectText} numberOfLines={2}>
          {suggestion.text}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.confirmButton, loading && styles.disabled]}
          onPress={() => void onConfirm()}
          disabled={loading}
        >
          <Text style={styles.confirmText}>
            {loading ? 'Activation…' : 'Oui, tous les jours'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.laterButton}
          onPress={onDismiss}
          disabled={loading}
        >
          <Text style={styles.laterText}>Pas maintenant</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 28,
    padding: 20,
    backgroundColor: '#FFF8EE',
    borderWidth: 1,
    borderColor: '#F7DEC0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0DC',
  },
  icon: {
    fontSize: 22,
    fontWeight: '900',
    color: '#EA580C',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.7,
    fontWeight: '900',
    color: '#EA580C',
  },
  title: {
    marginTop: 2,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  closeText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#64748B',
  },
  body: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    color: '#5F6F85',
  },
  subjectBox: {
    marginTop: 14,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  subjectTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  subjectText: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#64748B',
  },
  actions: {
    marginTop: 16,
    gap: 9,
  },
  confirmButton: {
    minHeight: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  laterButton: {
    minHeight: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  laterText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#64748B',
  },
  disabled: {
    opacity: 0.65,
  },
});
