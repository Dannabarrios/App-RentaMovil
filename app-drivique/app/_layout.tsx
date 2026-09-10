import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import * as WebBrowser from "expo-web-browser";
import { I18nextProvider } from "react-i18next";
import i18n from "@/modules/i18n";
import { useIdioma } from "@/modules/i18n/hooks/useLanguage";
import { FloatingSupportChat } from "@/components/ui/FloatingSupportChat";

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const { temaActual } = useIdioma();

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider value={temaActual === "oscuro" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="vehicle/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="payment-response" options={{ headerShown: false }} />
          <Stack.Screen name="contract-view" options={{ headerShown: false }} />
        </Stack>

        <StatusBar style={temaActual === "oscuro" ? "light" : "dark"} /> 
        <FloatingSupportChat />
      </ThemeProvider>
    </I18nextProvider>
  );
}
