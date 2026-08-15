import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  onPress: () => void;
};

export function FloatingMemoryButton({ onPress }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          bottom: insets.bottom + 22,
        },
      ]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Text style={styles.icon}>🧠</Text>

      <Text style={styles.text}>
        Ma mémoire
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',

    right: 22,

    backgroundColor: '#2563EB',

    borderRadius: 28,

    height: 58,

    paddingHorizontal: 18,

    flexDirection: 'row',

    alignItems: 'center',

    shadowColor: '#2563EB',

    shadowOpacity: 0.35,

    shadowRadius: 20,

    shadowOffset: {
      width: 0,
      height: 12,
    },

    elevation: 12,

    zIndex: 999,
  },

  icon: {
    fontSize: 21,
    marginRight: 8,
  },

  text: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});