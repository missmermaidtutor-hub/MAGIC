/**
 * Native font loader — uses expo-font / expo-google-fonts.
 * On web, useAppFonts.web.js is used instead (CSS-based, always ready).
 */
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_400Regular_Italic, Montserrat_700Bold_Italic } from '@expo-google-fonts/montserrat';

export default function useAppFonts() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_400Regular_Italic,
    Montserrat_700Bold_Italic,
  });
  return fontsLoaded;
}
