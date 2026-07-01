import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '../context/AuthContext';
import { NotesProvider } from '../context/NotesContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <NotesProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </NotesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}