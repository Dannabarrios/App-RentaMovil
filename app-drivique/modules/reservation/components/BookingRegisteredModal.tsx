// modules/reserva/components/ModalReservaRegistrada.tsx
import React from "react";
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { GRADIENTES, SOMBRA_BOTON_GRADIENTE } from "@/constants/gradients";
import { useTranslation } from "react-i18next";

interface Props {
  visible: boolean;
  horasLimitePago?: number;
  cargando?: boolean;
  onPagarWompi: () => void;
  onCerrar: () => void;
}

export default function ModalReservaRegistrada({
  visible,
  horasLimitePago,
  cargando = false,
  onPagarWompi,
  onCerrar,
}: Props) {
  const c = useTemaColores();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cargando ? undefined : onCerrar}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          {/* Logo Circular Superior */}
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
            {t("reserva.confirmacion.reservaRegistradaTitulo", { defaultValue: "Reserva Registrada" })}
          </Text>

          {/* Descripción */}
          <Text style={[styles.descripcion, { color: c.textSecondary }]}>
            {t("reserva.confirmacion.reservaRegistradaDescripcion", {
              defaultValue:
                "Tu reserva quedó guardada como pendiente. Para confirmarla, completa el pago digital seguro con Wompi (Pruebas).",
            })}
          </Text>

          {/* Badge informativo de Plazo de Pago */}
          <View
            style={[
              styles.plazoBadge,
              {
                backgroundColor: c.oscuro ? "#261C08" : "#FEFCE8",
                borderColor: c.oscuro ? "#785C15" : "#FDE047",
              },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={c.oscuro ? "#FCD34D" : "#854D0E"}
              style={{ marginTop: 1 }}
            />
            <Text
              style={[
                styles.plazoTexto,
                {
                  color: c.oscuro ? "#FDE68A" : "#713F12",
                },
              ]}
            >
              {(() => {
                const horas = horasLimitePago || 72;
                const textoHoras = horas === 1 ? "1 hora" : `${horas} horas`;
                return `Tienes aproximadamente ${textoHoras} para realizar el pago digital y confirmar tu reserva. Si no realizas el pago dentro de este plazo, la reserva se cancelará automáticamente.`;
              })()}
            </Text>
          </View>

          {/* Botón Principal: Pagar con Wompi */}
          <TouchableOpacity
            style={styles.botonWompiWrap}
            onPress={onPagarWompi}
            activeOpacity={0.88}
            disabled={cargando}
          >
            <LinearGradient
              colors={GRADIENTES.boton.colors}
              start={GRADIENTES.boton.start}
              end={GRADIENTES.boton.end}
              style={styles.botonWompi}
            >
              {cargando ? (
                <Text style={styles.botonWompiTexto}>
                  {t("comun.procesando", { defaultValue: "Abriendo Wompi..." })}
                </Text>
              ) : (
                <>
                  <Ionicons name="card-outline" size={17} color="#fff" />
                  <Text style={styles.botonWompiTexto}>
                    {t("reserva.confirmacion.pagarConWompi", { defaultValue: "Pagar con Wompi" })}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Botón Secundario: Pagar más tarde */}
          <TouchableOpacity
            style={[styles.botonCancelar, { borderColor: c.border, backgroundColor: "transparent" }]}
            onPress={onCerrar}
            activeOpacity={0.8}
            disabled={cargando}
          >
            <Text style={[styles.botonCancelarTexto, { color: c.textSecondary }]}>
              {t("reserva.confirmacion.pagarMasTarde", { defaultValue: "Pagar más tarde" })}
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
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  logoImg: {
    width: 44,
    height: 44,
  },
  titulo: {
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  descripcion: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  plazoBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
    width: "100%",
  },
  plazoTexto: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 15.5,
    fontWeight: "600",
  },
  botonWompiWrap: {
    width: "100%",
    borderRadius: 12,
    ...SOMBRA_BOTON_GRADIENTE,
  },
  botonWompi: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  botonWompiTexto: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#fff",
  },
  botonCancelar: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  botonCancelarTexto: {
    fontSize: 13.5,
    fontWeight: "700",
  },
});
