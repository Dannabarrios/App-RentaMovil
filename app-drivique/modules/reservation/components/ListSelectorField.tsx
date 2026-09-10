// modules/reserva/components/CampoSelectorLista.tsx
import React, { useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import { COLOR_MARCA } from "../constants/reservation.constants";

interface Opcion {
  id: string;
  label: string;
}

interface Props {
  etiqueta: string;
  valorSeleccionado: string | null;
  opciones: Opcion[];
  onSeleccionar: (id: string) => void;
  placeholder?: string;
  deshabilitado?: boolean;
}

export default function CampoSelectorLista({
  etiqueta,
  valorSeleccionado,
  opciones,
  onSeleccionar,
  placeholder,
  deshabilitado = false,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const c = useTemaColores();
  const { t } = useTranslation();
  const opcionActual = opciones.find((o) => o.id === valorSeleccionado);
  const primaryAccent = c.oscuro ? "#60A5FA" : COLOR_MARCA;
  const placeholderTexto = placeholder ?? t("reserva.fechasLugar.seleccionar");

  return (
    <View style={styles.contenedor}>
      <Text style={[styles.selectLabel, { color: c.oscuro ? "#94A3B8" : "#64748B" }]}>{etiqueta}</Text>

      <TouchableOpacity
        style={[
          styles.selectBox,
          { backgroundColor: c.oscuro ? c.bgInput : "#F8FAFC", borderColor: c.oscuro ? c.border : "#E2E8F0" },
          deshabilitado && { backgroundColor: c.oscuro ? "#1F2937" : "#F3F4F6", opacity: 0.8 },
        ]}
        onPress={() => !deshabilitado && setAbierto(true)}
        disabled={deshabilitado}
        activeOpacity={deshabilitado ? 1 : 0.8}
      >
        <Text
          style={[
            styles.selectValue,
            { color: c.oscuro ? "#F8FAFC" : "#0F172A" },
            (!opcionActual || deshabilitado) && { color: c.textMuted, fontWeight: "400" },
          ]}
          numberOfLines={1}
        >
          {opcionActual?.label ?? placeholderTexto}
        </Text>
        <Ionicons name="chevron-down" size={13} color={c.textMuted} />
      </TouchableOpacity>

      <Modal visible={abierto} animationType="slide" transparent onRequestClose={() => setAbierto(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setAbierto(false)}>
          <View style={[styles.sheet, { backgroundColor: c.bgCard }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.header, { borderBottomColor: c.border }]}>
              <Text style={[styles.headerTitulo, { color: c.textPrimary }]}>{etiqueta}</Text>
              <TouchableOpacity onPress={() => setAbierto(false)}>
                <Ionicons name="close" size={22} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={opciones}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const activo = item.id === valorSeleccionado;
                return (
                  <TouchableOpacity
                    style={[
                      styles.opcion,
                      { borderBottomColor: c.borderLight },
                      activo && { backgroundColor: c.primaryBg },
                    ]}
                    onPress={() => {
                      onSeleccionar(item.id);
                      setAbierto(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.opcionText,
                        { color: c.textPrimary },
                        activo && { color: primaryAccent, fontWeight: "700" },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {activo && <Ionicons name="checkmark" size={16} color={primaryAccent} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: c.textMuted }]}>{t("reserva.fechasLugar.sinOpcionesDisponibles")}</Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    width: "100%",
  },
  selectLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 6,
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
  },
  selectValue: { fontSize: 14, fontWeight: "400", flex: 1, marginRight: 6 },
  placeholder: { fontWeight: "400" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitulo: { fontSize: 15, fontWeight: "800" },
  opcion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  opcionText: { fontSize: 13, fontWeight: "600" },
  emptyText: { fontSize: 12, textAlign: "center", padding: 20 },
});