import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Vehiculo } from "@/modules/catalog/types/catalog.types";
import { useReservaStore } from "@/store/reservationStore";
import { GRADIENTES } from "@/constants/gradients";
import {
  getBeneficiosProteccion,
  getBeneficiosKilometraje,
  COLOR_MARCA,
  ICONOS_SERVICIOS,
  ICONO_SERVICIO_DEFECTO,
} from "../constants/reservation.constants";
import { AlertModal } from "../../../components/ui/AlertModal";
import { useMonedaStore } from "@/store/currencyStore";
import { formatCurrency } from "@/utils/currencyUtils";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";

type Tema = ReturnType<typeof useTemaColores>;

interface Props {
  vehiculo: Vehiculo;
  onContinuar?: () => void;
}

function formatPrecio(precio: number): string {
  const { monedaActual, tasaUSD } = useMonedaStore.getState();
  return formatCurrency(precio, monedaActual, tasaUSD);
}

function calcularDias(fechaRetiro: string | null, fechaDevolucion: string | null): number {
  if (!fechaRetiro || !fechaDevolucion) return 1;
  const inicio = new Date(fechaRetiro);
  const fin = new Date(fechaDevolucion);
  const diffMs = fin.getTime() - inicio.getTime();
  const dias = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return dias > 0 ? dias : 1;
}

function IconoBeneficio({ tipo }: { tipo: "check" | "warning" | "cross" }) {
  if (tipo === "check") return <Ionicons name="checkmark" size={15} color="#16a34a" />;
  if (tipo === "warning") return <Ionicons name="warning-outline" size={15} color="#f59e0b" />;
  return <Ionicons name="close" size={15} color="#94a3b8" />;
}

function ListaBeneficios({
  beneficios,
  c,
}: {
  beneficios: { tipo: "check" | "warning" | "cross"; texto: string }[];
  c: Tema;
}) {
  if (beneficios.length === 0) return null;
  return (
    <View style={styles.beneficiosLista}>
      {beneficios.map((b, i) => (
        <View key={i} style={styles.beneficioFila}>
          <IconoBeneficio tipo={b.tipo} />
          <Text
            style={[
              styles.beneficioTexto,
              { color: c.textSecondary },
              b.tipo === "cross" && [styles.beneficioTextoTachado, { color: c.textMuted }],
            ]}
          >
            {b.texto}
          </Text>
        </View>
      ))}
    </View>
  );
}

function FooterTotalTarjeta({
  label,
  valor,
  c,
  primaryAccent,
}: {
  label: string;
  valor: number;
  c: Tema;
  primaryAccent: string;
}) {
  return (
    <View style={[styles.footerTotalTarjeta, { borderTopColor: c.border }]}>
      <Text style={[styles.footerTotalLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.footerTotalValor, { color: primaryAccent }]}>{formatPrecio(valor)}</Text>
    </View>
  );
}

export default function PlanesAdicionales({ vehiculo, onContinuar }: Props) {
  useMonedaStore();
  const c = useTemaColores();
  const { t } = useTranslation();
  const BENEFICIOS_PROTECCION = useMemo(() => getBeneficiosProteccion(t), [t]);
  const BENEFICIOS_KILOMETRAJE = useMemo(() => getBeneficiosKilometraje(t), [t]);
  const planes = useReservaStore((s) => s.planes);
  const fechasLugar = useReservaStore((s) => s.fechasLugar);
  const actualizarPlanes = useReservaStore((s) => s.actualizarPlanes);
  const toggleServicioAdicional = useReservaStore((s) => s.toggleServicioAdicional);

  const [alertaFaltantesVisible, setAlertaFaltantesVisible] = useState(false);

  const primaryAccent = c.oscuro ? "#60A5FA" : COLOR_MARCA;

  const todosLosServicios = vehiculo.servicios ?? [];
  const kmLimitado = vehiculo.tarifas?.kmLimitado;
  const kmIlimitado = vehiculo.tarifas?.kmIlimitado;
  const seguros = vehiculo.seguros ?? [];

  const dias = useMemo(
    () => calcularDias(fechasLugar.fechaRetiro, fechasLugar.fechaDevolucion),
    [fechasLugar.fechaRetiro, fechasLugar.fechaDevolucion]
  );

  const seguroElegido = useMemo(
    () => seguros.find((s) => s.nombre === planes.proteccion) ?? null,
    [seguros, planes.proteccion]
  );
  const totalProteccion = seguroElegido ? seguroElegido.precio * dias : 0;

  const kmElegido = useMemo(() => {
    if (planes.tipoKilometraje === "limitado") return kmLimitado ?? null;
    if (planes.tipoKilometraje === "ilimitado") return kmIlimitado ?? null;
    return null;
  }, [planes.tipoKilometraje, kmLimitado, kmIlimitado]);
  const totalKilometraje = kmElegido ? kmElegido.precio * dias : 0;

  const totalServicios = useMemo(() => {
    return todosLosServicios
      .filter((s) => planes.serviciosSeleccionados.includes(s.nombre))
      .reduce((acc, s) => acc + s.precio * dias, 0);
  }, [todosLosServicios, planes.serviciosSeleccionados, dias]);

  const totalPlanes = totalProteccion + totalKilometraje + totalServicios;

  const puedeContinuar = !!planes.proteccion && !!planes.tipoKilometraje;

  const handleIrADatos = () => {
    if (!puedeContinuar) {
      setAlertaFaltantesVisible(true);
      return;
    }
    onContinuar?.();
  };

  return (
    <View>
      {/* --- SECCIÓN PROTECCIÓN --- */}
      {seguros.length > 0 && (
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          {/* Header de la tarjeta padre */}
          <View style={styles.cardHeaderFila}>
            <Ionicons name="shield-outline" size={14} color={primaryAccent} />
            <Text style={[styles.cardHeaderTitulo, { color: primaryAccent }]}>
              {t("reserva.planes.eligeTuNivelDeProteccion", { defaultValue: "Elige tu Nivel de Protección" })}
            </Text>
          </View>

          {/* Opciones de protección */}
          {seguros.map((seguro) => {
            const activo = planes.proteccion === seguro.nombre;
            const beneficios = BENEFICIOS_PROTECCION[seguro.nombre] ?? [];
            const esTotal = seguro.nombre === "Protección Total";

            return (
              <TouchableOpacity
                key={seguro.nombre}
                style={[
                  styles.opcionCard,
                  {
                    borderColor: c.border,
                    backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF",
                  },
                  activo && [styles.opcionCardActiva, { borderColor: primaryAccent }],
                ]}
                onPress={() => actualizarPlanes({ proteccion: seguro.nombre })}
                activeOpacity={0.88}
              >
                {/* Íconos de nivel de protección (escudos) */}
                <View style={styles.escudosNivelRow}>
                  {esTotal ? (
                    <>
                      <Ionicons name="shield" size={18} color={activo ? primaryAccent : "#94A3B8"} />
                      <Ionicons name="shield" size={18} color={activo ? primaryAccent : "#94A3B8"} />
                      <Ionicons name="shield" size={18} color={activo ? primaryAccent : "#94A3B8"} />
                    </>
                  ) : (
                    <>
                      <Ionicons name="shield" size={18} color={activo ? primaryAccent : "#94A3B8"} />
                      <Ionicons name="shield-outline" size={18} color="#94A3B8" />
                      <Ionicons name="shield-outline" size={18} color="#94A3B8" />
                    </>
                  )}
                </View>

                {/* Nombre de la protección */}
                <Text style={[styles.planNombreGrande, { color: c.textPrimary }]}>
                  {t(`reserva.planes.nombreSeguro.${seguro.nombre}`, { defaultValue: seguro.nombre })}
                </Text>

                {/* Precio diario */}
                <View style={styles.planPrecioRow}>
                  <Text style={[styles.planPrecioValor, { color: primaryAccent }]}>
                    {formatPrecio(seguro.precio)}
                  </Text>
                  <Text style={[styles.planPrecioUnidad, { color: c.textMuted }]}>
                    {t("reserva.planes.porDia", { defaultValue: "/ día" })}
                  </Text>
                </View>

                {/* Divisor */}
                <View style={[styles.planDivisor, { backgroundColor: c.border }]} />

                {/* Lista de beneficios */}
                <ListaBeneficios beneficios={beneficios} c={c} />

                {/* Botón Inferior: ELEGIR PLAN o PLAN SELECCIONADO */}
                {activo ? (
                  <LinearGradient
                    colors={GRADIENTES.boton.colors}
                    start={GRADIENTES.boton.start}
                    end={GRADIENTES.boton.end}
                    style={styles.btnPlanSeleccionado}
                  >
                    <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                    <Text style={styles.btnPlanSeleccionadoTexto}>
                      {t("reserva.planes.planSeleccionado", { defaultValue: "PLAN SELECCIONADO" })}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={[
                      styles.btnPlanNoSeleccionado,
                      {
                        backgroundColor: c.oscuro ? c.bgCard : "#F1F5F9",
                        borderColor: c.border,
                      },
                    ]}
                  >
                    <Text style={[styles.btnPlanNoSeleccionadoTexto, { color: c.textSecondary }]}>
                      {t("reserva.planes.elegirPlan", { defaultValue: "ELEGIR PLAN" })}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Footer de Total de Protección (siempre visible en la tarjeta padre) */}
          <View style={[styles.footerTotalTarjeta, { borderTopColor: c.border }]}>
            <Text style={[styles.footerTotalLabel, { color: c.textSecondary }]}>
              {seguroElegido
                ? t("reserva.planes.totalProteccionNombre", {
                    nombre: t(`reserva.planes.nombreSeguro.${seguroElegido.nombre}`, {
                      defaultValue: seguroElegido.nombre,
                    }),
                    dias,
                    unidad:
                      dias === 1
                        ? t("reserva.planes.dia", { defaultValue: "día" })
                        : t("reserva.planes.dias", { defaultValue: "días" }),
                    defaultValue: `Total ${seguroElegido.nombre} (${dias} ${dias === 1 ? "día" : "días"})`,
                  })
                : t("reserva.planes.totalPlanProteccion", {
                    dias,
                    unidad:
                      dias === 1
                        ? t("reserva.planes.dia", { defaultValue: "día" })
                        : t("reserva.planes.dias", { defaultValue: "días" }),
                    defaultValue: `Total plan de protección (${dias} ${dias === 1 ? "día" : "días"})`,
                  })}
            </Text>
            <Text style={[styles.footerTotalValor, { color: primaryAccent }]}>
              {formatPrecio(totalProteccion)}
            </Text>
          </View>
        </View>
      )}

      {/* --- SECCIÓN TIPO DE KILOMETRAJE --- */}
      {(kmLimitado || kmIlimitado) && (
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border, marginTop: 16 }]}>
          {/* Header de la tarjeta padre */}
          <View style={styles.cardHeaderFila}>
            <Ionicons name="speedometer-outline" size={14} color={primaryAccent} />
            <Text style={[styles.cardHeaderTitulo, { color: primaryAccent }]}>
              {t("reserva.planes.tipoKilometraje", { defaultValue: "Tipo de Kilometraje" })}
            </Text>
          </View>

          {/* Opción 1: Kilometraje limitado */}
          {kmLimitado && (
            <TouchableOpacity
              style={[
                styles.opcionCard,
                {
                  borderColor: c.border,
                  backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF",
                },
                planes.tipoKilometraje === "limitado" && [
                  styles.opcionCardActiva,
                  { borderColor: primaryAccent },
                ],
              ]}
              onPress={() => actualizarPlanes({ tipoKilometraje: "limitado" })}
              activeOpacity={0.88}
            >
              {/* Título */}
              <Text style={[styles.planNombreGrande, { color: c.textPrimary }]}>
                {t("reserva.planes.kmLimitadoTitulo", { defaultValue: "Kilometraje limitado" })}
              </Text>

              {/* Descripción */}
              <Text style={[styles.kmDescripcionTexto, { color: c.textSecondary }]}>
                {t("reserva.planes.kmLimitadoTexto", {
                  km: kmLimitado.km,
                  excedente: formatPrecio(kmLimitado.excedente ?? 800),
                  defaultValue: `Incluye ${kmLimitado.km} km por día dentro del valor de la tarifa. Si te pasas del límite, se cobra ${formatPrecio(kmLimitado.excedente ?? 800)} por cada km adicional.`,
                })}
              </Text>

              {/* Precio diario */}
              <View style={styles.planPrecioRow}>
                <Text style={[styles.planPrecioValor, { color: primaryAccent }]}>
                  {formatPrecio(kmLimitado.precio)}
                </Text>
                <Text style={[styles.planPrecioUnidad, { color: c.textMuted }]}>
                  {t("reserva.planes.porDia", { defaultValue: "/ día" })}
                </Text>
              </View>

              {/* Botón Inferior: ELEGIR PLAN o PLAN SELECCIONADO */}
              {planes.tipoKilometraje === "limitado" ? (
                <LinearGradient
                  colors={GRADIENTES.boton.colors}
                  start={GRADIENTES.boton.start}
                  end={GRADIENTES.boton.end}
                  style={styles.btnPlanSeleccionado}
                >
                  <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                  <Text style={styles.btnPlanSeleccionadoTexto}>
                    {t("reserva.planes.planSeleccionado", { defaultValue: "PLAN SELECCIONADO" })}
                  </Text>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.btnPlanNoSeleccionado,
                    {
                      backgroundColor: c.oscuro ? c.bgCard : "#F1F5F9",
                      borderColor: c.border,
                    },
                  ]}
                >
                  <Text style={[styles.btnPlanNoSeleccionadoTexto, { color: c.textSecondary }]}>
                    {t("reserva.planes.elegirPlan", { defaultValue: "ELEGIR PLAN" })}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Opción 2: Kilometraje ilimitado */}
          {kmIlimitado && (
            <TouchableOpacity
              style={[
                styles.opcionCard,
                {
                  borderColor: c.border,
                  backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF",
                },
                planes.tipoKilometraje === "ilimitado" && [
                  styles.opcionCardActiva,
                  { borderColor: primaryAccent },
                ],
              ]}
              onPress={() => actualizarPlanes({ tipoKilometraje: "ilimitado" })}
              activeOpacity={0.88}
            >
              {/* Título */}
              <Text style={[styles.planNombreGrande, { color: c.textPrimary }]}>
                {t("reserva.planes.kmIlimitadoTitulo", { defaultValue: "Kilometraje ilimitado" })}
              </Text>

              {/* Descripción */}
              <Text style={[styles.kmDescripcionTexto, { color: c.textSecondary }]}>
                {t("reserva.planes.kmIlimitadoTexto", {
                  defaultValue:
                    "Sin restricción de distancia dentro del territorio nacional. No aplica cobro adicional por exceso de kilómetros.",
                })}
              </Text>

              {/* Precio diario */}
              <View style={styles.planPrecioRow}>
                <Text style={[styles.planPrecioValor, { color: primaryAccent }]}>
                  {formatPrecio(kmIlimitado.precio)}
                </Text>
                <Text style={[styles.planPrecioUnidad, { color: c.textMuted }]}>
                  {t("reserva.planes.porDia", { defaultValue: "/ día" })}
                </Text>
              </View>

              {/* Botón Inferior: ELEGIR PLAN o PLAN SELECCIONADO */}
              {planes.tipoKilometraje === "ilimitado" ? (
                <LinearGradient
                  colors={GRADIENTES.boton.colors}
                  start={GRADIENTES.boton.start}
                  end={GRADIENTES.boton.end}
                  style={styles.btnPlanSeleccionado}
                >
                  <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                  <Text style={styles.btnPlanSeleccionadoTexto}>
                    {t("reserva.planes.planSeleccionado", { defaultValue: "PLAN SELECCIONADO" })}
                  </Text>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.btnPlanNoSeleccionado,
                    {
                      backgroundColor: c.oscuro ? c.bgCard : "#F1F5F9",
                      borderColor: c.border,
                    },
                  ]}
                >
                  <Text style={[styles.btnPlanNoSeleccionadoTexto, { color: c.textSecondary }]}>
                    {t("reserva.planes.elegirPlan", { defaultValue: "ELEGIR PLAN" })}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Footer de Total de Kilometraje (siempre visible en la tarjeta padre) */}
          <View style={[styles.footerTotalTarjeta, { borderTopColor: c.border }]}>
            <Text style={[styles.footerTotalLabel, { color: c.textSecondary }]}>
              {t("reserva.planes.totalTipoKilometraje", {
                dias,
                unidad:
                  dias === 1
                    ? t("reserva.planes.dia", { defaultValue: "día" })
                    : t("reserva.planes.dias", { defaultValue: "días" }),
                defaultValue: `Total tipo de kilometraje (${dias} ${dias === 1 ? "día" : "días"})`,
              })}
            </Text>
            <Text style={[styles.footerTotalValor, { color: primaryAccent }]}>
              {formatPrecio(totalKilometraje)}
            </Text>
          </View>
        </View>
      )}

      {/* --- SECCIÓN SERVICIOS ADICIONALES --- */}
      {todosLosServicios.length > 0 && (
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border, marginTop: 16 }]}>
          {/* Header de la tarjeta padre */}
          <View style={styles.cardHeaderFila}>
            <Ionicons name="sparkles-outline" size={14} color={primaryAccent} />
            <Text style={[styles.cardHeaderTitulo, { color: primaryAccent }]}>
              {t("reserva.planes.serviciosAdicionales", { defaultValue: "Servicios adicionales" })}
            </Text>
          </View>

          {/* Lista de servicios adicionales (dependientes de cada vehículo) */}
          {todosLosServicios.map((servicio) => {
            const seleccionado = planes.serviciosSeleccionados.includes(servicio.nombre);
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
                onPress={() => toggleServicioAdicional(servicio.nombre)}
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

          {/* Footer de Total de Servicios Adicionales (siempre visible en la tarjeta padre) */}
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
      )}

      {/* Botón Continuar */}
      <TouchableOpacity style={styles.confirmarBtnWrap} onPress={handleIrADatos} activeOpacity={0.85}>
        <LinearGradient
          colors={GRADIENTES.boton.colors}
          start={GRADIENTES.boton.start}
          end={GRADIENTES.boton.end}
          style={styles.confirmarBtn}
        >
          <Text style={styles.confirmarBtnText}>
            {t("reserva.planes.continuar", { defaultValue: "Continuar" })}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <AlertModal
        visible={alertaFaltantesVisible}
        icono="alert-circle-outline"
        titulo={t("reserva.planes.alertaFaltantesTitulo", { defaultValue: "Faltan datos por completar" })}
        mensaje={t("reserva.planes.alertaFaltantesMensaje", {
          defaultValue: "Elige un plan de protección y un tipo de kilómetros para continuar.",
        })}
        botones={[]}
        onCerrar={() => setAlertaFaltantesVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  seccionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
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
    color: COLOR_MARCA,
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  opcionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  opcionCardActiva: {
    borderWidth: 1.2,
  },

  escudosNivelRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    marginBottom: 6,
  },
  planNombreGrande: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  planPrecioRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginTop: 4,
  },
  planPrecioValor: {
    fontSize: 19,
    fontWeight: "800",
  },
  planPrecioUnidad: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
    marginBottom: 2,
  },
  planDivisor: {
    height: 1,
    marginVertical: 14,
  },

  kmDescripcionTexto: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 6,
  },

  btnPlanNoSeleccionado: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
    marginTop: 12,
  },
  btnPlanNoSeleccionadoTexto: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  btnPlanSeleccionado: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: 9,
    marginTop: 12,
  },
  btnPlanSeleccionadoTexto: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginLeft: 5,
  },

  kmFila: {
    flexDirection: "column",
    gap: 12,
    marginBottom: 8,
  },
  kmOpcionCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginVertical: 4,
  },
  opcionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  opcionTitulo: { fontSize: 12.5, fontWeight: "700" },
  opcionTituloActiva: {},
  opcionDesc: { fontSize: 10.5, marginTop: 4 },
  opcionDescActiva: {},

  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  radioActivo: {},
  radioPunto: { width: 8, height: 8, borderRadius: 4 },

  beneficiosLista: { gap: 8, marginTop: 4 },
  beneficioFila: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  beneficioTexto: { flex: 1, fontSize: 12, lineHeight: 17 },
  beneficioTextoTachado: { textDecorationLine: "line-through" },

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
  footerTotalLabel: { fontSize: 12, fontWeight: "700" },
  footerTotalValor: { fontSize: 15, fontWeight: "800" },

  confirmarBtnWrap: {
    alignSelf: "center",
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  confirmarBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmarBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
});
