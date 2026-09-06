// modules/reserva/components/BarraTotalConfirmar.tsx
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GRADIENTES } from "@/constants/gradients";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import { COLOR_MARCA } from "../constants/reservation.constants";
import { useMonedaStore } from "@/store/currencyStore";
import { formatCurrency } from "@/utils/currencyUtils";

interface Props {
  total: number;
  onConfirmar: () => void;
}

export default function BarraTotalConfirmar({ total, onConfirmar }: Props) {
  const c = useTemaColores();
  const { t } = useTranslation();
  const monedaActual = useMonedaStore((s) => s.monedaActual);
  const tasaUSD = useMonedaStore((s) => s.tasaUSD);

  const primaryAccent = c.oscuro ? "#1D4ED8" : COLOR_MARCA;

  return (
    <LinearGradient
      colors={GRADIENTES.boton.colors}
      start={GRADIENTES.boton.start}
      end={GRADIENTES.boton.end}
      style={styles.cardGradiente}
    >
      <Text style={styles.totalLabel}>
        {t("reserva.confirmacion.totalAPagar", { defaultValue: "TOTAL A PAGAR" }).toUpperCase()}
      </Text>

      <Text style={styles.totalMonto}>
        {formatCurrency(total, monedaActual, tasaUSD)}
      </Text>

      <Text style={styles.notaImpuesto}>
        {t("reserva.confirmacion.notaTotalPagar", { defaultValue: "Impuestos incluidos (IVA 19%)" })}
      </Text>

      <TouchableOpacity style={styles.botonBlanco} onPress={onConfirmar} activeOpacity={0.85}>
        <Text style={[styles.botonTexto, { color: primaryAccent }]}>
          {t("reserva.confirmacion.confirmarReserva", { defaultValue: "Confirmar reserva" })}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  cardGradiente: {
    borderRadius: 16,
    padding: 16,
    marginTop: 0,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.85)",
    letterSpacing: 0.6,
    marginBottom: 4,
    textAlign: "center",
  },
  totalMonto: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  notaImpuesto: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
    marginBottom: 14,
    textAlign: "center",
  },
  botonBlanco: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  botonTexto: {
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: 0.2,
    textAlign: "center",
  },
});
