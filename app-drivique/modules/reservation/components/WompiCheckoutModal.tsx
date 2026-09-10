// modules/reservation/components/WompiCheckoutModal.tsx
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

  // Reiniciar estado cuando se abre el modal
  React.useEffect(() => {
    if (visible) {
      procesadoRef.current = false;
      setCargando(true);
    }
  }, [visible]);

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

  const handleInterceptUrl = (url: string): boolean => {
    if (!url) return true;

    // Detectar retorno al comercio (localtest.me, respuesta, o parámetros de resultado de Wompi)
    const esRetorno =
      url.includes("localtest.me") ||
      url.includes("/respuesta") ||
      url.includes("env=test") ||
      url.includes("transactionId=") ||
      (url.includes("id=") && !url.includes("checkout.wompi.co/p/"));

    if (esRetorno && !procesadoRef.current) {
      procesadoRef.current = true;
      const txId = extraerTransactionId(url);
      onComplete({
        transactionId: txId,
        reference: referencia,
      });
      return false; // Detener carga en WebView para no solicitar localtest.me
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

          <View style={{ width: 36 }} />
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
            onLoadStart={() => setCargando(true)}
            onLoadEnd={() => setCargando(false)}
            onShouldStartLoadWithRequest={(request) => {
              return handleInterceptUrl(request.url);
            }}
            onNavigationStateChange={(navState) => {
              handleInterceptUrl(navState.url);
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            originWhitelist={["*"]}
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
    ...StyleSheet.absoluteFillObject,
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
