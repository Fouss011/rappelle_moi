import { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type HomeMenuProps = {
  onOpenNotes: () => void;
  onOpenReminders: () => void;
  onOpenArchives: () => void;
  onOpenSettings: () => void;
};

export function HomeMenu({
  onOpenNotes,
  onOpenReminders,
  onOpenArchives,
  onOpenSettings,
}: HomeMenuProps) {
  const [open, setOpen] = useState(false);

  const handlePress = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <>
      <View style={styles.buttonLayer}>
        <TouchableOpacity
          style={styles.burgerButton}
          onPress={() => setOpen(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.burgerIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {open && (
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />

          <View style={styles.drawer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setOpen(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} onPress={() => handlePress(onOpenNotes)}>
              <Text style={styles.itemText}>Mes notes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} onPress={() => handlePress(onOpenReminders)}>
              <Text style={styles.itemText}>Mes rappels</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} onPress={() => handlePress(onOpenArchives)}>
              <Text style={styles.itemText}>Archives</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.item, styles.lastItem]}
              onPress={() => handlePress(onOpenSettings)}
            >
              <Text style={styles.itemText}>Paramètres</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  buttonLayer: {
    position: 'absolute',
    top: 18,
    left: 22,
    zIndex: 900,
  },

  burgerButton: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6ECF5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  burgerIcon: {
    fontSize: 25,
    fontWeight: '900',
    color: '#0F172A',
  },

  overlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 999,
},

backdrop: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.08)',
},

  drawer: {
    position: 'absolute',
    top: 18,
    left: 22,
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E6ECF5',
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },

  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: '#F8FBFF',
  },

  closeText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },

  item: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },

  lastItem: {
    borderBottomWidth: 0,
  },

  itemText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
});