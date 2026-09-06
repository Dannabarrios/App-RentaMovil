// modules/reserva/components/FlujoReserva.tsx
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Vehiculo } from "@/modules/catalog/types/catalog.types";
import { useReservaStore } from "@/store/reservationStore";
import { GRADIENTES } from "@/constants/gradients";
import { COLOR_MARCA, COLORES } from "../constants/reservation.constants";
import VehiculoResumenCard from "./VehicleSummaryCard";
import FormFechasLugar from "./DatesLocationForm";
import ResumenReservaModal from "./BookingSummaryModal";
import TabsSeccion, { SeccionReserva } from "./SectionTabs";
import PlanesAdicionales from "./AdditionalPlans";
import FormDatosPersonales from "./PersonalDataForm";
import { AlertModal } from "../../../components/ui/AlertModal";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";

interface Props {
  vehiculo: Vehiculo;
}

export default function FlujoReserva({ vehiculo }: Props) {
  const insets = useSafeAreaInsets();
  const c = useTemaColores();
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);

  const fechasLugar = useReservaStore((s) => s.fechasLugar);
  const planes = useReservaStore((s) => s.planes);
  const limpiarReserva = useReservaStore((s) => s.limpiarReserva);

  const [seccionActiva, setSeccionActiva] = useState<SeccionReserva>("fechas");
  const [modalResumenVisible, setModalResumenVisible] = useState(false);
  const [alertaFaltantesVisible, setAlertaFaltantesVisible] = useState(false);

  // "Alcanzada alguna vez" — una vez true, nunca vuelve a false, aunque
  // el usuario regrese a un tab anterior. Esto es lo que usa el modal
  // de Resumen para decidir qué tarjetas mostrar (revelado progresivo).
  const [seccionesAlcanzadas, setSeccionesAlcanzadas] = useState<Record<SeccionReserva, boolean>>({
    fechas: true,
    planes: false,
    datos: false,
  });

  // Auto-scroll al inicio de la página cada vez que cambia de sección
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [seccionActiva]);

  const puedeContinuarAPlanes =
    !!fechasLugar.fechaRetiro && !!fechasLugar.fechaDevolucion && !!fechasLugar.metodoPago;

  const puedeContinuarADatos = !!planes.proteccion && !!planes.tipoKilometraje;

  // Los tabs solo se bloquean HACIA ADELANTE. Nunca se bloquea el
  // regreso a un tab ya visitado, aunque luego cambien datos ahí.
  const tabsDeshabilitados: SeccionReserva[] = [
    ...(!puedeContinuarAPlanes ? (["planes", "datos"] as SeccionReserva[]) : []),
    ...(puedeContinuarAPlanes && !puedeContinuarADatos ? (["datos"] as SeccionReserva[]) : []),
  ];

  const irASeccion = (seccion: SeccionReserva) => {
    setSeccionActiva(seccion);
    setSeccionesAlcanzadas((prev) => (prev[seccion] ? prev : { ...prev, [seccion]: true }));
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleVolver = () => {
    limpiarReserva();
    router.back();
  };

  // Botón del tab "fechas": si falta info, muestra alerta; si no, pasa al tab "planes".
  const handleVerPlanes = () => {
    if (puedeContinuarAPlanes) {
      irASeccion("planes");
      return;
    }
    setAlertaFaltantesVisible(true);
  };

  // Se dispara cuando en "planes" ya se eligió protección + kilometraje.
  const handleIrADatosPersonales = () => {
    irASeccion("datos");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.bg }]}>
      <View style={[styles.topRow, { backgroundColor: c.bgCard }]}>
        <TouchableOpacity onPress={handleVolver} style={styles.volverBtn}>
          <Ionicons name="chevron-back" size={16} color={c.primary} />
          <Text style={[styles.volverText, { color: c.primary }]}>{t("reserva.flujo.volver")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.resumenBtn, { borderColor: c.primary, backgroundColor: c.bgCard }]} onPress={() => setModalResumenVisible(true)}>
          <Text style={[styles.resumenBtnText, { color: c.primary }]}>{t("reserva.flujo.resumenReserva")}</Text>
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={GRADIENTES.panel.colors}
        start={GRADIENTES.panel.start}
        end={GRADIENTES.panel.end}
        style={styles.headerAzul}
      >
        <Text style={styles.headerTitulo}>{t("reserva.flujo.reservarAhora")}</Text>
        <View style={styles.tabsWrapper}>
          <TabsSeccion
            seccionActiva={seccionActiva}
            onCambiarSeccion={irASeccion}
            tabsDeshabilitados={tabsDeshabilitados}
            secciones={[
              { id: "fechas", label: t("reserva.flujo.tabFechas") },
              { id: "planes", label: t("reserva.flujo.tabPlanes") },
              { id: "datos", label: t("reserva.flujo.tabDatos") },
            ]}
          />
        </View>
      </LinearGradient>

      <View style={styles.scrollClip}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {seccionActiva === "fechas" && (
            <>
              <VehiculoResumenCard vehiculo={vehiculo} />

              <View style={[styles.separadorTarjetas, { backgroundColor: c.border }]} />

              <FormFechasLugar vehiculo={vehiculo} />

              <TouchableOpacity style={styles.continuarBtnWrap} onPress={handleVerPlanes} activeOpacity={0.85}>
                <LinearGradient
                  colors={GRADIENTES.boton.colors}
                  start={GRADIENTES.boton.start}
                  end={GRADIENTES.boton.end}
                  style={styles.continuarBtn}
                >
                  <Text style={styles.continuarBtnText}>{t("reserva.flujo.continuar")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {seccionActiva === "planes" && (
            <PlanesAdicionales vehiculo={vehiculo} onContinuar={handleIrADatosPersonales} />
          )}

          {seccionActiva === "datos" && <FormDatosPersonales vehiculo={vehiculo} />}
        </ScrollView>
      </View>

      <ResumenReservaModal
  visible={modalResumenVisible}
  vehiculo={vehiculo}
  mostrarPlanes={seccionesAlcanzadas.planes}
  seccionFechasCompleta={puedeContinuarAPlanes}
  onCerrar={() => setModalResumenVisible(false)}
/>

      <AlertModal
        visible={alertaFaltantesVisible}
        icono="alert-circle-outline"
        titulo={t("reserva.flujo.alertaFaltantesTitulo")}
        mensaje={t("reserva.flujo.alertaFaltantesMensaje")}
        botones={[]}
        onCerrar={() => setAlertaFaltantesVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORES.pageBg },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORES.panelBg,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  volverBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  volverText: { fontSize: 13, fontWeight: "600", color: COLOR_MARCA },
  resumenBtn: {
    borderWidth: 1.5,
    borderColor: COLOR_MARCA,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  resumenBtnText: { fontSize: 12, fontWeight: "700", color: COLOR_MARCA },
  headerAzul: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    zIndex: 10,
    elevation: 10,
  },
  headerTitulo: { fontSize: 19, fontWeight: "800", color: "#FFFFFF", marginBottom: 12, textAlign: "center" },
  tabsWrapper: {},

  scrollClip: { flex: 1, overflow: "hidden" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, flexGrow: 1 },

  separadorTarjetas: {
    height: 1,
    width: "100%",
    marginVertical: 16,
  },
  seccionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORES.textMuted,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  continuarBtnWrap: {
    alignSelf: "center",
    borderRadius: 8,
    marginTop: 16,
  },
  continuarBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  continuarBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },

  placeholderWrap: {
    flex: 1,
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { fontSize: 16, color: "#6B7280" },
});