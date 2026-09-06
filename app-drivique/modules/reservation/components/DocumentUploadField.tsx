// modules/reserva/components/CampoSubidaDocumento.tsx
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import { COLOR_MARCA } from "../constants/reservation.constants";
import { ArchivoDocumento } from "../types/reservation.types";

interface Props {
  etiqueta: string;
  ayuda: string;
  archivo: ArchivoDocumento | null;
  cargando: boolean;
  error?: string;
  onSeleccionar: () => void;
  onQuitar: () => void;
  requerido?: boolean;
}

export default function CampoSubidaDocumento({
  etiqueta,
  ayuda,
  archivo,
  cargando,
  error,
  onSeleccionar,
  onQuitar,
  requerido = true,
}: Props) {
  const c = useTemaColores();
  const { t } = useTranslation();
  const primaryAccent = c.oscuro ? "#60A5FA" : COLOR_MARCA;

  return (
    <View
      style={[
        styles.subcard,
        {
          backgroundColor: c.oscuro ? c.bgCard : "#FFFFFF",
          borderColor: primaryAccent,
        },
        !!error && styles.subcardError,
      ]}
    >
      <Text style={[styles.etiqueta, { color: c.textPrimary }]}>
        {etiqueta}
        {requerido ? " *" : ""}
      </Text>
      <Text style={[styles.ayuda, { color: c.textMuted }]}>{ayuda}</Text>

      {cargando ? (
        <View style={styles.estadoCargando}>
          <ActivityIndicator size="small" color={primaryAccent} />
          <Text style={[styles.textoCargando, { color: primaryAccent }]}>{t("reserva.documentos.subiendoArchivo")}</Text>
        </View>
      ) : archivo ? (
        <View
          style={[
            styles.archivoBox,
            {
              backgroundColor: c.oscuro ? "#17255433" : "#EFF6FF",
              borderColor: c.oscuro ? "#1D4ED8" : "#BFDBFE",
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color={primaryAccent} />
          <View style={styles.archivoInfo}>
            <Text style={[styles.archivoNombre, { color: c.textPrimary }]} numberOfLines={1}>
              {archivo.nombre}
            </Text>
            <Text style={[styles.archivoTamano, { color: c.textMuted }]}>
              {(archivo.tamanoBytes / 1024 / 1024).toFixed(2)} MB
            </Text>
          </View>
          <TouchableOpacity onPress={onQuitar} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color={c.oscuro ? "#9CA3AF" : "#6B7280"} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[styles.boton, { backgroundColor: c.oscuro ? c.bgCard : "#FFFFFF", borderColor: c.border }]} onPress={onSeleccionar} activeOpacity={0.7}>
          <Ionicons name="cloud-upload-outline" size={14} color={primaryAccent} />
          <Text style={[styles.botonTexto, { color: primaryAccent }]}>{t("reserva.documentos.subirPdf")}</Text>
        </TouchableOpacity>
      )}

      {!!error && (
        <View style={styles.errorFila}>
          <Ionicons name="alert-circle-outline" size={14} color={c.error} />
          <Text style={[styles.error, { color: c.error }]}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  subcard: {
    borderWidth: 1.3,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    width: "100%",
  },
  subcardError: {
    borderStyle: "solid",
    borderWidth: 1.5,
    borderColor: "#EF4444",
  },
  etiqueta: {
    fontSize: 13.5,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  ayuda: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 15,
    marginBottom: 12,
  },
  boton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  botonTexto: {
    fontSize: 12,
    fontWeight: "700",
  },
  estadoCargando: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  textoCargando: {
    fontSize: 12,
    fontWeight: "700",
  },
  archivoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  archivoInfo: { flex: 1, minWidth: 0 },
  archivoNombre: { fontSize: 12.5, fontWeight: "700" },
  archivoTamano: { fontSize: 11, marginTop: 2 },
  errorFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  error: {
    fontSize: 11,
    fontWeight: "700",
  },
});