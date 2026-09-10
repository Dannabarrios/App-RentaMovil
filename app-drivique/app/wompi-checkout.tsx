import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { COLOR_MARCA } from "@/modules/catalog/constants/catalog.constants";
import {
  aCentavos,
  construirUrlCheckout,
  consultarTransaccionWompi,
} from "@/modules/reservation/services/wompiService";
import { reservaPersistService } from "@/modules/reservation/services/reservationPersistService";

export default function WompiCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const c = useTemaColores();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ url?: string; ref?: string }>();
  
  const rawRef = params.ref ? String(params.ref) : "";
  const referencia = rawRef.includes("%") ? decodeURIComponent(rawRef) : rawRef;

  const getInitialUrl = () => {
    if (params.url) {
      const rawUrl = String(params.url);
      return rawUrl.includes("%3A%2F%2F") || rawUrl.includes("%2F")
        ? decodeURIComponent(rawUrl)
        : rawUrl;
    }
    return null;
  };

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(getInitialUrl);
  const [cargando, setCargando] = useState(true);
  const procesadoRef = useRef(false);
  const ultimoTransactionIdRef = useRef<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      if (params.url) {
        const rawUrl = String(params.url);
        const urlLimpia = rawUrl.includes("%3A%2F%2F") || rawUrl.includes("%2F")
          ? decodeURIComponent(rawUrl)
          : rawUrl;
        if (activo) setCheckoutUrl(urlLimpia);
      } else if (referencia) {
        const reserva = await reservaPersistService.obtenerPorReferencia(referencia);
        if (reserva) {
          const urlGen = await construirUrlCheckout({
            reference: reserva.referencia,
            amountInCents: aCentavos(reserva.total),
            redirectUrl: "https://localtest.me/respuesta",
          });
          if (activo) setCheckoutUrl(urlGen);
        }
      }
    })();
    return () => {
      activo = false;
    };
  }, [params.url, params.ref, referencia]);

  const extraerTransactionId = (url: string): string | null => {
    try {
      const parsed = Linking.parse(url);
      if (parsed.queryParams?.id && typeof parsed.queryParams.id === "string") {
        return parsed.queryParams.id;
      }
      if (parsed.queryParams?.transaction_id && typeof parsed.queryParams.transaction_id === "string") {
        return parsed.queryParams.transaction_id;
      }
      if (parsed.queryParams?.transactionId && typeof parsed.queryParams.transactionId === "string") {
        return parsed.queryParams.transactionId;
      }
      const match = url.match(/[?&](?:id|transaction_id|transactionId)=([^&#]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch (e) {
      console.warn("[WompiCheckout] Error parseando ID de transaccion:", e);
    }
    return null;
  };

  const handleFinalizarPago = async (transactionId: string | null) => {
    if (procesadoRef.current) return;
    procesadoRef.current = true;

    const refDestino = referencia || (params.ref ? String(params.ref) : "");

    if (refDestino) {
      if (transactionId) {
        try {
          const txData = await consultarTransaccionWompi(transactionId);
          if (txData) {
            let nuevoEstado: "PENDIENTE_VALIDACION" | "PENDIENTE_EFECTIVO" | "CONFIRMADA" = "PENDIENTE_VALIDACION";
            const pmType = (txData.payment_method_type || "").toUpperCase();

            let detalleMetodo = "Wompi";
            if (pmType === "BANCOLOMBIA_COLLECT" || pmType.includes("COLLECT")) {
              nuevoEstado = "PENDIENTE_EFECTIVO";
              detalleMetodo = "Efectivo en Bancolombia";
            } else if (pmType === "NEQUI" || pmType.includes("NEQUI")) {
              detalleMetodo = "Nequi";
            } else if (pmType === "BANCOLOMBIA_TRANSFER" || pmType.includes("TRANSFER") || pmType.includes("BOTON_BANCOLOMBIA")) {
              detalleMetodo = "Bancolombia";
            } else if (pmType === "DAVIPLATA" || pmType.includes("DAVIPLATA")) {
              detalleMetodo = "Daviplata";
            } else if (pmType === "PSE" || pmType.includes("PSE")) {
              detalleMetodo = "PSE";
            } else if (pmType === "CARD" || pmType.includes("CARD")) {
              const brand = txData.payment_method?.extra?.brand || "";
              const last4 = txData.payment_method?.extra?.last_four || "";
              detalleMetodo = brand ? `Tarjeta ${brand} ${last4 ? `(••• ${last4})` : ""}`.trim() : "Tarjeta";
            }

            if (txData.status === "APPROVED") {
              nuevoEstado = "CONFIRMADA";
            }

            await reservaPersistService.actualizarReserva(refDestino, {
              estado: nuevoEstado,
              paymentId: transactionId,
              paymentMethodType: pmType,
              metodoPagoDetalle: detalleMetodo,
              convenioWompi: txData.payment_method?.extra?.business_agreement_code || (txData as any).extra?.business_agreement_code || "00000",
              referenciaWompi: txData.payment_method?.extra?.payment_reference || (txData as any).extra?.payment_reference || "",
              wompiExtra: txData.payment_method?.extra,
            });
          }
        } catch (e) {
          console.error("[WompiCheckout] Error consultando transaccion Wompi:", e);
        }
      }

      router.replace(
        `/payment-response?ref=${encodeURIComponent(refDestino)}${transactionId ? `&id=${encodeURIComponent(transactionId)}` : ""}`
      );
    } else {
      router.replace("/(tabs)/my-bookings");
    }
  };

  const handleInterceptUrl = (url: string): boolean => {
    if (!url) return true;

    const txId = extraerTransactionId(url);
    if (txId) {
      ultimoTransactionIdRef.current = txId;
    }

    // Solo cuando sale de Wompi hacia la URL de retorno (localtest.me, respuesta, etc.)
    const esRetornoComercio =
      url.includes("localtest.me") ||
      url.includes("localhost") ||
      url.includes("127.0.0.1") ||
      url.includes("/respuesta") ||
      url.includes("payment-response") ||
      url.includes("app-drivique://") ||
      url.includes("drivique://");

    if (esRetornoComercio) {
      const finalTxId = txId || ultimoTransactionIdRef.current;
      handleFinalizarPago(finalTxId);
      return false; // Detiene la navegación antes de intentar cargar 127.0.0.1
    }

    return true;
  };

  const handleMessage = (event: any) => {
    try {
      const rawData = event.nativeEvent?.data;
      if (!rawData) return;
      let data: any = null;
      try {
        data = JSON.parse(rawData);
      } catch {
        data = rawData;
      }

      if (typeof data === "object" && data !== null) {
        const txId =
          data.transaction?.id ||
          data.data?.transaction?.id ||
          data.data?.id ||
          data.id ||
          data.transactionId ||
          (data.url ? extraerTransactionId(data.url) : null);

        if (txId && typeof txId === "string") {
          ultimoTransactionIdRef.current = txId;
        }

        // Solo finalizar cuando el usuario explícitamente cierra el checkout o Wompi finaliza
        if (
          data.event === "wompi:checkout_closed" ||
          data.type === "CHECKOUT_CLOSED"
        ) {
          const idFinal = txId || ultimoTransactionIdRef.current;
          handleFinalizarPago(idFinal);
        }
      } else if (typeof data === "string") {
        const txId = extraerTransactionId(data);
        if (txId) {
          ultimoTransactionIdRef.current = txId;
        }
      }
    } catch (e) {
      console.warn("[WompiCheckout] Error procesando mensaje de WebView:", e);
    }
  };

  const handleVolver = () => {
    const refDestino = referencia || (params.ref ? String(params.ref) : "");
    if (ultimoTransactionIdRef.current) {
      handleFinalizarPago(ultimoTransactionIdRef.current);
    } else if (refDestino) {
      router.replace(`/payment-response?ref=${encodeURIComponent(refDestino)}`);
    } else {
      router.replace("/(tabs)/my-bookings");
    }
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
      console.warn("[WompiCheckout] Error abriendo URL externa:", e);
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleVolver();
      return true;
    };
    const backSub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => backSub.remove();
  }, [referencia]);

  if (!checkoutUrl) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={COLOR_MARCA} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <StatusBar barStyle={c.oscuro ? "light-content" : "dark-content"} />

      {/* Cabecera Superior */}
      <View style={[styles.header, { borderBottomColor: c.border, backgroundColor: c.bgCard }]}>
        <TouchableOpacity
          style={[styles.btnHeader, { backgroundColor: c.oscuro ? "rgba(255,255,255,0.08)" : "#f1f5f9" }]}
          onPress={handleVolver}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={c.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.seguridadBadge}>
            <Ionicons name="lock-closed" size={12} color="#16a34a" />
            <Text style={styles.seguridadTexto}>
              {t("reserva.pago.pagoSeguro", { defaultValue: "Pago Seguro 256-bit" })}
            </Text>
          </View>
          <Text style={[styles.titulo, { color: c.textPrimary }]} numberOfLines={1}>
            Wompi • Pasarela Digital
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btnHeader, { backgroundColor: c.oscuro ? "rgba(255,255,255,0.08)" : "#f1f5f9" }]}
          onPress={handleAbrirEnNavegador}
          activeOpacity={0.7}
        >
          <Ionicons name="open-outline" size={18} color={c.primary} />
        </TouchableOpacity>
      </View>

      {/* Contenedor del WebView */}
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
            if (nativeEvent.progress > 0.4) {
              setCargando(false);
            }
          }}
          onLoadEnd={() => setCargando(false)}
          onError={(syntheticEvent) => {
            setCargando(false);
            const url = syntheticEvent.nativeEvent?.url;
            if (url) handleInterceptUrl(url);
          }}
          onHttpError={(syntheticEvent) => {
            setCargando(false);
            const url = syntheticEvent.nativeEvent?.url;
            if (url) handleInterceptUrl(url);
          }}
          onShouldStartLoadWithRequest={(request) => {
            return handleInterceptUrl(request.url);
          }}
          onNavigationStateChange={(navState) => {
            handleInterceptUrl(navState.url);
          }}
          injectedJavaScript={`
            (function() {
              function notify(data) {
                try {
                  if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                    window.ReactNativeWebView.postMessage(typeof data === 'string' ? data : JSON.stringify(data));
                  }
                } catch (e) {}
              }
              window.addEventListener('message', function(event) {
                if (event && event.data) {
                  notify(event.data);
                }
              });
              var originalPush = history.pushState;
              history.pushState = function() {
                originalPush.apply(this, arguments);
                notify({ type: 'URL_CHANGE', url: location.href });
              };
              var originalReplace = history.replaceState;
              history.replaceState = function() {
                originalReplace.apply(this, arguments);
                notify({ type: 'URL_CHANGE', url: location.href });
              };
              window.addEventListener('popstate', function() {
                notify({ type: 'URL_CHANGE', url: location.href });
              });
            })();
            true;
          `}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={true}
          startInLoadingState={false}
          originWhitelist={["*"]}
          userAgent="Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  btnHeader: {
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
