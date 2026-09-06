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
  getBeneficiosProteccion,
  COLOR_MARCA,
} from "../constants/reservation.constants";
import { useMonedaStore } from "@/store/currencyStore";
import { formatCurrency } from "@/utils/currencyUtils";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import { diasEntre } from "./BookingSummaryModal.pieces";

type Tema = ReturnType<typeof useTemaColores>;

interface Props {
  vehiculo: Vehiculo;
  onGuardar: () => void;
  onCancelar: () => void;
}

function formatPrecio(precio: number): string {
  const { monedaActual, tasaUSD } = useMonedaStore.getState();
  return formatCurrency(precio, monedaActual, tasaUSD);
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

export default function EditProtectionMileageSection({
  vehiculo,
  onGuardar,
  onCancelar,
}: Props) {
  useMonedaStore();
  const c = useTemaColores();
  const { t } = useTranslation();
  const BENEFICIOS_PROTECCION = useMemo(() => getBeneficiosProteccion(t), [t]);

  const storePlanes = useReservaStore((s) => s.planes);
  const fechasLugar = useReservaStore((s) => s.fechasLugar);
  const actualizarPlanes = useReservaStore((s) => s.actualizarPlanes);

  // Borrador local para proteger el store en caso de cancelar
  const [draftProteccion, setDraftProteccion] = useState(storePlanes.proteccion);
  const [draftKm, setDraftKm] = useState(storePlanes.tipoKilometraje);

  const primaryAccent = c.oscuro ? "#60A5FA" : COLOR_MARCA;

  const kmLimitado = vehiculo.tarifas?.kmLimitado;
  const kmIlimitado = vehiculo.tarifas?.kmIlimitado;
  const seguros = vehiculo.seguros ?? [];

  const dias = useMemo(() => {
    const d = diasEntre(fechasLugar.fechaRetiro, fechasLugar.fechaDevolucion);
    return d > 0 ? d : 1;
  }, [fechasLugar.fechaRetiro, fechasLugar.fechaDevolucion]);

  const seguroElegido = useMemo(
    () => seguros.find((s) => s.nombre === draftProteccion) ?? null,
    [seguros, draftProteccion]
  );
  const totalProteccion = seguroElegido ? seguroElegido.precio * dias : 0;

  const kmElegido = useMemo(() => {
    if (draftKm === "limitado") return kmLimitado ?? null;
    if (draftKm === "ilimitado") return kmIlimitado ?? null;
    return null;
  }, [draftKm, kmLimitado, kmIlimitado]);
  const totalKilometraje = kmElegido ? kmElegido.precio * dias : 0;

  const handleGuardar = () => {
    actualizarPlanes({
      proteccion: draftProteccion,
      tipoKilometraje: draftKm,
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
          {t("reserva.edicion.editarProteccion", { defaultValue: "Editar Tu Protección" })}
        </Text>
        <TouchableOpacity onPress={onCancelar} hitSlop={10}>
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* --- SECCIÓN 1: PROTECCIÓN --- */}
        {seguros.length > 0 && (
          <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <View style={styles.cardHeaderFila}>
              <Ionicons name="shield-outline" size={14} color={primaryAccent} />
              <Text style={[styles.cardHeaderTitulo, { color: primaryAccent }]}>
                {t("reserva.planes.eligeTuNivelDeProteccion", { defaultValue: "Elige tu Nivel de Protección" })}
              </Text>
            </View>

            {seguros.map((seguro) => {
              const activo = draftProteccion === seguro.nombre;
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
                  onPress={() => setDraftProteccion(seguro.nombre)}
                  activeOpacity={0.88}
                >
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

                  <Text style={[styles.planNombreGrande, { color: c.textPrimary }]}>
                    {t(`reserva.planes.nombreSeguro.${seguro.nombre}`, { defaultValue: seguro.nombre })}
                  </Text>

                  <View style={styles.planPrecioRow}>
                    <Text style={[styles.planPrecioValor, { color: primaryAccent }]}>
                      {formatPrecio(seguro.precio)}
                    </Text>
                    <Text style={[styles.planPrecioUnidad, { color: c.textMuted }]}>
                      {t("reserva.planes.porDia", { defaultValue: "/ día" })}
                    </Text>
                  </View>

                  <View style={[styles.planDivisor, { backgroundColor: c.border }]} />

                  <ListaBeneficios beneficios={beneficios} c={c} />

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

        {/* --- SECCIÓN 2: TIPO DE KILOMETRAJE --- */}
        {(kmLimitado || kmIlimitado) && (
          <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border, marginTop: 14 }]}>
            <View style={styles.cardHeaderFila}>
              <Ionicons name="speedometer-outline" size={14} color={primaryAccent} />
              <Text style={[styles.cardHeaderTitulo, { color: primaryAccent }]}>
                {t("reserva.planes.tipoKilometraje", { defaultValue: "Tipo de Kilometraje" })}
              </Text>
            </View>

            {kmLimitado && (
              <TouchableOpacity
                style={[
                  styles.opcionCard,
                  {
                    borderColor: c.border,
                    backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF",
                  },
                  draftKm === "limitado" && [styles.opcionCardActiva, { borderColor: primaryAccent }],
                ]}
                onPress={() => setDraftKm("limitado")}
                activeOpacity={0.88}
              >
                <Text style={[styles.planNombreGrande, { color: c.textPrimary }]}>
                  {t("reserva.planes.kmLimitadoTitulo", { defaultValue: "Kilometraje limitado" })}
                </Text>

                <Text style={[styles.kmDescripcionTexto, { color: c.textSecondary }]}>
                  {t("reserva.planes.kmLimitadoTexto", {
                    km: kmLimitado.km,
                    excedente: formatPrecio(kmLimitado.excedente ?? 800),
                    defaultValue: `Incluye ${kmLimitado.km} km por día dentro del valor de la tarifa. Si te pasas del límite, se cobra ${formatPrecio(kmLimitado.excedente ?? 800)} por cada km adicional.`,
                  })}
                </Text>

                <View style={styles.planPrecioRow}>
                  <Text style={[styles.planPrecioValor, { color: primaryAccent }]}>
                    {formatPrecio(kmLimitado.precio)}
                  </Text>
                  <Text style={[styles.planPrecioUnidad, { color: c.textMuted }]}>
                    {t("reserva.planes.porDia", { defaultValue: "/ día" })}
                  </Text>
                </View>

                {draftKm === "limitado" ? (
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

            {kmIlimitado && (
              <TouchableOpacity
                style={[
                  styles.opcionCard,
                  {
                    borderColor: c.border,
                    backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF",
                  },
                  draftKm === "ilimitado" && [styles.opcionCardActiva, { borderColor: primaryAccent }],
                ]}
                onPress={() => setDraftKm("ilimitado")}
                activeOpacity={0.88}
              >
                <Text style={[styles.planNombreGrande, { color: c.textPrimary }]}>
                  {t("reserva.planes.kmIlimitadoTitulo", { defaultValue: "Kilometraje ilimitado" })}
                </Text>

                <Text style={[styles.kmDescripcionTexto, { color: c.textSecondary }]}>
                  {t("reserva.planes.kmIlimitadoTexto", {
                    defaultValue:
                      "Sin restricción de distancia dentro del territorio nacional. No aplica cobro adicional por exceso de kilómetros.",
                  })}
                </Text>

                <View style={styles.planPrecioRow}>
                  <Text style={[styles.planPrecioValor, { color: primaryAccent }]}>
                    {formatPrecio(kmIlimitado.precio)}
                  </Text>
                  <Text style={[styles.planPrecioUnidad, { color: c.textMuted }]}>
                    {t("reserva.planes.porDia", { defaultValue: "/ día" })}
                  </Text>
                </View>

                {draftKm === "ilimitado" ? (
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
  beneficiosLista: {
    gap: 8,
    marginTop: 4,
  },
  beneficioFila: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  beneficioTexto: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  beneficioTextoTachado: {
    textDecorationLine: "line-through",
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
