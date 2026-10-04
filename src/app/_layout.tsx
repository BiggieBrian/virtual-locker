import { Stack } from 'expo-router';
import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  useFonts,
} from '@expo-google-fonts/fredoka';
import { colors, fonts } from '../theme';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });
  if (!loaded && !error) return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.backdrop },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.bold },
        contentStyle: { backgroundColor: colors.backdrop },
      }}
    />
  );
}
