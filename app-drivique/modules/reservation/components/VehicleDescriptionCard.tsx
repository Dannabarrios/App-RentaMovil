import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Vehiculo } from "@/modules/catalog/types/catalog.types";
import { COLOR_MARCA } from "../constants/reservation.constants";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";

interface Props {
  vehiculo: Vehiculo;
}

export default function VehicleDescriptionCard({ vehiculo }: Props) {
  const c = useTemaColores();
  const { t } = useTranslation();

  if (!vehiculo.descripcion) return null;

  return (
    <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
      <View style={styles.headerConIcono}>
        <Ionicons name="reorder-three" size={18} color={COLOR_MARCA} />
        <Text style={styles.tituloHeaderConIcono}>
          {t("reserva.flujo.descripcion", { defaultValue: "Descripción" })}
        </Text>
      </View>
      <Text style={[styles.descripcionTexto, { color: c.textSecondary }]}>
        {vehiculo.descripcion}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerConIcono: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  tituloHeaderConIcono: {
    fontSize: 12,
    fontWeight: "800",
    color: COLOR_MARCA,
    letterSpacing: 0.3,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  descripcionTexto: {
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "400",
  },
});
