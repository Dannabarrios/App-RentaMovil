// app/vehicle/[id].tsx
//
// Página completa de detalles del vehículo accesible desde "Ver detalles" en la
// tarjeta del catálogo.

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
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
  getCiudadPorSucursal,
} from "@/modules/catalog/constants/catalog.constants";
import { VehicleGallery } from "@/modules/catalog/components/VehicleGallery";
import { VehicleReviews } from "@/modules/catalog/components/VehicleReviews";
import BranchDirectionsModal from "@/modules/reservation/components/BranchDirectionsModal";

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
  const { id, descuentoPorcentaje } = useLocalSearchParams<{
    id: string;
    promoId?: string;
    descuentoPorcentaje?: string;
  }>();
  const usuario = useAuthStore((s) => s.usuario);
  const monedaActual = useMonedaStore((s) => s.monedaActual);
  const tasaUSD = useMonedaStore((s) => s.tasaUSD);

  const descuentoNum = descuentoPorcentaje ? Number(descuentoPorcentaje) : 0;

  const [alertaReservaVisible, setAlertaReservaVisible] = useState(false);
  const [modalComoLlegarVisible, setModalComoLlegarVisible] = useState(false);
  const opacidad = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacidad, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, [opacidad]);

  const vehiculo = VEHICULOS_MOCK.find((v) => v.id === Number(id));

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

  const disponible = vehiculo.disponible !== false;
  const tarifas = vehiculo.tarifas ?? {};
  const seguros = vehiculo.seguros ?? [];
  const nombreSucursal = vehiculo.sucursal || "Alquiler Neiva - Centro";
  const ciudadSucursal = getCiudadPorSucursal(nombreSucursal);
  const direccionBase = getDireccionSucursal(nombreSucursal) || "Cra 5 # 12-34";
  const direccionCompleta = ciudadSucursal ? `${direccionBase}, ${ciudadSucursal}` : direccionBase;
  const horarioAtencion = HORARIO_ATENCION_SUCURSAL || "Lun a sáb, 7:00 am - 7:00 pm";

  const equipamiento: { icono: keyof typeof Ionicons.glyphMap; label: string }[] = [];
  if (vehiculo.bluetooth) equipamiento.push({ icono: "bluetooth-outline", label: t("vehiculo.equipo.bluetooth", { defaultValue: "Bluetooth" }) });
  if (vehiculo.usb) equipamiento.push({ icono: "hardware-chip-outline", label: t("vehiculo.equipo.usb", { defaultValue: "Puerto USB" }) });
  if (vehiculo.pantallaTactil) equipamiento.push({ icono: "tablet-landscape-outline", label: t("vehiculo.equipo.pantallaTactil", { defaultValue: "Pantalla táctil" }) });
  if (vehiculo.camaraReversa) equipamiento.push({ icono: "camera-outline", label: t("vehiculo.equipo.camaraReversa", { defaultValue: "Cámara de reversa" }) });
  if (vehiculo.sensoresParqueo) equipamiento.push({ icono: "radio-outline", label: t("vehiculo.equipo.sensoresParqueo", { defaultValue: "Sensores de parqueo" }) });

  // Características Completas
  const ficha: { icono: React.ReactNode; label: string; valor: string }[] = [];
  ficha.push({
    icono: <Ionicons name="pricetag-outline" size={15} color={c.primary} />,
    label: t("reserva.flujo.categoria", { defaultValue: "Categoría" }),
    valor: t(`catalogo.categoriaValores.${vehiculo.categoria ?? "Economico"}`, { defaultValue: vehiculo.categoria ?? "Económico" }),
  });
  if (vehiculo.transmision) {
    ficha.push({
      icono: <Ionicons name="settings-outline" size={15} color={c.primary} />,
      label: t("vehiculo.ficha.transmision", { defaultValue: "Transmisión" }),
      valor: t(`catalogo.transmisionValores.${vehiculo.transmision}`, { defaultValue: vehiculo.transmision }),
    });
  }
  if (vehiculo.combustible) {
    ficha.push({
      icono: <MaterialCommunityIcons name="gas-station-outline" size={15} color={c.primary} />,
      label: t("vehiculo.ficha.combustible", { defaultValue: "Combustible" }),
      valor: t(`catalogo.combustibleValores.${vehiculo.combustible}`, { defaultValue: vehiculo.combustible }),
    });
  }
  ficha.push({
    icono: <Ionicons name="people-outline" size={15} color={c.primary} />,
    label: t("vehiculo.ficha.pasajeros", { defaultValue: "Capacidad" }),
    valor: `${vehiculo.pasajeros ?? 5} ${t("catalogo.detalles.personas", { defaultValue: "pasajeros" })}`,
  });
  ficha.push({
    icono: <MaterialCommunityIcons name="car-door" size={15} color={c.primary} />,
    label: t("vehiculo.ficha.puertas", { defaultValue: "Puertas" }),
    valor: String(vehiculo.puertas ?? 5),
  });
  ficha.push({
    icono: <MaterialCommunityIcons name="bag-suitcase-outline" size={15} color={c.primary} />,
    label: t("vehiculo.ficha.maletero", { defaultValue: "Maletero" }),
    valor: `${vehiculo.maletero ?? 320} L`,
  });
  ficha.push({
    icono: <Ionicons name="flash-outline" size={15} color={c.primary} />,
    label: t("vehiculo.ficha.cilindraje", { defaultValue: "Motor" }),
    valor: vehiculo.cilindraje || "1.6L",
  });
  ficha.push({
    icono: <Ionicons name="color-palette-outline" size={15} color={c.primary} />,
    label: t("vehiculo.ficha.color", { defaultValue: "Color" }),
    valor: vehiculo.color || "Gris Highland",
  });
  ficha.push({
    icono: <Ionicons name="calendar-outline" size={15} color={c.primary} />,
    label: t("vehiculo.ficha.anio", { defaultValue: "Año" }),
    valor: String(vehiculo.año ?? 2023),
  });
  ficha.push({
    icono: <Ionicons name="card-outline" size={15} color={c.primary} />,
    label: t("reserva.flujo.placa", { defaultValue: "Placa" }),
    valor: vehiculo.placa || "PQR-678",
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

  const handleOpenPicoYPlaca = () => {
    Linking.openURL("https://www.pyphoy.com").catch(() => {});
  };

  return (
    <View style={[s.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <StatusBar barStyle={c.oscuro ? "light-content" : "dark-content"} translucent backgroundColor={c.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: ALTURA_BARRA_INFERIOR + insets.bottom + 16 }}
      >
        {/* Galería de fotos con miniaturas */}
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
            <View
              style={{
                backgroundColor: c.oscuro ? "#78350f22" : "#FEF3C7",
                padding: 12,
                borderRadius: 10,
                borderColor: c.oscuro ? "#b45309" : "#FDE68A",
                borderWidth: 1,
                marginBottom: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="pricetag-outline" size={20} color={c.oscuro ? "#fbbf24" : "#D97706"} />
              <Text style={{ color: c.oscuro ? "#fbbf24" : "#B45309", fontSize: 13.5, fontWeight: "800" }}>
                ¡Promoción destacada con {descuentoNum}% OFF en este vehículo!
              </Text>
            </View>
          )}

          {/* Tags y Encabezado */}
          <View style={s.tagsRow}>
            <View style={[s.tagCategoria, { backgroundColor: c.primaryBg }]}>
              <Text style={[s.tagCategoriaText, { color: c.primary }]}>
                {t(`catalogo.categoriaValores.${vehiculo.categoria ?? "Economico"}`, {
                  defaultValue: vehiculo.categoria ?? "Económico",
                })}
              </Text>
            </View>
            <View style={[s.tagSucursal, { backgroundColor: c.bgInput }]}>
              <Ionicons name="location-outline" size={12} color={c.textMuted} />
              <Text style={[s.tagSucursalText, { color: c.textSecondary }]}>
                {nombreSucursal}
              </Text>
            </View>
            {!disponible && (
              <View style={s.tagNoDisponible}>
                <Text style={s.tagNoDisponibleText}>{t("vehiculo.noDisponible")}</Text>
              </View>
            )}
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
                    {vehiculo.pasajeros} {t("catalogo.detalles.personas", { defaultValue: "pasajeros" })}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* 1. Descripción */}
          {vehiculo.descripcion && (
            <View style={s.seccion}>
              <SectionLabel icono="document-text-outline" texto={t("vehiculo.descripcion", { defaultValue: "Descripción" })} primaryBg={c.primaryBg} />
              <View style={[s.tarjeta, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                <Text style={[s.descripcionTexto, { color: c.textSecondary }]}>{vehiculo.descripcion}</Text>
              </View>
            </View>
          )}

          {/* 2. Sucursal y Cómo llegar */}
          <View style={s.seccion}>
            <SectionLabel icono="business-outline" texto={t("vehiculo.sucursal.titulo", { defaultValue: "Sucursal" })} primaryBg={c.primaryBg} />
            <View style={[s.tarjeta, { backgroundColor: c.bgCard, borderColor: c.border }]}>
              <Text style={[s.sucursalTitulo, { color: c.textPrimary }]}>{nombreSucursal}</Text>

              <View style={s.sucursalFila}>
                <Ionicons name="location-outline" size={16} color={c.primary} />
                <Text style={[s.sucursalTexto, { color: c.textSecondary }]}>{direccionCompleta}</Text>
              </View>

              <View style={[s.sucursalFila, { marginBottom: 14 }]}>
                <Ionicons name="time-outline" size={16} color={c.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.sucursalTexto, { color: c.textSecondary }]}>
                    {t("vehiculo.sucursal.horario", { defaultValue: "Horario de atención" })}
                  </Text>
                  <Text style={[s.sucursalHorario, { color: c.textMuted }]}>{horarioAtencion}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[s.comoLlegarBtn, { borderColor: c.primary }]}
                onPress={() => setModalComoLlegarVisible(true)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="directions" size={18} color={c.primary} />
                <Text style={[s.comoLlegarTexto, { color: c.primary }]}>
                  {t("vehiculo.sucursal.comoLlegar", { defaultValue: "Cómo llegar" })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Consultar Pico y Placa */}
          <View style={s.seccion}>
            <SectionLabel icono="car-sport-outline" texto={t("reserva.flujo.consultarPicoYPlaca", { defaultValue: "Consultar Pico y Placa" })} primaryBg={c.primaryBg} />
            <View style={[s.tarjeta, { backgroundColor: c.bgCard, borderColor: c.border }]}>
              <Text style={[s.descripcionTexto, { color: c.textSecondary, marginBottom: 12 }]}>
                {t(
                  "reserva.flujo.picoYPlacaDesc",
                  {
                    defaultValue:
                      "¿No estás seguro de si este vehículo tiene restricción de movilidad hoy? Consulta la información oficial a nivel nacional para planificar tu ruta y evitar multas o contratiempos durante tu reserva.",
                  }
                )}
              </Text>
              <TouchableOpacity
                style={[s.btnPicoPlaca, { borderColor: c.primary }]}
                onPress={handleOpenPicoYPlaca}
                activeOpacity={0.8}
              >
                <MaterialIcons name="open-in-new" size={16} color={c.primary} />
                <Text style={[s.btnPicoPlacaTexto, { color: c.primary }]}>
                  {t("reserva.flujo.irALaPagina", { defaultValue: "Ir a la página oficial" })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. Características Técnicas */}
          {ficha.length > 0 && (
            <View style={s.seccion}>
              <SectionLabel icono="options-outline" texto={t("vehiculo.caracteristicas", { defaultValue: "Características" })} primaryBg={c.primaryBg} />
              <View style={s.fichaGrid}>
                {ficha.map((item) => (
                  <View key={item.label} style={[s.fichaItem, { backgroundColor: c.bgInput, borderColor: c.border }]}>
                    <View style={s.fichaLabelRow}>
                      {item.icono}
                      <Text style={[s.fichaLabel, { color: c.textMuted }]}>{item.label}</Text>
                    </View>
                    <Text style={[s.fichaValor, { color: c.textPrimary }]}>{item.valor}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 5. Equipamiento tecnológico */}
          {equipamiento.length > 0 && (
            <View style={s.seccion}>
              <SectionLabel icono="hardware-chip-outline" texto={t("vehiculo.equipamiento", { defaultValue: "Equipamiento tecnológico" })} primaryBg={c.primaryBg} />
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

          {/* 6. Tarifas por kilometraje */}
          <View style={s.seccion}>
            <SectionLabel icono="cash-outline" texto={t("vehiculo.tarifas", { defaultValue: "Tarifas por kilometraje" })} primaryBg={c.primaryBg} />
            <View style={[s.tarjeta, { backgroundColor: c.oscuro ? "#0F2A1C" : "#F4FBF7", borderColor: c.oscuro ? "#1F4D34" : "#CCF1DC" }]}>
              {tarifas.kmLimitado && (
                <View style={s.filaPrecio}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.filaPrecioLabel, { color: c.textPrimary }]}>{t("vehiculo.kmLimitado", { defaultValue: "Kilometraje limitado" })}</Text>
                    <Text style={[s.filaPrecioSub, { color: c.textSecondary }]}>
                      {t("vehiculo.kmIncluidos", { km: tarifas.kmLimitado.km, defaultValue: `${tarifas.kmLimitado.km} km/día incluidos` })}
                      {tarifas.kmLimitado.excedente
                        ? ` · ${t("vehiculo.excedente", { precio: formatCurrency(tarifas.kmLimitado.excedente, monedaActual, tasaUSD), defaultValue: `Excedente: ${formatCurrency(tarifas.kmLimitado.excedente, monedaActual, tasaUSD)}/km` })}`
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
                  <Text style={[s.filaPrecioLabel, { color: c.textPrimary, flex: 1 }]}>{t("vehiculo.kmIlimitado", { defaultValue: "Kilometraje ilimitado" })}</Text>
                  <Text style={[s.filaPrecioValor, { color: c.textPrimary }]}>
                    {formatCurrency(tarifas.kmIlimitado.precio, monedaActual, tasaUSD)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 7. Seguros */}
          {seguros.length > 0 && (
            <View style={s.seccion}>
              <SectionLabel icono="shield-checkmark-outline" texto={t("vehiculo.seguros", { defaultValue: "Seguros" })} primaryBg={c.primaryBg} />
              <View style={[s.tarjeta, { backgroundColor: c.oscuro ? "#131B33" : "#F0F4FF", borderColor: c.oscuro ? "#28345C" : "#CCD9FF" }]}>
                {seguros.map((seg, i) => (
                  <View key={seg.nombre} style={[s.filaPrecio, i > 0 && { marginTop: 10 }]}>
                    <Text style={[s.filaPrecioLabel, { color: c.textPrimary, flex: 1 }]}>
                      {t(`reserva.planes.nombreSeguro.${seg.nombre}`, { defaultValue: seg.nombre })}
                    </Text>
                    <Text style={[s.filaPrecioValor, { color: c.textPrimary }]}>
                      {formatCurrency(seg.precio, monedaActual, tasaUSD)}{t("vehiculo.porDia", { defaultValue: "/día" })}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 8. Requisitos para rentar */}
          <View style={s.seccion}>
            <SectionLabel icono="checkmark-done-circle-outline" texto={t("reserva.flujo.requisitosParaRentar", { defaultValue: "Requisitos para rentar" })} primaryBg={c.primaryBg} />
            <View style={[s.tarjeta, { backgroundColor: c.bgCard, borderColor: c.border }]}>
              <View style={s.requisitosLista}>
                {/* Requisito 1: Edad mínima */}
                <View style={s.requisitoItem}>
                  <Ionicons name="person-outline" size={18} color={c.primary} style={s.requisitoIcono} />
                  <View style={s.requisitoTextCol}>
                    <Text style={[s.requisitoTitulo, { color: c.textPrimary }]}>
                      {t("reserva.flujo.edadMinimaTitulo", { defaultValue: "Edad mínima" })}
                    </Text>
                    <Text style={[s.requisitoDesc, { color: c.textSecondary }]}>
                      {t("reserva.flujo.edadMinimaDesc", { defaultValue: "Debes tener al menos 21 años cumplidos para rentar." })}
                    </Text>
                  </View>
                </View>

                {/* Requisito 2: Identificación */}
                <View style={s.requisitoItem}>
                  <MaterialIcons name="badge" size={18} color={c.primary} style={s.requisitoIcono} />
                  <View style={s.requisitoTextCol}>
                    <Text style={[s.requisitoTitulo, { color: c.textPrimary }]}>
                      {t("reserva.flujo.identificacionTitulo", { defaultValue: "Identificación" })}
                    </Text>
                    <Text style={[s.requisitoDesc, { color: c.textSecondary }]}>
                      {t("reserva.flujo.identificacionDesc", {
                        defaultValue: "Cédula de ciudadanía para nacionales o pasaporte vigente para extranjeros.",
                      })}
                    </Text>
                  </View>
                </View>

                {/* Requisito 3: Licencia de conducción */}
                <View style={s.requisitoItem}>
                  <Ionicons name="card-outline" size={18} color={c.primary} style={s.requisitoIcono} />
                  <View style={s.requisitoTextCol}>
                    <Text style={[s.requisitoTitulo, { color: c.textPrimary }]}>
                      {t("reserva.flujo.licenciaTitulo", { defaultValue: "Licencia de conducción" })}
                    </Text>
                    <Text style={[s.requisitoDesc, { color: c.textSecondary }]}>
                      {t("reserva.flujo.licenciaDesc", {
                        defaultValue: "Licencia de conducir vigente nacional o internacional expedida hace más de 1 año.",
                      })}
                    </Text>
                  </View>
                </View>

                {/* Requisito 4: Depósito de garantía */}
                <View style={s.requisitoItem}>
                  <MaterialIcons name="security" size={18} color={c.primary} style={s.requisitoIcono} />
                  <View style={s.requisitoTextCol}>
                    <Text style={[s.requisitoTitulo, { color: c.textPrimary }]}>
                      {t("reserva.flujo.depositoTitulo", { defaultValue: "Depósito de garantía" })}
                    </Text>
                    <Text style={[s.requisitoDesc, { color: c.textSecondary }]}>
                      {t("reserva.flujo.depositoDesc", {
                        defaultValue: "Tarjeta de crédito o medio autorizado a nombre del titular para el depósito reembolsable.",
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* 9. Reseñas de clientes */}
          <View style={s.seccion}>
            <SectionLabel icono="star-outline" texto={t("vehiculo.resenas.titulo", { defaultValue: "Reseñas" })} primaryBg={c.primaryBg} />
            <VehicleReviews comentarios={vehiculo.comentarios ?? []} />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Barra inferior fija: precio + Reservar ahora */}
      <View style={[s.barraInferior, { backgroundColor: c.bgCard, borderTopColor: c.border, paddingBottom: insets.bottom + 12 }]}>
        <View>
          <Text style={[s.barraPrecioLabel, { color: c.textMuted }]}>{t("catalogo.filtrosModal.precioPorDia", { defaultValue: "Precio por día" })}</Text>
          {descuentoNum > 0 ? (
            <View>
              <Text style={[s.barraPrecio, { fontSize: 13, color: c.textMuted, textDecorationLine: "line-through", marginBottom: -4 }]}>
                {formatCurrency(vehiculo.precio, monedaActual, tasaUSD)}
              </Text>
              <Text style={s.barraPrecio}>
                {formatCurrency(vehiculo.precio * (1 - descuentoNum / 100), monedaActual, tasaUSD)}
                <Text style={[s.barraPrecioDia, { color: c.textMuted }]}> {t("vehiculo.porDia", { defaultValue: "/día" })}</Text>
              </Text>
            </View>
          ) : (
            <Text style={s.barraPrecio}>
              {formatCurrency(vehiculo.precio, monedaActual, tasaUSD)}
              <Text style={[s.barraPrecioDia, { color: c.textMuted }]}> {t("vehiculo.porDia", { defaultValue: "/día" })}</Text>
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[s.reservarBtnWrap, !disponible && { opacity: 0.5 }]}
          onPress={handleReservar}
          disabled={!disponible}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={GRADIENTES.boton.colors}
            start={GRADIENTES.boton.start}
            end={GRADIENTES.boton.end}
            style={s.reservarBtn}
          >
            <Ionicons name="car-sport-outline" size={17} color="#fff" />
            <Text style={s.reservarBtnText}>{t("vehiculo.reservarAhora", { defaultValue: "Reservar ahora" })}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Modal de Cómo llegar interactivo */}
      <BranchDirectionsModal
        visible={modalComoLlegarVisible}
        nombreSucursal={nombreSucursal}
        direccion={direccionCompleta}
        horario={horarioAtencion}
        onCerrar={() => setModalComoLlegarVisible(false)}
      />

      {/* Modal Alerta Registro / Inicio de Sesión */}
      <AlertModal
        visible={alertaReservaVisible}
        icono="car-sport-outline"
        titulo={t("catalogo.alertas.reservarTitulo", { defaultValue: "Inicia sesión" })}
        mensaje={t("catalogo.alertas.reservarMensaje", { defaultValue: "Debes iniciar sesión para reservar este vehículo." })}
        botones={[
          {
            texto: t("catalogo.alertas.cancelar", { defaultValue: "Cancelar" }),
            variante: "secundario",
            onPress: () => setAlertaReservaVisible(false),
          },
          {
            texto: t("catalogo.alertas.iniciarSesion", { defaultValue: "Iniciar sesión" }),
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

  contenido: { padding: 18 },
  tagsRow: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" },
  tagCategoria: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagCategoriaText: { fontSize: 12, fontWeight: "700" },
  tagSucursal: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagSucursalText: { fontSize: 12, fontWeight: "500" },
  tagNoDisponible: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: "#FCE8E6" },
  tagNoDisponibleText: { fontSize: 12, fontWeight: "700", color: "#C5221F" },
  nombre: { fontSize: 22, fontWeight: "900", marginBottom: 6 },

  quickRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" },
  quickItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  quickText: { fontSize: 12.5, fontWeight: "600" },
  quickDivisor: { width: 1, height: 12 },

  reservarBtnWrap: { borderRadius: 12, overflow: "hidden" },
  reservarBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13, paddingHorizontal: 18 },
  reservarBtnText: { color: "#fff", fontSize: 13.5, fontWeight: "800", letterSpacing: 0.3 },

  seccion: { marginTop: 20 },
  descripcionTexto: { fontSize: 13, lineHeight: 20, fontWeight: "400" },

  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14 },
  filaPrecio: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  filaPrecioLabel: { fontSize: 13.5, fontWeight: "700" },
  filaPrecioSub: { fontSize: 11.5, marginTop: 2 },
  filaPrecioValor: { fontSize: 14, fontWeight: "800" },

  fichaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fichaItem: { width: "48.5%", borderRadius: 10, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 10, gap: 4 },
  fichaLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  fichaLabel: { fontSize: 11, fontWeight: "500" },
  fichaValor: { fontSize: 13, fontWeight: "700" },

  equipoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  equipoChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  equipoChipText: { fontSize: 12.5, fontWeight: "700" },

  sucursalTitulo: { fontSize: 15, fontWeight: "800", marginBottom: 8 },
  sucursalFila: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  sucursalTexto: { fontSize: 13, fontWeight: "500", flex: 1 },
  sucursalHorario: { fontSize: 12, marginTop: 2 },
  comoLlegarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.3,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  comoLlegarTexto: { fontSize: 13, fontWeight: "700" },

  btnPicoPlaca: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.3,
    borderRadius: 10,
    paddingVertical: 10,
    width: "100%",
  },
  btnPicoPlacaTexto: {
    fontSize: 13,
    fontWeight: "700",
  },

  requisitosLista: {
    gap: 14,
  },
  requisitoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  requisitoIcono: {
    marginTop: 2,
  },
  requisitoTextCol: {
    flex: 1,
  },
  requisitoTitulo: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  requisitoDesc: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "400",
  },

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