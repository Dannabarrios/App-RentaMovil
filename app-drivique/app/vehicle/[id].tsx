// app/vehicle/[id].tsx
//
// Página completa del vehículo — accesible desde "Ver detalles" en la
// tarjeta del catálogo. Antes esto era un panel que se desplegaba dentro
// de la misma tarjeta (ver git history de VehicleCard.tsx); ahora es su
// propia ruta, alcanzable tanto por usuarios como por visitantes.

import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useAuthStore } from "@/store/authStore";
import { useMonedaStore } from "@/store/currencyStore";
import { useReservaStore } from "@/store/reservationStore";
import { formatCurrency } from "@/utils/currencyUtils";
import { AlertModal } from "@/components/ui/AlertModal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { GRADIENTES } from "@/constants/gradients";
import {
  VEHICULOS_MOCK,
  HORARIO_ATENCION_SUCURSAL,
  getDireccionSucursal,
  getUrlComoLlegar,
} from "@/modules/catalog/constants/catalog.constants";
import { VehicleGallery } from "@/modules/catalog/components/VehicleGallery";
import { VehicleReviews } from "@/modules/catalog/components/VehicleReviews";
import { useVehiculosReservados } from "@/modules/catalog/hooks/useVehiculosReservados";

function getSafeImages(vehiculo: (typeof VEHICULOS_MOCK)[number]): string[] {
  const imgs = vehiculo.imagenes ?? [];
  const filtradas = imgs.filter(Boolean);
  if (filtradas.length > 0) return filtradas;
  if (vehiculo.imagen) return [vehiculo.imagen];
  if (vehiculo.foto) return [vehiculo.foto];
  return [];
}

const ALTURA_BARRA_INFERIOR = 78;

export default function VehiculoDetallePage() {
  const { t } = useTranslation();
  const c = useTemaColores();
  const insets = useSafeAreaInsets();
  const { id, descuentoPorcentaje } = useLocalSearchParams<{ id: string; promoId?: string; descuentoPorcentaje?: string }>();
  const usuario = useAuthStore((s) => s.usuario);
  const monedaActual = useMonedaStore((s) => s.monedaActual);
  const tasaUSD = useMonedaStore((s) => s.tasaUSD);

  const descuentoNum = descuentoPorcentaje ? Number(descuentoPorcentaje) : 0;

  const [alertaReservaVisible, setAlertaReservaVisible] = useState(false);
  const opacidad = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacidad, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, [opacidad]);

  const { esVehiculoReservado } = useVehiculosReservados();
  const vehiculo = VEHICULOS_MOCK.find((v) => v.id === Number(id));
  const estaReservado = vehiculo ? esVehiculoReservado(vehiculo.id) : false;

  const volverCatalogo = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)/catalog");

  if (!vehiculo) {
    return (
      <View style={[s.contenedorVacio, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={40} color={c.textMuted} />
        <Text style={[s.vacioTexto, { color: c.textSecondary }]}>{t("vehiculo.noDisponible")}</Text>
        <TouchableOpacity style={s.vacioBtn} onPress={volverCatalogo}>
          <Text style={[s.vacioBtnTexto, { color: c.primary }]}>{t("vehiculo.volverCatalogo")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const disponible = vehiculo.disponible !== false && !estaReservado;
  const tarifas = vehiculo.tarifas ?? {};
  const seguros = vehiculo.seguros ?? [];
  const direccionSucursal = vehiculo.sucursal ? getDireccionSucursal(vehiculo.sucursal) : null;

  const equipamiento: { icono: keyof typeof Ionicons.glyphMap; label: string }[] = [];
  if (vehiculo.bluetooth) equipamiento.push({ icono: "bluetooth-outline", label: t("vehiculo.equipo.bluetooth") });
  if (vehiculo.usb) equipamiento.push({ icono: "hardware-chip-outline", label: t("vehiculo.equipo.usb") });
  if (vehiculo.pantallaTactil) equipamiento.push({ icono: "tablet-landscape-outline", label: t("vehiculo.equipo.pantallaTactil") });
  if (vehiculo.camaraReversa) equipamiento.push({ icono: "camera-outline", label: t("vehiculo.equipo.camaraReversa") });
  if (vehiculo.sensoresParqueo) equipamiento.push({ icono: "radio-outline", label: t("vehiculo.equipo.sensoresParqueo") });

  const ficha: { icono: React.ReactNode; label: string; valor: string }[] = [];
  const iconoFicha = (children: React.ReactNode) => children;
  if (vehiculo.puertas)
    ficha.push({ icono: iconoFicha(<MaterialCommunityIcons name="car-door" size={16} color={c.primary} />), label: t("vehiculo.ficha.puertas"), valor: String(vehiculo.puertas) });
  if (vehiculo.pasajeros)
    ficha.push({ icono: <Ionicons name="people-outline" size={16} color={c.primary} />, label: t("vehiculo.ficha.pasajeros"), valor: String(vehiculo.pasajeros) });
  if (vehiculo.maletero)
    ficha.push({ icono: <MaterialCommunityIcons name="bag-suitcase-outline" size={16} color={c.primary} />, label: t("vehiculo.ficha.maletero"), valor: `${vehiculo.maletero} L` });
  if (vehiculo.cilindraje)
    ficha.push({ icono: <Ionicons name="speedometer-outline" size={16} color={c.primary} />, label: t("vehiculo.ficha.cilindraje"), valor: vehiculo.cilindraje });
  if (vehiculo.color)
    ficha.push({ icono: <Ionicons name="color-palette-outline" size={16} color={c.primary} />, label: t("vehiculo.ficha.color"), valor: vehiculo.color });
  if (vehiculo.año)
    ficha.push({ icono: <Ionicons name="calendar-outline" size={16} color={c.primary} />, label: t("vehiculo.ficha.anio"), valor: String(vehiculo.año) });
  if (vehiculo.transmision)
    ficha.push({
      icono: <Ionicons name="settings-outline" size={16} color={c.primary} />,
      label: t("vehiculo.ficha.transmision"),
      valor: t(`catalogo.transmisionValores.${vehiculo.transmision}`, { defaultValue: vehiculo.transmision }),
    });
  if (vehiculo.combustible)
    ficha.push({
      icono: <MaterialCommunityIcons name="gas-station-outline" size={16} color={c.primary} />,
      label: t("vehiculo.ficha.combustible"),
      valor: t(`catalogo.combustibleValores.${vehiculo.combustible}`, { defaultValue: vehiculo.combustible }),
    });

  const handleReservar = () => {
    if (!disponible) return;
    if (!usuario) {
      setAlertaReservaVisible(true);
      return;
    }
    useReservaStore.getState().seleccionarVehiculo(
      descuentoNum > 0
        ? {
            ...vehiculo,
            precioOriginal: vehiculo.precio,
            precio: Math.round(vehiculo.precio * (1 - descuentoNum / 100)),
          }
        : vehiculo,
      {
        descuentoPromocion: descuentoNum > 0 ? descuentoNum : undefined,
      }
    );
    router.push("/(tabs)/reserve");
  };

  const handleComoLlegar = () => {
    if (!direccionSucursal) return;
    Linking.openURL(getUrlComoLlegar(direccionSucursal)).catch(() =>
      Alert.alert(t("vehiculo.sucursal.titulo"), t("vehiculo.sucursal.comoLlegar")),
    );
  };

  return (
    <View style={[s.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <StatusBar barStyle={c.oscuro ? "light-content" : "dark-content"} translucent backgroundColor={c.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: ALTURA_BARRA_INFERIOR + insets.bottom + 16 }}
      >
        <View>
          <VehicleGallery imagenes={getSafeImages(vehiculo)} calificacion={vehiculo.calificacion} />
          <TouchableOpacity
            style={[s.botonVolverFlotante, { top: 10 }]}
            onPress={volverCatalogo}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Animated.View style={[s.contenido, { opacity: opacidad }]}>
          {/* Banner de Promo Aplicada */}
          {descuentoNum > 0 && (
            <View style={{ backgroundColor: c.oscuro ? "#78350f22" : "#FEF3C7", padding: 12, borderRadius: 10, borderColor: c.oscuro ? "#b45309" : "#FDE68A", borderWidth: 1, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="pricetag-outline" size={20} color={c.oscuro ? "#fbbf24" : "#D97706"} />
              <Text style={{ color: c.oscuro ? "#fbbf24" : "#B45309", fontSize: 13.5, fontWeight: "800" }}>
                Promoción destacada: ¡Tienes {descuentoNum}% OFF en este vehículo!
              </Text>
            </View>
          )}

          {/* Encabezado */}
          <View style={s.tagsRow}>
            <View style={[s.tagCategoria, { backgroundColor: c.primaryBg }]}>
              <Text style={[s.tagCategoriaText, { color: c.primary }]}>
                {t(`catalogo.categoriaValores.${vehiculo.categoria ?? "Economico"}`, {
                  defaultValue: vehiculo.categoria ?? "Económico",
                })}
              </Text>
            </View>
            {estaReservado ? (
              <View
                style={[
                  s.tagReservado,
                  {
                    backgroundColor: c.oscuro ? "#78350F" : "#FEF3C7",
                    borderColor: c.oscuro ? "#b45309" : "#FDE68A",
                  },
                ]}
              >
                <Ionicons name="bookmark-outline" size={11} color={c.oscuro ? "#FCD34D" : "#B45309"} />
                <Text style={[s.tagReservadoText, { color: c.oscuro ? "#FCD34D" : "#B45309" }]}>
                  {t("catalogo.estados.reservado", { defaultValue: "Reservado" })}
                </Text>
              </View>
            ) : !disponible ? (
              <View style={s.tagNoDisponible}>
                <Text style={s.tagNoDisponibleText}>{t("vehiculo.noDisponible")}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[s.nombre, { color: c.textPrimary }]}>{vehiculo.nombre}</Text>

          {/* Precio y Descuento Promocional */}
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginVertical: 6, flexWrap: "wrap" }}>
            {descuentoNum > 0 ? (
              <>
                <Text style={{ fontSize: 24, fontWeight: "900", color: c.primary }}>
                  {formatCurrency(vehiculo.precio * (1 - descuentoNum / 100), monedaActual, tasaUSD)}
                </Text>
                <Text style={{ fontSize: 13, color: c.textMuted, textDecorationLine: "line-through" }}>
                  {formatCurrency(vehiculo.precio, monedaActual, tasaUSD)}
                </Text>
                <View style={{ backgroundColor: c.oscuro ? "#78350f" : "#FEF3C7", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: c.oscuro ? "#b45309" : "#FDE68A" }}>
                  <Text style={{ color: c.oscuro ? "#fbbf24" : "#B45309", fontSize: 11, fontWeight: "800" }}>
                    {descuentoNum}% OFF
                  </Text>
                </View>
                <Text style={{ fontSize: 12.5, color: c.textMuted }}>/ {t("vehiculo.porDia")}</Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 24, fontWeight: "900", color: c.primary }}>
                  {formatCurrency(vehiculo.precio, monedaActual, tasaUSD)}
                </Text>
                <Text style={{ fontSize: 12.5, color: c.textMuted }}>/ {t("vehiculo.porDia")}</Text>
              </>
            )}
          </View>

          {/* Specs rápidas */}
          <View style={s.quickRow}>
            {!!vehiculo.transmision && (
              <View style={s.quickItem}>
                <Ionicons name="settings-outline" size={14} color={c.primary} />
                <Text style={[s.quickText, { color: c.textSecondary }]}>
                  {t(`catalogo.transmisionValores.${vehiculo.transmision}`, { defaultValue: vehiculo.transmision })}
                </Text>
              </View>
            )}
            {!!vehiculo.combustible && (
              <>
                <View style={[s.quickDivisor, { backgroundColor: c.border }]} />
                <View style={s.quickItem}>
                  <MaterialCommunityIcons name="gas-station-outline" size={14} color={c.primary} />
                  <Text style={[s.quickText, { color: c.textSecondary }]}>
                    {t(`catalogo.combustibleValores.${vehiculo.combustible}`, { defaultValue: vehiculo.combustible })}
                  </Text>
                </View>
              </>
            )}
            {!!vehiculo.pasajeros && (
              <>
                <View style={[s.quickDivisor, { backgroundColor: c.border }]} />
                <View style={s.quickItem}>
                  <Ionicons name="people-outline" size={14} color={c.primary} />
                  <Text style={[s.quickText, { color: c.textSecondary }]}>
                    {vehiculo.pasajeros} {t("catalogo.detalles.personas")}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Descripción */}
          {vehiculo.descripcion && (
            <View style={s.seccion}>
              <SectionLabel icono="document-text-outline" texto={t("vehiculo.descripcion")} primaryBg={c.primaryBg} />
              <View style={[s.tarjeta, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                <Text style={[s.descripcionTexto, { color: c.textSecondary }]}>{vehiculo.descripcion}</Text>
              </View>
            </View>
          )}

          {/* Tarifas */}
          <View style={s.seccion}>
            <SectionLabel icono="cash-outline" texto={t("vehiculo.tarifas")} primaryBg={c.primaryBg} />
            <View style={[s.tarjeta, { backgroundColor: c.oscuro ? "#0F2A1C" : "#F4FBF7", borderColor: c.oscuro ? "#1F4D34" : "#CCF1DC" }]}>
              {tarifas.kmLimitado && (
                <View style={s.filaPrecio}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.filaPrecioLabel, { color: c.textPrimary }]}>{t("vehiculo.kmLimitado")}</Text>
                    <Text style={[s.filaPrecioSub, { color: c.textSecondary }]}>
                      {t("vehiculo.kmIncluidos", { km: tarifas.kmLimitado.km })}
                      {tarifas.kmLimitado.excedente
                        ? ` · ${t("vehiculo.excedente", { precio: formatCurrency(tarifas.kmLimitado.excedente, monedaActual, tasaUSD) })}`
                        : ""}
                    </Text>
                  </View>
                  <Text style={[s.filaPrecioValor, { color: c.textPrimary }]}>
                    {formatCurrency(tarifas.kmLimitado.precio, monedaActual, tasaUSD)}
                  </Text>
                </View>
              )}
              {tarifas.kmIlimitado && (
                <View style={[s.filaPrecio, { marginTop: tarifas.kmLimitado ? 10 : 0 }]}>
                  <Text style={[s.filaPrecioLabel, { color: c.textPrimary, flex: 1 }]}>{t("vehiculo.kmIlimitado")}</Text>
                  <Text style={[s.filaPrecioValor, { color: c.textPrimary }]}>
                    {formatCurrency(tarifas.kmIlimitado.precio, monedaActual, tasaUSD)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Seguros */}
          <View style={s.seccion}>
            <SectionLabel icono="shield-checkmark-outline" texto={t("vehiculo.seguros")} primaryBg={c.primaryBg} />
            <View style={[s.tarjeta, { backgroundColor: c.oscuro ? "#131B33" : "#F0F4FF", borderColor: c.oscuro ? "#28345C" : "#CCD9FF" }]}>
              {seguros.map((seg, i) => (
                <View key={seg.nombre} style={[s.filaPrecio, i > 0 && { marginTop: 10 }]}>
                  <Text style={[s.filaPrecioLabel, { color: c.textPrimary, flex: 1 }]}>
                    {t(`reserva.planes.nombreSeguro.${seg.nombre}`, { defaultValue: seg.nombre })}
                  </Text>
                  <Text style={[s.filaPrecioValor, { color: c.textPrimary }]}>
                    {formatCurrency(seg.precio, monedaActual, tasaUSD)}{t("vehiculo.porDia")}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Características */}
          {ficha.length > 0 && (
            <View style={s.seccion}>
              <SectionLabel icono="options-outline" texto={t("vehiculo.caracteristicas")} primaryBg={c.primaryBg} />
              <View style={s.fichaGrid}>
                {ficha.map((item) => (
                  <View key={item.label} style={[s.fichaItem, { backgroundColor: c.bgInput, borderColor: c.border }]}>
                    {item.icono}
                    <Text style={[s.fichaLabel, { color: c.textMuted }]}>{item.label}</Text>
                    <Text style={[s.fichaValor, { color: c.textPrimary }]}>{item.valor}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Equipamiento tecnológico */}
          {equipamiento.length > 0 && (
            <View style={s.seccion}>
              <SectionLabel icono="hardware-chip-outline" texto={t("vehiculo.equipamiento")} primaryBg={c.primaryBg} />
              <View style={[s.tarjeta, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                <View style={s.equipoGrid}>
                  {equipamiento.map((item) => (
                    <View key={item.label} style={[s.equipoChip, { backgroundColor: c.primaryBg }]}>
                      <Ionicons name={item.icono} size={15} color={c.primary} />
                      <Text style={[s.equipoChipText, { color: c.primary }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Sucursal */}
          {vehiculo.sucursal && (
            <View style={s.seccion}>
              <SectionLabel icono="business-outline" texto={t("vehiculo.sucursal.titulo")} primaryBg={c.primaryBg} />
              <View style={[s.tarjeta, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                <View style={s.sucursalFila}>
                  <Ionicons name="business-outline" size={16} color={c.primary} />
                  <Text style={[s.sucursalTexto, { color: c.textPrimary }]}>{vehiculo.sucursal}</Text>
                </View>
                {direccionSucursal && (
                  <View style={s.sucursalFila}>
                    <Ionicons name="location-outline" size={16} color={c.primary} />
                    <Text style={[s.sucursalTexto, { color: c.textSecondary }]}>{direccionSucursal}</Text>
                  </View>
                )}
                <View style={[s.sucursalFila, { marginBottom: direccionSucursal ? 14 : 0 }]}>
                  <Ionicons name="time-outline" size={16} color={c.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.sucursalTexto, { color: c.textSecondary }]}>
                      {t("vehiculo.sucursal.horario")}
                    </Text>
                    <Text style={[s.sucursalHorario, { color: c.textMuted }]}>{HORARIO_ATENCION_SUCURSAL}</Text>
                  </View>
                </View>
                {direccionSucursal && (
                  <TouchableOpacity
                    style={[s.comoLlegarBtn, { borderColor: c.primary }]}
                    onPress={handleComoLlegar}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="navigate-outline" size={15} color={c.primary} />
                    <Text style={[s.comoLlegarTexto, { color: c.primary }]}>{t("vehiculo.sucursal.comoLlegar")}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Reseñas */}
          <View style={s.seccion}>
            <SectionLabel icono="star-outline" texto={t("vehiculo.resenas.titulo")} primaryBg={c.primaryBg} />
            <VehicleReviews comentarios={vehiculo.comentarios ?? []} />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Barra inferior fija: precio + Reservar ahora */}
      <View style={[s.barraInferior, { backgroundColor: c.bgCard, borderTopColor: c.border, paddingBottom: insets.bottom + 12 }]}>
        <View>
          <Text style={[s.barraPrecioLabel, { color: c.textMuted }]}>{t("catalogo.filtrosModal.precioPorDia")}</Text>
          {descuentoNum > 0 ? (
            <View>
              <Text style={[s.barraPrecio, { fontSize: 13, color: c.textMuted, textDecorationLine: "line-through", marginBottom: -4 }]}>
                {formatCurrency(vehiculo.precio, monedaActual, tasaUSD)}
              </Text>
              <Text style={s.barraPrecio}>
                {formatCurrency(vehiculo.precio * (1 - descuentoNum / 100), monedaActual, tasaUSD)}
                <Text style={[s.barraPrecioDia, { color: c.textMuted }]}> {t("vehiculo.porDia")}</Text>
              </Text>
            </View>
          ) : (
            <Text style={s.barraPrecio}>
              {formatCurrency(vehiculo.precio, monedaActual, tasaUSD)}
              <Text style={[s.barraPrecioDia, { color: c.textMuted }]}> {t("vehiculo.porDia")}</Text>
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[
            s.reservarBtnWrap,
            (!disponible || estaReservado) && {
              opacity: estaReservado ? 0.95 : 0.5,
            },
          ]}
          onPress={handleReservar}
          disabled={!disponible || estaReservado}
          activeOpacity={0.85}
        >
          {estaReservado ? (
            <View
              style={[
                s.reservarBtn,
                {
                  backgroundColor: c.oscuro ? "#451A03" : "#FEF3C7",
                  borderColor: c.oscuro ? "#78350F" : "#FDE68A",
                  borderWidth: 1,
                },
              ]}
            >
              <Ionicons name="bookmark-outline" size={17} color={c.oscuro ? "#FCD34D" : "#B45309"} />
              <Text
                style={[
                  s.reservarBtnText,
                  { color: c.oscuro ? "#FCD34D" : "#B45309", fontWeight: "800" },
                ]}
              >
                {t("catalogo.estados.reservado", { defaultValue: "Reservado" }).toUpperCase()}
              </Text>
            </View>
          ) : disponible ? (
            <LinearGradient
              colors={GRADIENTES.boton.colors}
              start={GRADIENTES.boton.start}
              end={GRADIENTES.boton.end}
              style={s.reservarBtn}
            >
              <Ionicons name="car-sport-outline" size={17} color="#fff" />
              <Text style={s.reservarBtnText}>{t("vehiculo.reservarAhora")}</Text>
            </LinearGradient>
          ) : (
            <View style={s.reservarBtn}>
              <Ionicons name="car-sport-outline" size={17} color="#fff" />
              <Text style={s.reservarBtnText}>{t("vehiculo.noDisponible")}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <AlertModal
        visible={alertaReservaVisible}
        icono="car-sport-outline"
        titulo={t("catalogo.alertas.reservarTitulo")}
        mensaje={t("catalogo.alertas.reservarMensaje")}
        botones={[
          {
            texto: t("catalogo.alertas.cancelar"),
            variante: "secundario",
            onPress: () => setAlertaReservaVisible(false),
          },
          {
            texto: t("catalogo.alertas.iniciarSesion"),
            variante: "primario",
            onPress: () => {
              setAlertaReservaVisible(false);
              router.push("/(auth)/login");
            },
          },
        ]}
        onCerrar={() => setAlertaReservaVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  contenedorVacio: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  vacioTexto: { fontSize: 14, textAlign: "center" },
  vacioBtn: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 16 },
  vacioBtnTexto: { fontSize: 14, fontWeight: "700" },

  botonVolverFlotante: {
    position: "absolute",
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  contenido: { padding: 20 },
  tagsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tagCategoria: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  tagCategoriaText: { fontSize: 12, fontWeight: "700" },
  tagNoDisponible: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: "#FCE8E6" },
  tagNoDisponibleText: { fontSize: 12, fontWeight: "700", color: "#C5221F" },
  tagReservado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagReservadoText: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  nombre: { fontSize: 22, fontWeight: "900", marginBottom: 10 },

  quickRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  quickItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  quickText: { fontSize: 12.5, fontWeight: "600" },
  quickDivisor: { width: 1, height: 12 },

  reservarBtnWrap: { borderRadius: 12, overflow: "hidden" },
  reservarBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13, paddingHorizontal: 18 },
  reservarBtnText: { color: "#fff", fontSize: 13.5, fontWeight: "800", letterSpacing: 0.3 },

  seccion: { marginTop: 22 },
  descripcionTexto: { fontSize: 13.5, lineHeight: 21 },

  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14 },
  filaPrecio: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  filaPrecioLabel: { fontSize: 13.5, fontWeight: "700" },
  filaPrecioSub: { fontSize: 11.5, marginTop: 2 },
  filaPrecioValor: { fontSize: 14, fontWeight: "800" },

  fichaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fichaItem: { width: "31%", borderRadius: 10, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 8, gap: 3 },
  fichaLabel: { fontSize: 10.5, fontWeight: "600", textTransform: "uppercase" },
  fichaValor: { fontSize: 13, fontWeight: "700" },

  equipoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  equipoChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  equipoChipText: { fontSize: 12.5, fontWeight: "700" },

  sucursalFila: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  sucursalTexto: { fontSize: 13, fontWeight: "600", flex: 1 },
  sucursalHorario: { fontSize: 12, marginTop: 1 },
  comoLlegarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.3,
    borderRadius: 10,
    paddingVertical: 10,
  },
  comoLlegarTexto: { fontSize: 13, fontWeight: "700" },

  barraInferior: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  barraPrecioLabel: { fontSize: 10.5, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  barraPrecio: { fontSize: 20, fontWeight: "900", color: "#1E3A8A" },
  barraPrecioDia: { fontSize: 12, fontWeight: "500" },
});