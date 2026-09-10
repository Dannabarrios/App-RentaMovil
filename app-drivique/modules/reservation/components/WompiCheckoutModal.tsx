// modules/reservation/components/WompiCheckoutModal.tsx
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { COLOR_MARCA } from "@/modules/catalog/constants/catalog.constants";

interface WompiCheckoutModalProps {
  visible: boolean;
  checkoutUrl: string | null;
  referencia: string;
  onComplete: (data: { transactionId?: string | null; reference: string }) => void;
  onClose: () => void;
}

export function WompiCheckoutModal({
  visible,
  checkoutUrl,
  referencia,
  onComplete,
  onClose,
}: WompiCheckoutModalProps) {
  const c = useTemaColores();
  const { t } = useTranslation();
  const [cargando, setCargando] = useState(true);
  const procesadoRef = useRef(false);

  // Reiniciar estado cuando se abre el modal y timer de seguridad para quitar overlay
  React.useEffect(() => {
    if (visible) {
      procesadoRef.current = false;
      setCargando(true);

      // Si estamos en Web, redirigir directamente para evitar bloqueo de iframes (X-Frame-Options de Wompi)
      if (Platform.OS === "web" && typeof window !== "undefined" && checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      const timer = setTimeout(() => {
        setCargando(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [visible, checkoutUrl]);

  const extraerTransactionId = (url: string): string | null => {
    try {
      const parsed = Linking.parse(url);
      if (parsed.queryParams?.id && typeof parsed.queryParams.id === "string") {
        return parsed.queryParams.id;
      }
      const match = url.match(/[?&]id=([^&#]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch (e) {
      console.warn("[WompiCheckoutModal] Error parseando ID de transaccion:", e);
    }
    return null;
  };

  const handleAbrirEnNavegador = async () => {
    if (!checkoutUrl) return;
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.open(checkoutUrl, "_blank");
      } else {
        await Linking.openURL(checkoutUrl);
      }
    } catch (e) {
      console.warn("[WompiCheckoutModal] Error abriendo URL externa:", e);
    }
  };

  const handleInterceptUrl = (url: string): boolean => {
    if (!url) return true;

    // Interceptar cuando la navegación sale de Wompi hacia la URL de retorno (localtest.me, respuesta, etc.)
    const esRetornoComercio =
      url.includes("localtest.me") ||
      url.includes("/respuesta") ||
      url.includes("app-drivique://");

    if (esRetornoComercio && !procesadoRef.current) {
      procesadoRef.current = true;
      const txId = extraerTransactionId(url);
      onComplete({
        transactionId: txId,
        reference: referencia,
      });
      return false; // Detener carga en WebView para evitar error de conexión
    }

    return true;
  };

  if (!visible || !checkoutUrl) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
        <StatusBar barStyle={c.oscuro ? "light-content" : "dark-content"} />

        {/* Cabecera Segura */}
        <View style={[styles.header, { borderBottomColor: c.border, backgroundColor: c.bgCard }]}>
          <TouchableOpacity
            style={[styles.btnCerrar, { backgroundColor: c.oscuro ? "rgba(255,255,255,0.08)" : "#f1f5f9" }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color={c.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.seguridadBadge}>
              <Ionicons name="lock-closed" size={13} color="#16a34a" />
              <Text style={styles.seguridadTexto}>
                {t("reserva.pago.pagoSeguro", { defaultValue: "Pago Seguro 256-bit" })}
              </Text>
            </View>
            <Text style={[styles.titulo, { color: c.textPrimary }]} numberOfLines={1}>
              Wompi • Pasarela Digital
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.btnCerrar, { backgroundColor: c.oscuro ? "rgba(255,255,255,0.08)" : "#f1f5f9" }]}
            onPress={handleAbrirEnNavegador}
            activeOpacity={0.7}
          >
            <Ionicons name="open-outline" size={18} color={c.primary} />
          </TouchableOpacity>
        </View>

        {/* Contenido WebView */}
        <View style={styles.webviewContainer}>
          {cargando && (
            <View style={[styles.loadingOverlay, { backgroundColor: c.bg }]}>
              <ActivityIndicator size="large" color={COLOR_MARCA} />
              <Text style={[styles.loadingTexto, { color: c.textSecondary }]}>
                {t("reserva.pago.conectandoWompi", { defaultValue: "Conectando con la pasarela de pago..." })}
              </Text>
            </View>
          )}

          <WebView
            source={{ uri: checkoutUrl }}
            style={{ flex: 1, backgroundColor: c.bg }}
            onLoadStart={() => {}}
            onLoadProgress={({ nativeEvent }) => {
              if (nativeEvent.progress > 0.5) {
                setCargando(false);
              }
            }}
            onLoadEnd={() => setCargando(false)}
            onError={() => setCargando(false)}
            onHttpError={() => setCargando(false)}
            onShouldStartLoadWithRequest={(request) => {
              return handleInterceptUrl(request.url);
            }}
            onNavigationStateChange={(navState) => {
              handleInterceptUrl(navState.url);
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            setSupportMultipleWindows={false}
            javaScriptCanOpenWindowsAutomatically={true}
            startInLoadingState={false}
            originWhitelist={["*"]}
            userAgent="Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  btnCerrar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    alignItems: "center",
    justifyContent: "center",
  },
  seguridadBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  seguridadTexto: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16a34a",
  },
  titulo: {
    fontSize: 14,
    fontWeight: "700",
  },
  webviewContainer: {
    flex: 1,
    position: "relative",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    gap: 12,
  },
  loadingTexto: {
    fontSize: 13,
    fontWeight: "500",
  },
});
