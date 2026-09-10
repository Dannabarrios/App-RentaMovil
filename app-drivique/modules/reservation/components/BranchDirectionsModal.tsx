import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { COLOR_MARCA } from "../constants/reservation.constants";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";

interface Props {
  visible: boolean;
  nombreSucursal: string;
  direccion: string;
  horario?: string;
  onCerrar: () => void;
}

export default function BranchDirectionsModal({
  visible,
  nombreSucursal,
  direccion,
  horario,
  onCerrar,
}: Props) {
  const c = useTemaColores();
  const { t, i18n } = useTranslation();

  const textoHorario = horario || t("reserva.flujo.horarioAtencion", { defaultValue: "Lun a sáb, 7:00 am - 7:00 pm" });
  const direccionCompleta = direccion || "Cra 5 # 12-34, Neiva, Huila";
  const query = `${nombreSucursal}, ${direccionCompleta}`;
  const langParam = i18n.language ? i18n.language.slice(0, 2) : "es";
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=${langParam}&z=15&output=embed`;

  const handleOpenExternalMap = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccionCompleta)}`;
    Linking.openURL(url).catch(() => {});
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden; background-color: ${c.oscuro ? "#0d1117" : "#f1f5f9"}; }
          iframe { width: 100%; height: 100%; border: 0; }
        </style>
      </head>
      <body>
        <iframe
          src="${embedUrl}"
          allowfullscreen=""
          loading="lazy"
        ></iframe>
      </body>
    </html>
  `;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: c.bgCard }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: c.bgCard }]}>
            <View style={styles.headerTitleRow}>
              <MaterialIcons name="directions" size={22} color={COLOR_MARCA} />
              <Text style={[styles.headerTitle, { color: COLOR_MARCA }]}>
                {t("reserva.flujo.comoLlegar", { defaultValue: "Cómo llegar" })}
              </Text>
            </View>
            <TouchableOpacity onPress={onCerrar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={c.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {/* Body */}
          <View style={[styles.body, { backgroundColor: c.bgCard }]}>
            <Text style={[styles.nombreSucursal, { color: c.textPrimary }]}>
              {nombreSucursal}
            </Text>

            {/* Dirección de la Sucursal */}
            <View style={styles.infoFila}>
              <Ionicons name="location-outline" size={15} color={c.textMuted} />
              <Text style={[styles.infoTexto, { color: c.textSecondary }]}>
                {direccionCompleta}
              </Text>
            </View>

            {/* Horario de Atención */}
            <View style={[styles.infoFila, { marginBottom: 14 }]}>
              <Ionicons name="time-outline" size={15} color={c.textMuted} />
              <Text style={[styles.infoTexto, { color: c.textSecondary }]}>
                {textoHorario}
              </Text>
            </View>

            {/* Mapa Interactivo con Botón Flotante Abrir en Maps */}
            <View style={[styles.mapContainer, { borderColor: c.border, backgroundColor: c.bgInput }]}>
              {Platform.OS === "web" ? (
                <iframe
                  title="Google Map"
                  src={embedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allow="geolocation"
                />
              ) : (
                <WebView
                  source={{ html: htmlContent }}
                  style={styles.map}
                  originWhitelist={["*"]}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  renderLoading={() => (
                    <View style={[styles.loadingMap, { backgroundColor: c.bgInput }]}>
                      <ActivityIndicator size="small" color={COLOR_MARCA} />
                    </View>
                  )}
                />
              )}

              {/* Botón Flotante Abrir en Maps */}
              <TouchableOpacity
                style={[styles.floatingBtnMaps, { backgroundColor: c.bgCard, borderColor: c.border }]}
                onPress={handleOpenExternalMap}
                activeOpacity={0.8}
              >
                <Text style={styles.floatingBtnMapsText}>
                  {t("reserva.flujo.abrirEnMaps", { defaultValue: "Abrir en Maps" })}
                </Text>
                <MaterialIcons name="open-in-new" size={15} color={COLOR_MARCA} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {/* Footer con Botón Cerrar */}
          <View style={[styles.footer, { backgroundColor: c.bgCard }]}>
            <TouchableOpacity
              style={[styles.btnCerrar, { backgroundColor: COLOR_MARCA }]}
              onPress={onCerrar}
              activeOpacity={0.85}
            >
              <Text style={styles.btnCerrarText}>
                {t("reserva.fechasLugar.cerrar", { defaultValue: "Cerrar" })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    width: "100%",
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
  },
  nombreSucursal: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  infoFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  infoTexto: {
    fontSize: 12.5,
    fontWeight: "500",
    flexShrink: 1,
  },
  mapContainer: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  loadingMap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingBtnMaps: {
    position: "absolute",
    top: 10,
    left: 10,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
  },
  floatingBtnMapsText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLOR_MARCA,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  btnCerrar: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 8,
  },
  btnCerrarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
