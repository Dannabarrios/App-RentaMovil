import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Vehiculo } from "@/modules/catalog/types/catalog.types";
import { useReservaStore } from "@/store/reservationStore";
import { GRADIENTES } from "@/constants/gradients";
import {
  COLOR_MARCA,
  ICONOS_SERVICIOS,
  ICONO_SERVICIO_DEFECTO,
} from "../constants/reservation.constants";
import { useMonedaStore } from "@/store/currencyStore";
import { formatCurrency } from "@/utils/currencyUtils";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import { diasEntre } from "./BookingSummaryModal.pieces";

interface Props {
  vehiculo: Vehiculo;
  onGuardar: () => void;
  onCancelar: () => void;
}

function formatPrecio(precio: number): string {
  const { monedaActual, tasaUSD } = useMonedaStore.getState();
  return formatCurrency(precio, monedaActual, tasaUSD);
}

export default function EditAdditionalServicesSection({
  vehiculo,
  onGuardar,
  onCancelar,
}: Props) {
  useMonedaStore();
  const c = useTemaColores();
  const { t } = useTranslation();

  const storeServicios = useReservaStore((s) => s.planes.serviciosSeleccionados);
  const fechasLugar = useReservaStore((s) => s.fechasLugar);
  const actualizarPlanes = useReservaStore((s) => s.actualizarPlanes);

  // Borrador local de servicios seleccionados
  const [draftServicios, setDraftServicios] = useState<string[]>([...storeServicios]);

  const primaryAccent = c.oscuro ? "#60A5FA" : COLOR_MARCA;
  const todosLosServicios = vehiculo.servicios ?? [];

  const dias = useMemo(() => {
    const d = diasEntre(fechasLugar.fechaRetiro, fechasLugar.fechaDevolucion);
    return d > 0 ? d : 1;
  }, [fechasLugar.fechaRetiro, fechasLugar.fechaDevolucion]);

  const totalServicios = useMemo(() => {
    return todosLosServicios
      .filter((s) => draftServicios.includes(s.nombre))
      .reduce((acc, s) => acc + s.precio * dias, 0);
  }, [todosLosServicios, draftServicios, dias]);

  const toggleServicio = (nombre: string) => {
    setDraftServicios((prev) =>
      prev.includes(nombre) ? prev.filter((item) => item !== nombre) : [...prev, nombre]
    );
  };

  const handleGuardar = () => {
    actualizarPlanes({
      serviciosSeleccionados: draftServicios,
    });
    onGuardar();
  };

  return (
    <View style={styles.container}>
      {/* Header con degradado azul corporativo */}
      <LinearGradient
        colors={GRADIENTES.boton.colors}
        start={GRADIENTES.boton.start}
        end={GRADIENTES.boton.end}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitulo}>
          {t("reserva.edicion.editarServiciosAdicionales", {
            defaultValue: "Editar Servicios Adicionales",
          })}
        </Text>
        <TouchableOpacity onPress={onCancelar} hitSlop={10}>
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {todosLosServicios.length > 0 ? (
          <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            {/* Header de la tarjeta */}
            <View style={styles.cardHeaderFila}>
              <Ionicons name="sparkles-outline" size={14} color={primaryAccent} />
              <Text style={[styles.cardHeaderTitulo, { color: primaryAccent }]}>
                {t("reserva.planes.serviciosAdicionales", { defaultValue: "Servicios adicionales" })}
              </Text>
            </View>

            {/* Lista de servicios */}
            {todosLosServicios.map((servicio) => {
              const seleccionado = draftServicios.includes(servicio.nombre);
              const icono = ICONOS_SERVICIOS[servicio.nombre] ?? ICONO_SERVICIO_DEFECTO;

              return (
                <TouchableOpacity
                  key={servicio.nombre}
                  style={[
                    styles.servicioCard,
                    {
                      borderColor: c.border,
                      backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF",
                    },
                    seleccionado && [
                      styles.servicioCardActiva,
                      {
                        borderColor: primaryAccent,
                        backgroundColor: c.oscuro ? c.primaryBg : "#F0F7FF",
                      },
                    ],
                  ]}
                  onPress={() => toggleServicio(servicio.nombre)}
                  activeOpacity={0.8}
                >
                  <View style={styles.servicioIzquierdaRow}>
                    <Ionicons
                      name={seleccionado ? "checkbox" : "square-outline"}
                      size={16}
                      color={seleccionado ? primaryAccent : "#94A3B8"}
                    />
                    <Ionicons
                      name={icono as any}
                      size={14}
                      color={seleccionado ? primaryAccent : "#64748B"}
                      style={{ marginLeft: 8, marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.servicioNombre,
                        { color: c.textPrimary },
                        seleccionado && { fontWeight: "700" },
                      ]}
                      numberOfLines={2}
                    >
                      {t(`reserva.planes.nombreServicio.${servicio.nombre}`, { defaultValue: servicio.nombre })}
                    </Text>
                  </View>

                  {servicio.precio > 0 ? (
                    <View style={styles.servicioPrecioRow}>
                      <Text style={[styles.servicioPrecioValor, { color: primaryAccent }]}>
                        {formatPrecio(servicio.precio)}
                      </Text>
                      <Text style={[styles.servicioPrecioUnidad, { color: c.textMuted }]}>
                        {t("reserva.planes.porDia", { defaultValue: "/ día" })}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.servicioPrecioGratis, { color: "#16a34a" }]}>
                      {t("reserva.planes.gratis", { defaultValue: "Gratis" })}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Footer de Total de Servicios Adicionales */}
            <View style={[styles.footerTotalTarjeta, { borderTopColor: c.border }]}>
              <Text style={[styles.footerTotalLabel, { color: c.textSecondary }]}>
                {t("reserva.planes.totalServiciosAdicionales", {
                  dias,
                  unidad:
                    dias === 1
                      ? t("reserva.planes.dia", { defaultValue: "día" })
                      : t("reserva.planes.dias", { defaultValue: "días" }),
                  defaultValue: `Total servicios adicionales (${dias} ${dias === 1 ? "día" : "días"})`,
                })}
              </Text>
              <Text style={[styles.footerTotalValor, { color: primaryAccent }]}>
                {formatPrecio(totalServicios)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border, alignItems: "center", paddingVertical: 24 }]}>
            <Text style={{ color: c.textMuted, fontSize: 13 }}>
              {t("reserva.planes.sinServiciosDisponibles", { defaultValue: "No hay servicios adicionales para este vehículo." })}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Botones Footer: Cancelar y Guardar cambios */}
      <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.bg }]}>
        <TouchableOpacity
          style={[
            styles.cancelarBtn,
            { borderColor: c.border, backgroundColor: c.oscuro ? c.bgCard : "#FFFFFF" },
          ]}
          onPress={onCancelar}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelarBtnTexto, { color: c.textPrimary }]}>
            {t("comun.cancelar", { defaultValue: "Cancelar" })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.guardarBtnWrap} onPress={handleGuardar} activeOpacity={0.85}>
          <LinearGradient
            colors={GRADIENTES.boton.colors}
            start={GRADIENTES.boton.start}
            end={GRADIENTES.boton.end}
            style={styles.guardarBtn}
          >
            <Text style={styles.guardarBtnTexto}>
              {t("reserva.edicion.guardarCambios", { defaultValue: "Guardar cambios" })}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerTitulo: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardHeaderFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    marginTop: 2,
  },
  cardHeaderTitulo: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  servicioCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  servicioCardActiva: {
    borderWidth: 1.2,
  },
  servicioIzquierdaRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  servicioNombre: {
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
  servicioPrecioRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  servicioPrecioValor: {
    fontSize: 12,
    fontWeight: "800",
  },
  servicioPrecioUnidad: {
    fontSize: 10,
    fontWeight: "500",
    marginLeft: 3,
    marginBottom: 1,
  },
  servicioPrecioGratis: {
    fontSize: 12,
    fontWeight: "800",
  },
  footerTotalTarjeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerTotalLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  footerTotalValor: {
    fontSize: 15,
    fontWeight: "800",
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    flexDirection: "row",
    gap: 12,
  },
  cancelarBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelarBtnTexto: {
    fontSize: 14,
    fontWeight: "700",
  },
  guardarBtnWrap: {
    flex: 1.5,
    borderRadius: 12,
    overflow: "hidden",
  },
  guardarBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  guardarBtnTexto: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
