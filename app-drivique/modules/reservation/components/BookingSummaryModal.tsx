// modules/reservation/components/BookingSummaryModal.tsx
import React, { useMemo } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Vehiculo } from "@/modules/catalog/types/catalog.types";
import { useReservaStore } from "@/store/reservationStore";
import { GRADIENTES } from "@/constants/gradients";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import {
  COLOR_MARCA,
  PORCENTAJE_CARGOS_ADMINISTRATIVOS,
  PORCENTAJE_IVA,
} from "../constants/reservation.constants";
import { fmt, fmtPct, diasEntre } from "./BookingSummaryModal.pieces";
import { useMonedaStore } from "@/store/currencyStore";

interface Props {
  visible: boolean;
  vehiculo: Vehiculo;
  onCerrar: () => void;
  mostrarPlanes?: boolean;
  seccionFechasCompleta?: boolean;
}

export default function ResumenReservaModal({
  visible,
  vehiculo,
  onCerrar,
}: Props) {
  const insets = useSafeAreaInsets();
  useMonedaStore();
  const c = useTemaColores();
  const { t, i18n } = useTranslation();

  const fechasLugar = useReservaStore((s) => s.fechasLugar);
  const planes = useReservaStore((s) => s.planes);
  const datosPersonales = useReservaStore((s) => s.datosPersonales);
  const cuponAplicado = useReservaStore((s) => s.cuponAplicado);

  const primaryAccent = c.oscuro ? "#60A5FA" : COLOR_MARCA;

  const formatFechaResumen = (fechaStr: string | null | undefined): string => {
    if (!fechaStr) return t("reserva.resumen.fechaNoSeleccionada", { defaultValue: "Fecha no seleccionada" });
    try {
      const partes = fechaStr.split("-");
      if (partes.length !== 3) return fechaStr;
      const y = parseInt(partes[0], 10);
      const m = parseInt(partes[1], 10);
      const d = parseInt(partes[2], 10);
      if (isNaN(y) || isNaN(m) || isNaN(d)) return fechaStr;

      const mesesEs = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
      const mesesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
      const mesesPt = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      const mesesFr = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];

      const lang = i18n.language || "es";
      const listaMeses = lang.startsWith("en") ? mesesEn : lang.startsWith("pt") || lang.startsWith("br") ? mesesPt : lang.startsWith("fr") ? mesesFr : mesesEs;
      const mesTexto = listaMeses[m - 1] || "";
      return `${d} ${mesTexto} ${y}`;
    } catch {
      return fechaStr;
    }
  };

  const getLugarLabel = (lugar: string | undefined | null, modo: "entrega" | "devolucion"): string => {
    if (!lugar || lugar.trim() === "") {
      return t("reserva.resumen.noSeleccionado", { defaultValue: "No seleccionado" });
    }
    if (lugar === "domicilio") {
      return t(modo === "entrega" ? "reserva.fechasLugar.entregaDomicilio" : "reserva.fechasLugar.devolucionDomicilio", {
        defaultValue: modo === "entrega" ? "Entrega a domicilio" : "Devolución a domicilio",
      });
    }
    if (lugar === "aeropuerto") {
      return t(modo === "entrega" ? "reserva.fechasLugar.entregaAeropuerto" : "reserva.fechasLugar.devolucionAeropuerto", {
        defaultValue: modo === "entrega" ? "Entrega en aeropuerto" : "Devolución en aeropuerto",
      });
    }
    if (lugar === "terminal") {
      return t(modo === "entrega" ? "reserva.fechasLugar.entregaTerminal" : "reserva.fechasLugar.devolucionTerminal", {
        defaultValue: modo === "entrega" ? "Entrega en terminal" : "Devolución en terminal",
      });
    }
    return lugar;
  };

  const seguros = vehiculo.seguros ?? [];
  const kmLimitado = vehiculo.tarifas?.kmLimitado;
  const kmIlimitado = vehiculo.tarifas?.kmIlimitado;
  const servicios = vehiculo.servicios ?? [];

  const seguroElegido = useMemo(
    () => seguros.find((s) => s.nombre === planes.proteccion) ?? null,
    [seguros, planes.proteccion]
  );
  const kmElegido =
    planes.tipoKilometraje === "limitado"
      ? kmLimitado
      : planes.tipoKilometraje === "ilimitado"
      ? kmIlimitado
      : null;

  const labelKm =
    planes.tipoKilometraje === "limitado"
      ? t("reserva.planes.limitado", { defaultValue: "Limitado" })
      : planes.tipoKilometraje === "ilimitado"
      ? t("reserva.planes.ilimitado", { defaultValue: "Ilimitado" })
      : t("reserva.resumen.noSeleccionado", { defaultValue: "No seleccionado" });

  const proteccionTexto = planes.proteccion
    ? t(`reserva.planes.nombreSeguro.${planes.proteccion}`, { defaultValue: planes.proteccion })
    : t("reserva.resumen.ningunaSeleccionada", { defaultValue: "Ninguna seleccionada" });

  const serviciosTexto =
    planes.serviciosSeleccionados && planes.serviciosSeleccionados.length > 0
      ? planes.serviciosSeleccionados
          .map((n) => t(`reserva.planes.nombreServicio.${n}`, { defaultValue: n }))
          .join(", ")
      : t("reserva.resumen.ningunaSeleccionada", { defaultValue: "Ninguna seleccionada" });

  const desglose = useMemo(() => {
    const diasCalc = diasEntre(fechasLugar.fechaRetiro, fechasLugar.fechaDevolucion);
    const dias = diasCalc > 0 ? diasCalc : 1;
    const diarias = vehiculo.precio * dias;
    const proteccion = seguroElegido ? seguroElegido.precio * dias : 0;
    const kilometraje = kmElegido ? kmElegido.precio * dias : 0;
    const servAdic = servicios
      .filter((s) => planes.serviciosSeleccionados.includes(s.nombre))
      .reduce((a, s) => a + s.precio * dias, 0);

    const subtotalBase = diarias + proteccion + kilometraje + servAdic;
    const cargos = Math.round(subtotalBase * PORCENTAJE_CARGOS_ADMINISTRATIVOS);
    const subtotalBruto = subtotalBase + cargos;

    let descuentoCupon = 0;
    if (cuponAplicado) {
      if (cuponAplicado.descuentoPorcentaje) {
        descuentoCupon = Math.round(subtotalBruto * (cuponAplicado.descuentoPorcentaje / 100));
      } else if (cuponAplicado.descuentoFijo) {
        descuentoCupon = cuponAplicado.descuentoFijo;
      }
    }

    const subtotal = Math.max(subtotalBruto - descuentoCupon, 0);
    const iva = Math.round(subtotal * PORCENTAJE_IVA);
    return {
      dias,
      diasCalc,
      diarias,
      proteccion,
      kilometraje,
      servAdic,
      cargos,
      subtotalBruto,
      descuentoCupon,
      subtotal,
      iva,
      total: subtotal + iva,
    };
  }, [
    vehiculo.precio,
    fechasLugar.fechaRetiro,
    fechasLugar.fechaDevolucion,
    seguroElegido,
    kmElegido,
    servicios,
    planes.serviciosSeleccionados,
    cuponAplicado,
  ]);

  const tieneDatosPersonales =
    !!datosPersonales.nombreCompleto ||
    !!datosPersonales.numeroDocumento ||
    !!datosPersonales.correo ||
    !!datosPersonales.celular;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar} presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top || 16 }]}>
        {/* Header Modal */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <LinearGradient
              colors={GRADIENTES.boton.colors}
              start={GRADIENTES.boton.start}
              end={GRADIENTES.boton.end}
              style={styles.badgeIcon}
            >
              <Ionicons name="document-text" size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.headerTitulo, { color: c.textPrimary }]}>
              {t("reserva.resumen.titulo", { defaultValue: "Resumen de tu Reserva" })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onCerrar}
            hitSlop={10}
            style={[styles.closeBtn, { backgroundColor: c.oscuro ? c.bgInput : "#F1F5F9", borderColor: c.border }]}
          >
            <Ionicons name="close" size={16} color={c.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.cardMaestra, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            {/* Banner Superior Azul Degradado */}
            <LinearGradient
              colors={GRADIENTES.boton.colors}
              start={GRADIENTES.boton.start}
              end={GRADIENTES.boton.end}
              style={styles.vehiculoBanner}
            >
              <Text style={styles.vehiculoBannerLabel}>
                {t("reserva.resumen.subtitulo", { defaultValue: "Resumen de tu reserva" })}
              </Text>
              <Text style={styles.vehiculoBannerNombre}>{vehiculo.nombre}</Text>
            </LinearGradient>

            {/* SECCIÓN 1: FECHAS Y LUGARES */}
            <View style={styles.seccionCard}>
              <Text style={[styles.seccionTituloAzul, { color: primaryAccent }]}>
                {t("reserva.resumen.fechasYLugares", { defaultValue: "FECHAS Y LUGARES" })}
              </Text>

              {/* LUGAR DE ENTREGA */}
              <View style={styles.bloqueDato}>
                <Text style={[styles.sublabel, { color: c.textMuted }]}>
                  {t("reserva.resumen.lugarDeEntrega", { defaultValue: "LUGAR DE ENTREGA" })}
                </Text>
                <Text style={[styles.valorPrincipal, { color: c.textPrimary }]}>
                  {formatFechaResumen(fechasLugar.fechaRetiro)}
                </Text>
                <Text style={[styles.valorSecundario, { color: c.textMuted }]}>
                  {fechasLugar.horaRetiro ? fechasLugar.horaRetiro : "--:--"}
                </Text>
                <Text style={[styles.valorUbicacion, { color: c.textPrimary }]}>
                  {getLugarLabel(fechasLugar.lugarRetiro, "entrega")}
                </Text>
              </View>

              {/* Divisor Punteado */}
              <View style={[styles.divisorPunteado, { borderColor: c.oscuro ? "#334155" : "#E2E8F0" }]} />

              {/* LUGAR DE DEVOLUCIÓN */}
              <View style={styles.bloqueDato}>
                <Text style={[styles.sublabel, { color: c.textMuted }]}>
                  {t("reserva.resumen.lugarDeDevolucion", { defaultValue: "LUGAR DE DEVOLUCIÓN" })}
                </Text>
                <Text style={[styles.valorPrincipal, { color: c.textPrimary }]}>
                  {formatFechaResumen(fechasLugar.fechaDevolucion)}
                </Text>
                <Text style={[styles.valorSecundario, { color: c.textMuted }]}>
                  {fechasLugar.horaDevolucion ? fechasLugar.horaDevolucion : "--:--"}
                </Text>
                <Text style={[styles.valorUbicacion, { color: c.textPrimary }]}>
                  {getLugarLabel(fechasLugar.lugarDevolucion, "devolucion")}
                </Text>
              </View>
            </View>

            {/* Divisor Sólido */}
            <View style={[styles.divisorSolido, { backgroundColor: c.border }]} />

            {/* SECCIÓN 2: TU PROTECCIÓN Y EXTRAS */}
            <View style={styles.seccionCard}>
              <Text style={[styles.seccionTituloAzul, { color: primaryAccent }]}>
                {t("reserva.resumen.tuProteccionYExtras", { defaultValue: "TU PROTECCIÓN Y EXTRAS" })}
              </Text>

              {/* PROTECCIONES */}
              <View style={styles.bloqueDato}>
                <Text style={[styles.sublabel, { color: c.textMuted }]}>
                  {t("reserva.resumen.protecciones", { defaultValue: "PROTECCIONES" })}
                </Text>
                <Text style={[styles.valorPrincipal, { color: c.textPrimary }]}>{proteccionTexto}</Text>
              </View>

              {/* TIPO DE KILOMETRAJE */}
              <View style={[styles.bloqueDato, { marginTop: 12 }]}>
                <Text style={[styles.sublabel, { color: c.textMuted }]}>
                  {t("reserva.resumen.tipoDeKilometrajeMayus", { defaultValue: "TIPO DE KILOMETRAJE" })}
                </Text>
                <Text style={[styles.valorPrincipal, { color: c.textPrimary }]}>{labelKm}</Text>
              </View>

              {/* SERVICIOS ADICIONALES */}
              <View style={[styles.bloqueDato, { marginTop: 12 }]}>
                <Text style={[styles.sublabel, { color: c.textMuted }]}>
                  {t("reserva.resumen.serviciosAdicionalesMayus", { defaultValue: "SERVICIOS ADICIONALES" })}
                </Text>
                <Text style={[styles.valorServicios, { color: planes.serviciosSeleccionados.length > 0 ? c.textPrimary : c.textSecondary }]}>
                  {serviciosTexto}
                </Text>
              </View>
            </View>

            {/* SECCIÓN 3: DATOS PERSONALES (SI EXISTEN / ALCANZADO FLUJO 3) */}
            {tieneDatosPersonales && (
              <>
                <View style={[styles.divisorSolido, { backgroundColor: c.border }]} />
                <View style={styles.seccionCard}>
                  <Text style={[styles.seccionTituloAzul, { color: primaryAccent }]}>
                    {t("reserva.resumen.datosPersonales", { defaultValue: "DATOS PERSONALES" })}
                  </Text>

                  {/* CONDUCTOR PRINCIPAL */}
                  <View style={styles.bloqueDato}>
                    <Text style={[styles.sublabel, { color: c.textMuted }]}>
                      {t("reserva.resumen.conductorPrincipal", { defaultValue: "CONDUCTOR PRINCIPAL" })}
                    </Text>
                    <Text style={[styles.valorPrincipal, { color: c.textPrimary }]}>
                      {datosPersonales.nombreCompleto || t("reserva.resumen.noProporcionado", { defaultValue: "No proporcionado" })}
                    </Text>
                  </View>

                  {/* DOCUMENTO */}
                  <View style={[styles.bloqueDato, { marginTop: 12 }]}>
                    <Text style={[styles.sublabel, { color: c.textMuted }]}>
                      {t("reserva.resumen.documento", { defaultValue: "DOCUMENTO" })}
                    </Text>
                    <Text style={[styles.valorPrincipal, { color: c.textPrimary }]}>
                      {datosPersonales.numeroDocumento
                        ? `${datosPersonales.tipoDocumento || ""} ${datosPersonales.numeroDocumento}`.trim()
                        : t("reserva.resumen.noProporcionado", { defaultValue: "No proporcionado" })}
                    </Text>
                  </View>

                  {/* CONTACTO */}
                  <View style={[styles.bloqueDato, { marginTop: 12 }]}>
                    <Text style={[styles.sublabel, { color: c.textMuted }]}>
                      {t("reserva.resumen.contacto", { defaultValue: "CONTACTO" })}
                    </Text>
                    <Text style={[styles.valorPrincipal, { color: c.textPrimary }]}>
                      {datosPersonales.correo || datosPersonales.celular
                        ? `${datosPersonales.correo || ""}${datosPersonales.correo && datosPersonales.celular ? " · " : ""}${datosPersonales.celular || ""}`.trim()
                        : t("reserva.resumen.noProporcionado", { defaultValue: "No proporcionado" })}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* SECCIÓN: DESGLOSE DE TARIFA */}
            <View style={[styles.divisorSolido, { backgroundColor: c.border }]} />
            <View style={styles.seccionCard}>
              <Text style={[styles.desgloseTitulo, { color: c.textPrimary }]}>
                {t("reserva.resumen.desgloseDeTarifa", { defaultValue: "DESGLOSE DE TARIFA" })}
              </Text>

              {/* Fila 1: Tarifa Base de Alquiler */}
              <View style={styles.filaDesglose}>
                <Text style={[styles.filaDesgloseLabel, { color: c.textSecondary }]}>
                  {t("reserva.resumen.diarias", { defaultValue: "Diarias de alquiler" })}
                  {desglose.diasCalc > 1 ? ` (${desglose.dias} días)` : ""}
                </Text>
                <Text style={[styles.filaDesgloseValor, { color: c.textPrimary }]}>
                  {fmt(desglose.diarias)}
                </Text>
              </View>

              {/* Fila 2: Kilometraje (si se seleccionó en flujo 2, o dash si no) */}
              <View style={styles.filaDesglose}>
                <Text style={[styles.filaDesgloseLabel, { color: c.textSecondary }]}>
                  {planes.tipoKilometraje
                    ? (planes.tipoKilometraje === "ilimitado"
                        ? t("reserva.planes.kmIlimitadoTitulo", { defaultValue: "Kilometraje ilimitado" })
                        : t("reserva.planes.kmLimitadoTitulo", { defaultValue: "Kilometraje limitado" }))
                    : t("reserva.resumen.kilometraje", { defaultValue: "Kilometraje" })}
                </Text>
                <Text style={[styles.filaDesgloseValor, { color: c.textPrimary }]}>
                  {planes.tipoKilometraje
                    ? (desglose.kilometraje > 0
                        ? fmt(desglose.kilometraje)
                        : t("reserva.resumen.incluido", { defaultValue: "Incluido" }))
                    : "-"}
                </Text>
              </View>

              {/* Fila 3: Protección (si se seleccionó en flujo 2, o dash si no) */}
              <View style={styles.filaDesglose}>
                <Text style={[styles.filaDesgloseLabel, { color: c.textSecondary }]}>
                  {seguroElegido
                    ? t(`reserva.planes.nombreSeguro.${planes.proteccion}`, { defaultValue: planes.proteccion })
                    : t("reserva.resumen.protecciones", { defaultValue: "Protecciones" })}
                </Text>
                <Text style={[styles.filaDesgloseValor, { color: c.textPrimary }]}>
                  {seguroElegido ? fmt(desglose.proteccion) : "-"}
                </Text>
              </View>

              {/* Fila 4: Servicios adicionales (si se seleccionaron en flujo 2, o dash si no) */}
              <View style={styles.filaDesglose}>
                <Text style={[styles.filaDesgloseLabel, { color: c.textSecondary }]}>
                  {planes.serviciosSeleccionados.length > 0
                    ? serviciosTexto
                    : t("reserva.resumen.serviciosAdicionalesMayus", { defaultValue: "Servicios adicionales" })}
                </Text>
                <Text style={[styles.filaDesgloseValor, { color: c.textPrimary }]}>
                  {desglose.servAdic > 0 ? fmt(desglose.servAdic) : "—"}
                </Text>
              </View>

              {/* Fila 5: Cargos administrativos */}
              <View style={styles.filaDesglose}>
                <Text style={[styles.filaDesgloseLabel, { color: c.textSecondary }]}>
                  {t("reserva.resumen.cargosAdministrativos", {
                    pct: fmtPct(PORCENTAJE_CARGOS_ADMINISTRATIVOS),
                    defaultValue: `Cargos administrativos (${fmtPct(PORCENTAJE_CARGOS_ADMINISTRATIVOS)})`,
                  })}
                </Text>
                <Text style={[styles.filaDesgloseValor, { color: c.textPrimary }]}>
                  {fmt(desglose.cargos)}
                </Text>
              </View>

              {/* Divisor fino */}
              <View style={[styles.divisorFino, { backgroundColor: c.border }]} />

              {/* Fila 6: IVA */}
              <View style={styles.filaDesglose}>
                <Text style={[styles.filaDesgloseLabel, { color: c.textSecondary }]}>
                  {t("reserva.resumen.iva", {
                    pct: fmtPct(PORCENTAJE_IVA),
                    defaultValue: `IVA (${fmtPct(PORCENTAJE_IVA)})`,
                  })}
                </Text>
                <Text style={[styles.filaDesgloseValor, { color: c.textPrimary }]}>
                  {fmt(desglose.iva)}
                </Text>
              </View>

              {/* Descuento Cupón si aplica */}
              {desglose.descuentoCupon > 0 && cuponAplicado && (
                <View style={styles.filaDesglose}>
                  <Text style={[styles.filaDesgloseLabel, { color: "#16A34A" }]}>
                    {`Descuento (${cuponAplicado.codigo})`}
                  </Text>
                  <Text style={[styles.filaDesgloseValor, { color: "#16A34A" }]}>
                    {`-${fmt(desglose.descuentoCupon)}`}
                  </Text>
                </View>
              )}

              {/* Card Total Final */}
              <View
                style={[
                  styles.totalBoxCard,
                  {
                    backgroundColor: c.oscuro ? c.bgInput : "#F8FAFC",
                    borderColor: c.oscuro ? "#334155" : "#E2E8F0",
                  },
                ]}
              >
                <Text style={[styles.totalFinalLabel, { color: primaryAccent }]}>
                  {t("reserva.resumen.totalFinal", { defaultValue: "TOTAL FINAL" })}
                </Text>
                <Text style={[styles.totalFinalValor, { color: c.textPrimary }]}>{fmt(desglose.total)}</Text>
                <Text style={[styles.totalFinalSub, { color: c.textMuted }]}>
                  {t("reserva.resumen.elTotalFinalIncluye", {
                    defaultValue: "El total final incluye IVA y cargos adicionales",
                  })}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer con Botón Cerrar */}
        <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.bg, paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={styles.cerrarBtnWrap} onPress={onCerrar} activeOpacity={0.85}>
            <LinearGradient
              colors={GRADIENTES.boton.colors}
              start={GRADIENTES.boton.start}
              end={GRADIENTES.boton.end}
              style={styles.cerrarBtn}
            >
              <Text style={styles.cerrarBtnText}>
                {t("reserva.resumen.cerrar", { defaultValue: "Cerrar" })}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 6,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  badgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTitulo: {
    fontSize: 16,
    fontWeight: "800",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  cardMaestra: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  vehiculoBanner: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  vehiculoBannerLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.88)",
  },
  vehiculoBannerNombre: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 3,
  },

  seccionCard: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  seccionTituloAzul: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  bloqueDato: {
    marginBottom: 2,
  },
  sublabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  valorPrincipal: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  valorSecundario: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  valorUbicacion: {
    fontSize: 13.5,
    fontWeight: "800",
    marginTop: 6,
  },
  valorServicios: {
    fontSize: 12.5,
    fontWeight: "500",
  },

  divisorPunteado: {
    borderBottomWidth: 1,
    borderStyle: "dashed",
    marginVertical: 12,
  },
  divisorSolido: {
    height: 1,
  },
  divisorFino: {
    height: 1,
    marginVertical: 10,
  },

  desgloseTitulo: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 14,
  },
  filaDesglose: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 5,
  },
  filaDesgloseLabel: {
    fontSize: 12.5,
    fontWeight: "500",
  },
  filaDesgloseValor: {
    fontSize: 13,
    fontWeight: "800",
  },

  totalBoxCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 14,
  },
  totalFinalLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  totalFinalValor: {
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
  },
  totalFinalSub: {
    fontSize: 11,
    marginTop: 4,
  },

  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cerrarBtnWrap: {
    borderRadius: 12,
    overflow: "hidden",
  },
  cerrarBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cerrarBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});