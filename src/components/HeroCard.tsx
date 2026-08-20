import { Pressable, StyleSheet, Text, View } from 'react-native';

type HeroCardProps = {
  userName?: string;
  onPress?: () => void;
};

export function HeroCard({
  userName = 'Utilisateur',
  onPress,
}: HeroCardProps) {
  const today = new Date();

  const dateLabel = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && onPress ? styles.containerPressed : null,
      ]}
    >
      <View style={styles.textBlock}>
        <Text style={styles.greeting}>
          Bonjour, {userName}
        </Text>

        <Text style={styles.intro}>
          Je suis Daya.
        </Text>

        <Text style={styles.date}>
          {dateLabel}
        </Text>
      </View>

      <View style={styles.rightBlock}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            Aujourd’hui
          </Text>
        </View>

        {onPress ? (
          <Text style={styles.chevron}>›</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  containerPressed: {
    opacity: 0.82,
  },

  textBlock: {
    flex: 1,
    paddingRight: 12,
  },

  greeting: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },

  intro: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },

  date: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },

  rightBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  badge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2563EB',
  },

  chevron: {
    marginTop: 6,
    marginRight: 4,
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '700',
    color: '#94A3B8',
  },
});