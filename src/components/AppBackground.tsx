import { Image, StyleSheet, View } from 'react-native';

type AppBackgroundProps = {
  children: React.ReactNode;
};

export function AppBackground({
  children,
}: AppBackgroundProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <View
        pointerEvents="none"
        style={styles.overlay}
      />

      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F6F8FC',
  },

  backgroundImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },

  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(246, 248, 252, 0.68)',
  },

  content: {
    flex: 1,
    width: '100%',
  },
});