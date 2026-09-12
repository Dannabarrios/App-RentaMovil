import React from "react";
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import { COLOR_MARCA } from "../constants/reservation.constants";
import { GRADIENTES, SOMBRA_BOTON_GRADIENTE } from "@/constants/gradients";
import { getCiudadPorSucursal, getDireccionSucursal } from "@/modules/catalog/constants/catalog.constants";
import { fmt } from "@/modules/reservation/components/BookingSummaryModal.pieces";

interface Props {
  visible: boolean;
  referencia: string;
  nombreSucursal: string;
  total: number;
  horasLimitePago?: number;
  onIrAMisReservas?: () => void;
  onVolverAlInicio?: () => void;
  onCerrar?: () => void;
  botonTexto?: string;
}

export function BranchCashPaymentModal({
  visible,
  referencia,
  nombreSucursal,
  total,
  horasLimitePago,
  onIrAMisReservas,
  onVolverAlInicio,
  onCerrar,
  botonTexto,
}: Props) {
  const c = useTemaColores();
  const { t } = useTranslation();
  const primaryAccent = c.oscuro ? "#60A5FA" : COLOR_MARCA;

  const ciudad = getCiudadPorSucursal(nombreSucursal);
  const direccion = getDireccionSucursal(nombreSucursal);
  const esInmediata = !!horasLimitePago && horasLimitePago <= 2;

  const handleIrReservas = onIrAMisReservas || onCerrar;
  const handleVolverInicio = onVolverAlInicio || onCerrar;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleIrReservas}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          {/* Logo Circular Superior con Sombra */}
          <View
            style={[
              styles.logoCircle,
              {
                backgroundColor: "#FFFFFF",
                borderColor: c.oscuro ? "#334155" : "#F1F5F9",
              },
            ]}
          >
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          {/* Título */}
          <Text style={[styles.titulo, { color: c.textPrimary }]}>
            {t("reserva.confirmacion.efectivoConfirmadaTitulo", { defaultValue: "Reserva Registrada" })}
          </Text>

          {/* Mensaje descriptivo */}
          <Text style={[styles.descripcion, { color: c.textSecondary }]}>
            {t("reserva.confirmacion.efectivoConfirmadaSub", {
              defaultValue: nombreSucursal
                ? `Tu reserva quedó registrada. Para confirmarla, realiza el pago en efectivo en el punto autorizado ${nombreSucursal}.`
                : "Tu reserva quedó registrada. Para confirmarla, realiza el pago en efectivo en la sucursal seleccionada.",
              sucursal: nombreSucursal,
            })}
          </Text>

          {/* Caja de Referencia y Total */}
          <View style={[styles.cajaReferencia, { backgroundColor: c.oscuro ? c.bgInput : "#F8FAFC", borderColor: c.border }]}>
            <View style={styles.filaInfo}>
              <Text style={[styles.etiqueta, { color: c.textSecondary }]}>
                {t("reserva.confirmacion.respuesta.referencia", { defaultValue: "Referencia de reserva" })}:
              </Text>
              <Text style={[styles.valorRef, { color: primaryAccent }]}>{referencia}</Text>
            </View>

            {!!nombreSucursal && (
              <View style={styles.filaInfo}>
                <Text style={[styles.etiqueta, { color: c.textSecondary }]}>
                  {t("reserva.confirmacion.sucursal", { defaultValue: "Sucursal" })}:
                </Text>
                <Text style={[styles.valor, { color: c.textPrimary }]} numberOfLines={1}>
                  {nombreSucursal}
                </Text>
              </View>
            )}

            <View style={[styles.divisor, { backgroundColor: c.border }]} />

            <View style={styles.filaInfo}>
              <Text style={[styles.etiquetaTotal, { color: c.textSecondary }]}>
                {t("reserva.confirmacion.totalAPagar", { defaultValue: "TOTAL A PAGAR" })}:
              </Text>
              <Text style={[styles.valorTotal, { color: primaryAccent }]}>{fmt(total)}</Text>
            </View>
          </View>

          {/* Tarjeta Amarilla: PLAZO PARA PAGAR */}
          <View
            style={[
              styles.plazoCard,
              {
                backgroundColor: c.oscuro ? "#261C08" : "#FEFCE8",
                borderColor: c.oscuro ? "#785C15" : "#FDE047",
              },
            ]}
          >
            <Text style={[styles.plazoTitulo, { color: c.oscuro ? "#FCD34D" : "#854D0E" }]}>
              {t("reserva.confirmacion.plazoParaPagarTitulo", { defaultValue: "PLAZO PARA PAGAR" })}
            </Text>
            <Text style={[styles.plazoTexto, { color: c.oscuro ? "#FDE68A" : "#713F12" }]}>
              {(() => {
                const horas = horasLimitePago || 72;
                const textoHoras = horas === 1 ? "1 hora" : `${horas} horas`;
                return `Tienes aproximadamente ${textoHoras} para acercarte a la sucursal y realizar el pago. Si no realizas el pago dentro de este plazo, la reserva se cancelará automáticamente.`;
              })()}
            </Text>
          </View>

          {/* Botón Principal con Gradiente Corporativo */}
          <TouchableOpacity style={styles.botonPrimarioWrap} onPress={handleIrReservas} activeOpacity={0.88}>
            <LinearGradient
              colors={GRADIENTES.boton.colors}
              start={GRADIENTES.boton.start}
              end={GRADIENTES.boton.end}
              style={styles.botonPrimario}
            >
              <Text style={styles.botonPrimarioTexto}>
                {botonTexto || t("reserva.confirmacion.entendidoIrAMisReservas", { defaultValue: "Ir a Mis Reservas" })}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Botón Secundario: Volver al Inicio */}
          <TouchableOpacity
            style={[
              styles.botonSecundario,
              {
                borderColor: c.border,
                backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF",
              },
            ]}
            onPress={handleVolverInicio}
            activeOpacity={0.8}
          >
            <Text style={[styles.botonSecundarioTexto, { color: c.textPrimary }]}>
              {t("reserva.confirmacion.volverAlInicio", { defaultValue: "Volver al Inicio" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 345,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  logoImg: {
    width: 48,
    height: 30,
  },
  titulo: {
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  descripcion: {
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  cajaReferencia: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  filaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2.5,
  },
  etiqueta: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  etiquetaTotal: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  valor: {
    fontSize: 11.5,
    fontWeight: "600",
    maxWidth: "55%",
    textAlign: "right",
  },
  valorRef: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  valorTotal: {
    fontSize: 14.5,
    fontWeight: "800",
  },
  divisor: {
    height: 1,
    marginVertical: 6,
  },
  plazoCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1.2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  plazoTitulo: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  plazoTexto: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "500",
  },
  botonPrimarioWrap: {
    width: "100%",
    borderRadius: 14,
    ...SOMBRA_BOTON_GRADIENTE,
  },
  botonPrimario: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  botonPrimarioTexto: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  botonSecundario: {
    width: "100%",
    flexDirection: "row",
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  botonSecundarioTexto: {
    fontSize: 13,
    fontWeight: "700",
  },
});
