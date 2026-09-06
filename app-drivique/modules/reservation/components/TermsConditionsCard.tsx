import React, { useState, useMemo } from "react";
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import {
  COLOR_MARCA,
  VALOR_KM_EXCEDENTE,
} from "../constants/reservation.constants";
import { GRADIENTES } from "@/constants/gradients";
import { useReservaStore } from "@/store/reservationStore";

const { height } = Dimensions.get("window");

export default function TarjetaTerminosCondiciones() {
  const datosPersonales = useReservaStore((s) => s.datosPersonales);
  const actualizarDatosPersonales = useReservaStore((s) => s.actualizarDatosPersonales);
  const [modalTerminos, setModalTerminos] = useState(false);
  const [terminosLeidos, setTerminosLeidos] = useState(false);
  const c = useTemaColores();
  const { t } = useTranslation();

  const primaryAccent = c.oscuro ? "#60A5FA" : COLOR_MARCA;
  const brandBg = c.oscuro ? "#3B82F6" : COLOR_MARCA;
  const valorKmFormateado = VALOR_KM_EXCEDENTE.toLocaleString("es-CO");

  const handleScrollTerminos = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    if (isAtBottom && !terminosLeidos) {
      setTerminosLeidos(true);
    }
  };

  const handleAceptarTerminos = () => {
    actualizarDatosPersonales({ terminosAceptados: true });
    setModalTerminos(false);
  };

  const clausulasAlquiler = useMemo(
    () => [
      {
        titulo: "1. OBJETO DEL CONTRATO",
        texto:
          "El arrendador entrega al arrendatario el vehículo descrito en las condiciones óptimas de funcionamiento para su uso personal o comercial autorizado.",
      },
      {
        titulo: "2. USO DEL VEHÍCULO",
        texto:
          "Queda estrictamente prohibido utilizar el vehículo para fines ilícitos, subarrendar, transporte de carga pesada no autorizada o conducir bajo los efectos del alcohol o sustancias psicoactivas. El vehículo debe ser usado únicamente dentro del territorio colombiano.",
      },
      {
        titulo: "3. DOCUMENTACIÓN OBLIGATORIA",
        texto:
          "El conductor debe presentar documento de identidad original válido y licencia de conducción vigente al momento de la entrega del vehículo.",
      },
      {
        titulo: "4. POLÍTICA DE CANCELACIÓN Y NO REEMBOLSO",
        texto:
          "No se realizarán devoluciones de dinero. Las cancelaciones se gestionan mediante saldo a favor para futuras reservas.",
      },
      {
        titulo: "5. DURACIÓN Y MODIFICACIONES",
        texto:
          "La duración de la renta será la acordada en la reserva. Cualquier cambio en fechas, horas o sucursal de entrega/devolución debe ser coordinado con antelación y puede generar ajustes en la tarifa.",
      },
      {
        titulo: "6. KILOMETRAJE Y EXCEDENTES",
        texto: `En plan Limitado se incluye un cupo de km por día; el kilómetro adicional excedente tendrá un valor de $${valorKmFormateado} COP/km calculado al devolver el auto. En plan Ilimitado no aplica cobro por distancia recorrida.`,
      },
      {
        titulo: "7. PAGOS Y TARIFAS",
        texto:
          "El valor pactado incluye la renta diaria del vehículo, coberturas de protección seleccionadas, cargos administrativos e impuestos de ley.",
      },
      {
        titulo: "8. DAÑOS Y RESPONSABILIDAD",
        texto:
          "El arrendatario es responsable del cuidado del vehículo durante el periodo contratado. En caso de siniestro o eventualidad, se deberá notificar de forma inmediata a Drivique y a las autoridades competentes.",
      },
      {
        titulo: "9. LEGISLACIÓN APLICABLE",
        texto:
          "El presente contrato de alquiler se rige en su totalidad por las leyes de la República de Colombia.",
      },
    ],
    [valorKmFormateado]
  );

  return (
    <>
      <View style={[styles.cardForm, { backgroundColor: c.oscuro ? c.bgCard : "#FFFFFF", borderColor: c.border }]}>
        <View style={styles.cardHeaderFila}>
          <Ionicons name="shield-checkmark-outline" size={14} color={primaryAccent} />
          <Text style={[styles.cardHeaderTitulo, { color: primaryAccent }]}>
            {t("reserva.terminos.politicasSeguridad", { defaultValue: "Políticas y seguridad" })}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.filaCheckbox}
          onPress={() => {
            if (!datosPersonales.terminosAceptados) {
              setModalTerminos(true);
              setTerminosLeidos(false);
            } else {
              actualizarDatosPersonales({ terminosAceptados: false });
            }
          }}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor: brandBg },
              datosPersonales.terminosAceptados && { backgroundColor: brandBg },
            ]}
          >
            {datosPersonales.terminosAceptados && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
          </View>
          <Text style={[styles.textoCheckbox, { color: c.textPrimary }]}>
            {t(
              "reserva.terminos.aceptoTexto",
              {
                defaultValue:
                  "Acepto los términos, condiciones del contrato de alquiler y la política de privacidad *",
              }
            )}{" "}
            <Text
              style={[styles.enlace, { color: primaryAccent }]}
              onPress={() => {
                setModalTerminos(true);
                setTerminosLeidos(false);
              }}
            >
              {t("reserva.terminos.verTerminos", { defaultValue: "Ver términos y condiciones" })}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Modal: Términos y condiciones con scroll obligatorio ── */}
      <Modal visible={modalTerminos} transparent animationType="slide" onRequestClose={() => setModalTerminos(false)} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setModalTerminos(false)} />
          <View style={[styles.modalContenedor, { backgroundColor: c.bgCard }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.modalHandle, { backgroundColor: c.border }]} />
            <View style={[styles.modalEncabezado, { borderBottomColor: c.border }]}>
              <Text style={[styles.modalTitulo, { color: c.textPrimary }]}>
                {t("reserva.terminos.modalTitulo", { defaultValue: "Términos y condiciones de alquiler" })}
              </Text>
              <TouchableOpacity
                style={[styles.modalBotonCerrar, { backgroundColor: c.oscuro ? "#374151" : "#F3F4F6" }]}
                onPress={() => setModalTerminos(false)}
              >
                <Ionicons name="close" size={16} color={c.oscuro ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              bounces={true}
              overScrollMode="always"
              onScroll={handleScrollTerminos}
              scrollEventThrottle={16}
            >
              {/* Documento único unificado */}
              <View
                style={[
                  styles.documentoContainer,
                  {
                    backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF",
                    borderColor: c.border,
                  },
                ]}
              >
                {/* Cabecera de Políticas Importantes (fondo suave azul/marca, sin rojo) */}
                <View
                  style={[
                    styles.documentoHeader,
                    {
                      backgroundColor: c.oscuro ? "#1E293B" : "#F0F4FF",
                      borderBottomColor: c.border,
                    },
                  ]}
                >
                  <Text style={[styles.documentoHeaderTitulo, { color: primaryAccent }]}>
                    POLÍTICAS IMPORTANTES DEL CONTRATO
                  </Text>
                  <Text style={[styles.documentoHeaderTexto, { color: c.textPrimary }]}>
                    <Text style={{ fontWeight: "700" }}>Política de No Reembolso: </Text>
                    Una vez confirmada y pagada la reserva, no se realizan devoluciones de dinero bajo ninguna
                    circunstancia. El cliente podrá reprogramar su fecha de alquiler notificando con al menos 48 horas
                    de anticipación.
                  </Text>
                </View>

                {/* Cuerpo de Términos en formato de texto continuo */}
                <View style={styles.documentoCuerpo}>
                  <Text style={[styles.documentoSubtitulo, { color: c.textMuted }]}>
                    TÉRMINOS Y CONDICIONES DE ALQUILER DRIVIQUE
                  </Text>

                  {clausulasAlquiler.map((clausula, idx) => (
                    <View key={idx} style={styles.parrafoFila}>
                      <Text style={[styles.parrafoTexto, { color: c.textSecondary }]}>
                        <Text style={[styles.parrafoTitulo, { color: c.textPrimary }]}>{clausula.titulo}: </Text>
                        {clausula.texto}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Botones de acción del Modal */}
            <View style={styles.modalBotonesRow}>
              {/* Botón Cerrar */}
              <TouchableOpacity
                onPress={() => setModalTerminos(false)}
                style={[
                  styles.modalBotonCerrarSecundario,
                  { borderColor: c.border, backgroundColor: c.oscuro ? c.bgCard : "#FFFFFF" },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalBotonCerrarSecundarioTexto, { color: c.textPrimary }]}>
                  {t("comun.cerrar", { defaultValue: "Cerrar" })}
                </Text>
              </TouchableOpacity>

              {/* Botón Entendido con degradado Drivique */}
              <View style={styles.modalBotonAceptarWrap}>
                <TouchableOpacity
                  onPress={handleAceptarTerminos}
                  activeOpacity={0.85}
                  style={{ width: "100%" }}
                >
                  <LinearGradient
                    colors={GRADIENTES.boton.colors}
                    start={GRADIENTES.boton.start}
                    end={GRADIENTES.boton.end}
                    style={styles.modalBotonAceptar}
                  >
                    <Text style={styles.modalBotonAceptarTexto}>
                      {t("reserva.terminos.modalAceptar", { defaultValue: "Entendido" })}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  cardForm: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  cardHeaderFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  cardHeaderTitulo: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  filaCheckbox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.3,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  textoCheckbox: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
  },
  enlace: {
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalContenedor: {
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.85,
    paddingBottom: 24,
    overflow: "hidden",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  modalEncabezado: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitulo: {
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
  },
  modalBotonCerrar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  documentoContainer: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  documentoHeader: {
    padding: 14,
    borderBottomWidth: 1,
  },
  documentoHeaderTitulo: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  documentoHeaderTexto: {
    fontSize: 11.5,
    lineHeight: 17,
  },
  documentoCuerpo: {
    padding: 14,
  },
  documentoSubtitulo: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  parrafoFila: {
    marginBottom: 12,
  },
  parrafoTexto: {
    fontSize: 11.5,
    lineHeight: 18,
  },
  parrafoTitulo: {
    fontWeight: "700",
  },
  modalBotonesRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    gap: 10,
  },
  modalBotonCerrarSecundario: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBotonCerrarSecundarioTexto: {
    fontSize: 13,
    fontWeight: "700",
  },
  modalBotonAceptarWrap: {
    flex: 2,
    borderRadius: 12,
  },
  modalBotonAceptar: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalBotonAceptarTexto: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});