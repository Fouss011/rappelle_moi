import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../context/AuthContext';
import { NotesProvider } from '../context/NotesContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <NotesProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </NotesProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}