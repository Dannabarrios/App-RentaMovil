import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

  const handleIrReservas = onIrAMisReservas || onCerrar;
  const handleVolverInicio = onVolverAlInicio || onCerrar;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleIrReservas}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          {/* Icono de Éxito / Pago en Efectivo */}
          <View style={[styles.iconoWrap, { backgroundColor: c.primaryBg }]}>
            <LinearGradient
              colors={GRADIENTES.boton.colors}
              start={GRADIENTES.boton.start}
              end={GRADIENTES.boton.end}
              style={styles.iconoGradient}
            >
              <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={[styles.titulo, { color: c.textPrimary }]}>
            {t("reserva.confirmacion.efectivoConfirmadaTitulo", { defaultValue: "¡Reserva registrada!" })}
          </Text>

          <Text style={[styles.descripcion, { color: c.textSecondary }]}>
            {t("reserva.confirmacion.efectivoConfirmadaSub", {
              defaultValue: "Tu reserva ha sido creada exitosamente. Realiza el pago en efectivo en la sucursal seleccionada.",
            })}
          </Text>

          {/* Caja de Detalles de Pago en Sucursal */}
          <View style={[styles.caja, { backgroundColor: c.oscuro ? c.bgInput : "#F8FAFC", borderColor: c.border }]}>
            <Text style={[styles.tituloSeccion, { color: primaryAccent }]}>
              {t("reserva.confirmacion.pagoEfectivoTitulo", { defaultValue: "Pago en efectivo: retiro en sucursal" })}
            </Text>

            {/* Referencia de Reserva */}
            <View style={styles.filaInfo}>
              <Text style={[styles.etiqueta, { color: c.textSecondary }]}>
                {t("reserva.confirmacion.respuesta.referencia", { defaultValue: "Referencia" })}:
              </Text>
              <Text style={[styles.valor, styles.referenciaValor, { color: primaryAccent }]}>{referencia}</Text>
            </View>

            {/* Sucursal */}
            <View style={styles.filaInfo}>
              <Text style={[styles.etiqueta, { color: c.textSecondary }]}>
                {t("reserva.confirmacion.sucursal", { defaultValue: "Sucursal" })}:
              </Text>
              <Text style={[styles.valor, { color: c.textPrimary }]}>{nombreSucursal || t("reserva.confirmacion.sinDefinir")}</Text>
            </View>

            {/* Ciudad */}
            <View style={styles.filaInfo}>
              <Text style={[styles.etiqueta, { color: c.textSecondary }]}>
                {t("reserva.confirmacion.ciudad", { defaultValue: "Ciudad" })}:
              </Text>
              <Text style={[styles.valor, { color: c.textPrimary }]}>{ciudad || t("reserva.confirmacion.sinDefinir")}</Text>
            </View>

            {/* Dirección */}
            <View style={styles.filaInfo}>
              <Text style={[styles.etiqueta, { color: c.textSecondary }]}>
                {t("reserva.confirmacion.direccion", { defaultValue: "Dirección" })}:
              </Text>
              <Text style={[styles.valor, { color: c.textPrimary }]} numberOfLines={2}>
                {direccion || t("reserva.confirmacion.sinDefinir")}
              </Text>
            </View>

            {/* Total */}
            <View style={[styles.divisor, { backgroundColor: c.border }]} />

            <View style={styles.filaInfo}>
              <Text style={[styles.etiqueta, { color: c.textSecondary }]}>
                {t("reserva.confirmacion.totalAPagar", { defaultValue: "TOTAL A PAGAR" })}:
              </Text>
              <Text style={[styles.totalValor, { color: primaryAccent }]}>{fmt(total)}</Text>
            </View>

            <Text style={[styles.nota, { color: c.textMuted }]}>
              {t("reserva.confirmacion.notaTotalPagar", { defaultValue: "*Incluye impuestos y cargos administrativos" })}
            </Text>
          </View>

          {/* Banner informativo de 72 horas para cancelación automática */}
          <View style={[styles.bannerAlerta72h, { backgroundColor: c.oscuro ? "#1E293B" : "#EFF6FF", borderColor: c.oscuro ? "#3B82F6" : "#BFDBFE" }]}>
            <Ionicons name="time-outline" size={18} color={primaryAccent} style={{ marginTop: 2 }} />
            <Text style={[styles.textoAlerta72h, { color: c.textPrimary }]}>
              {t("reserva.confirmacion.efectivoConfirmadaMensaje", {
                defaultValue: "Tienes 72 horas para acercarte a la sucursal y pagar en efectivo. Si no se realiza el pago dentro de este plazo, la reserva pasará a estado Cancelada automáticamente.",
                horas: 72,
              })}
            </Text>
          </View>

          {/* Botón 1: Ir a Mis Reservas */}
          <TouchableOpacity style={styles.botonPrimarioWrap} onPress={handleIrReservas} activeOpacity={0.85}>
            <LinearGradient
              colors={GRADIENTES.boton.colors}
              start={GRADIENTES.boton.start}
              end={GRADIENTES.boton.end}
              style={styles.botonPrimario}
            >
              <Ionicons name="calendar-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.botonPrimarioTexto}>
                {botonTexto || t("reserva.confirmacion.entendidoIrAMisReservas", { defaultValue: "Ir a Mis Reservas" })}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Botón 2: Volver al Inicio */}
          <TouchableOpacity
            style={[styles.botonSecundario, { borderColor: c.border, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}
            onPress={handleVolverInicio}
            activeOpacity={0.8}
          >
            <Ionicons name="home-outline" size={17} color={c.textPrimary} style={{ marginRight: 6 }} />
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
    backgroundColor: "rgba(15,23,42,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 355,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center",
  },
  iconoWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconoGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  descripcion: {
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 14,
    paddingHorizontal: 6,
  },
  caja: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  tituloSeccion: {
    fontSize: 12.5,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  filaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 3.5,
    gap: 8,
  },
  etiqueta: {
    fontSize: 11.5,
    fontWeight: "700",
    flexShrink: 0,
  },
  valor: {
    fontSize: 11.5,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  referenciaValor: {
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  divisor: {
    height: 1,
    marginVertical: 8,
  },
  totalValor: {
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
    textAlign: "right",
  },
  nota: {
    fontSize: 9.5,
    fontStyle: "italic",
    marginTop: 6,
    textAlign: "center",
  },
  bannerAlerta72h: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    width: "100%",
  },
  textoAlerta72h: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    flex: 1,
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
  },
  botonPrimarioTexto: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  botonSecundario: {
    width: "100%",
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  botonSecundarioTexto: {
    fontSize: 13.5,
    fontWeight: "700",
  },
});
