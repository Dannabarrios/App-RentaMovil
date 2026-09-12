// app/vehicle/[id].tsx
//
// Pantalla completa de detalles del vehículo accesible desde "Ver detalles" en la tarjeta del catálogo.

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

const COLOR_AZUL_TITULO = "#1E3A8A";
const COLOR_BORDE_CARD = "#E2E8F0";
const ALTURA_BARRA_INFERIOR = 78;

function getSafeImages(vehiculo: (typeof VEHICULOS_MOCK)[number]): string[] {
  const imgs = vehiculo.imagenes ?? [];
  const filtradas = imgs.filter(Boolean);
  if (filtradas.length > 0) return filtradas;
  if (vehiculo.imagen) return [vehiculo.imagen];
  if (vehiculo.foto) return [vehiculo.foto];
  return [];
}

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

  const descuentoNum = descuentoPorcentaje ? Number(descuentoPorcentaje) : 10;

  const [alertaReservaVisible, setAlertaReservaVisible] = useState(false);
  const [modalComoLlegarVisible, setModalComoLlegarVisible] = useState(false);
  const opacidad = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacidad, { toValue: 1, duration: 350, useNativeDriver: true }).start();
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

  // Comentarios reales del vehículo (sin mock forzado)
  const comentariosMostrar = vehiculo.comentarios ?? [];

  // Equipamiento unificado (Confort + Tecnología)
  const equipamiento: {
    icono: keyof typeof Ionicons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap | keyof typeof MaterialIcons.glyphMap;
    tipo: "ion" | "mci" | "mat";
    label: string;
  }[] = [];

  if (vehiculo.aireAcondicionado !== false) {
    equipamiento.push({ icono: "snowflake", tipo: "mci", label: "Aire acondicionado" });
  }
  if (vehiculo.vidriosElectricos !== false) {
    equipamiento.push({ icono: "dock-window", tipo: "mci", label: "Vidrios eléctricos" });
  }
  if (vehiculo.cierreCentralizado !== false) {
    equipamiento.push({ icono: "lock-closed", tipo: "ion", label: "Cierre centralizado" });
  }
  if (vehiculo.bluetooth) {
    equipamiento.push({ icono: "bluetooth", tipo: "ion", label: "Bluetooth" });
  }
  if (vehiculo.usb) {
    equipamiento.push({ icono: "usb", tipo: "mat", label: "Puerto USB" });
  }
  if (vehiculo.pantallaTactil) {
    equipamiento.push({ icono: "tablet-landscape", tipo: "ion", label: "Pantalla táctil" });
  }
  if (vehiculo.camaraReversa) {
    equipamiento.push({ icono: "camera", tipo: "ion", label: "Cámara de reversa" });
  }
  if (vehiculo.sensoresParqueo) {
    equipamiento.push({ icono: "sensors", tipo: "mat", label: "Sensores de parqueo" });
  }
  if ((vehiculo as any).gps) {
    equipamiento.push({ icono: "navigate", tipo: "ion", label: "GPS" });
  }

  // Si por alguna razón la lista quedara vacía, aseguramos el equipamiento base
  if (equipamiento.length === 0) {
    equipamiento.push({ icono: "snowflake", tipo: "mci", label: "Aire acondicionado" });
    equipamiento.push({ icono: "dock-window", tipo: "mci", label: "Vidrios eléctricos" });
    equipamiento.push({ icono: "lock-closed", tipo: "ion", label: "Cierre centralizado" });
  }

  const precioOriginal = vehiculo.precio ?? 55000;
  const precioConDescuento = Math.round(precioOriginal * (1 - (descuentoNum > 0 ? descuentoNum : 10) / 100));

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
            precio: precioConDescuento,
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

  const colorIconoHeader = c.oscuro ? "#93C5FD" : "#1E3A8A";
  const colorTituloCard = colorIconoHeader;
  const colorTextoPrimario = c.oscuro ? "#F8FAFC" : "#0F172A";
  const colorTextoSecundario = c.oscuro ? "#94A3B8" : "#64748B";
  const colorAzulAccion = c.oscuro ? "#93C5FD" : "#1E3A8A";
  const colorBorde = c.oscuro ? c.border : COLOR_BORDE_CARD;
  const bgPantalla = c.oscuro ? c.bg : "#FFFFFF";

  return (
    <View style={[s.flex, { backgroundColor: bgPantalla, paddingTop: insets.top }]}>
      <StatusBar barStyle={c.oscuro ? "light-content" : "dark-content"} translucent backgroundColor={bgPantalla} />

      {/* Top Header con botón Volver (<) */}
      <View style={[s.topHeader, { backgroundColor: bgPantalla, borderBottomColor: colorBorde }]}>
        <TouchableOpacity
          onPress={volverCatalogo}
          style={s.volverBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colorAzulAccion} />
        </TouchableOpacity>
        <Text style={[s.headerTitulo, { color: colorTextoPrimario }]} numberOfLines={1}>
          {vehiculo.nombre}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingBottom: ALTURA_BARRA_INFERIOR + insets.bottom + 20 }]}
      >
        <Animated.View style={{ opacity: opacidad }}>
          {/* 1. Galería de Imágenes */}
          <VehicleGallery
            imagenes={getSafeImages(vehiculo)}
            calificacion={vehiculo.calificacion}
            borderColor={colorBorde}
          />

          {/* 2. Descripción */}
          {!!vehiculo.descripcion && (
            <View style={[s.card, { backgroundColor: c.bgCard, borderColor: colorBorde }]}>
              <View style={s.cardHeaderRow}>
                <Ionicons name="reorder-three" size={14} color={colorIconoHeader} />
                <Text style={[s.cardHeaderTitulo, { color: colorTituloCard }]}>
                  {t("vehiculo.descripcion", { defaultValue: "Descripción" })}
                </Text>
              </View>
              <Text style={[s.parrafoTexto, { color: colorTextoSecundario }]}>{vehiculo.descripcion}</Text>
            </View>
          )}

          {/* 3. Sucursal (después de la descripción) */}
          <View style={[s.card, { backgroundColor: c.bgCard, borderColor: colorBorde }]}>
            <View style={s.cardHeaderRow}>
              <Ionicons name="location-sharp" size={14} color={colorIconoHeader} />
              <Text style={[s.cardHeaderTitulo, { color: colorTituloCard }]}>
                {t("vehiculo.sucursal.titulo", { defaultValue: "Sucursal" })}
              </Text>
            </View>

            <Text style={[s.sucursalNombre, { color: colorTextoPrimario }]}>{nombreSucursal}</Text>

            <View style={s.infoRow}>
              <Ionicons name="location-outline" size={14} color="#8898AA" />
              <Text style={[s.infoRowTexto, { color: colorTextoSecundario }]}>{direccionCompleta}</Text>
            </View>

            <View style={[s.infoRow, { marginBottom: 14 }]}>
              <Ionicons name="time-outline" size={14} color="#8898AA" />
              <Text style={[s.infoRowTexto, { color: colorTextoSecundario }]}>{horarioAtencion}</Text>
            </View>

            <TouchableOpacity
              style={[s.btnAccion, { borderColor: colorAzulAccion }]}
              onPress={() => setModalComoLlegarVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="directions" size={16} color={colorAzulAccion} />
              <Text style={[s.btnAccionTexto, { color: colorAzulAccion }]}>
                {t("vehiculo.sucursal.comoLlegar", { defaultValue: "Cómo llegar" })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 4. Consultar Pico y Placa (después de Sucursal) */}
          <View style={[s.card, { backgroundColor: c.bgCard, borderColor: colorBorde }]}>
            <View style={s.cardHeaderRow}>
              <MaterialIcons name="directions-car" size={14} color={colorIconoHeader} />
              <Text style={[s.cardHeaderTitulo, { color: colorTituloCard }]}>
                {t("reserva.flujo.consultarPicoYPlaca", { defaultValue: "Consultar Pico y Placa" })}
              </Text>
            </View>

            <Text style={[s.parrafoTexto, { color: colorTextoSecundario, marginBottom: 14 }]}>
              {t(
                "reserva.flujo.picoYPlacaDesc",
                {
                  defaultValue:
                    "Consulta la restricción de movilidad oficial para planificar tu ruta y evitar contratiempos durante tu viaje.",
                }
              )}
            </Text>

            <TouchableOpacity
              style={[s.btnAccion, { borderColor: colorAzulAccion }]}
              onPress={handleOpenPicoYPlaca}
              activeOpacity={0.8}
            >
              <MaterialIcons name="open-in-new" size={16} color={colorAzulAccion} />
              <Text style={[s.btnAccionTexto, { color: colorAzulAccion }]}>
                {t("reserva.flujo.irALaPagina", { defaultValue: "Ir a la página" })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 5. Equipamiento y Tecnología (después de Consultar Pico y Placa) */}
          <View style={[s.card, { backgroundColor: c.bgCard, borderColor: colorBorde }]}>
            <View style={s.cardHeaderRow}>
              <Ionicons name="location-sharp" size={14} color={colorIconoHeader} />
              <Text style={[s.cardHeaderTitulo, { color: colorTituloCard }]}>
                {t("vehiculo.equipamiento", { defaultValue: "Equipamiento" })}
              </Text>
            </View>

            <View style={s.chipsGrid}>
              {equipamiento.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    s.chipItem,
                    {
                      borderColor: colorBorde,
                      backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF",
                    },
                  ]}
                >
                  {item.tipo === "ion" ? (
                    <Ionicons name={item.icono as any} size={15} color={colorTextoSecundario} />
                  ) : item.tipo === "mat" ? (
                    <MaterialIcons name={item.icono as any} size={15} color={colorTextoSecundario} />
                  ) : (
                    <MaterialCommunityIcons name={item.icono as any} size={15} color={colorTextoSecundario} />
                  )}
                  <Text style={[s.chipTexto, { color: colorTextoPrimario }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 6. Seguros (después de Equipamiento) */}
          <View style={[s.card, { backgroundColor: c.bgCard, borderColor: colorBorde }]}>
            <View style={s.cardHeaderRow}>
              <Ionicons name="shield-checkmark" size={14} color={colorIconoHeader} />
              <Text style={[s.cardHeaderTitulo, { color: colorTituloCard }]}>
                {t("vehiculo.seguros", { defaultValue: "Seguros" })}
              </Text>
            </View>

            <View style={[s.subCardInner, { borderColor: colorBorde, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}>
              <View style={s.filaTarifa}>
                <Text style={[s.filaTarifaLabel, { color: colorTextoPrimario }]}>Protección Obligatoria</Text>
                <Text style={[s.filaTarifaPrecio, { color: colorTextoPrimario }]}>
                  {formatCurrency(29000, monedaActual, tasaUSD)}/día
                </Text>
              </View>
              <View style={[s.divisorFila, { backgroundColor: colorBorde }]} />
              <View style={s.filaTarifa}>
                <Text style={[s.filaTarifaLabel, { color: colorTextoPrimario }]}>Protección Total</Text>
                <Text style={[s.filaTarifaPrecio, { color: colorTextoPrimario }]}>
                  {formatCurrency(67000, monedaActual, tasaUSD)}/día
                </Text>
              </View>
            </View>
          </View>

          {/* 7. Tarifas por kilometraje (después de Seguros) */}
          <View style={[s.card, { backgroundColor: c.bgCard, borderColor: colorBorde }]}>
            <View style={s.cardHeaderRow}>
              <MaterialCommunityIcons name="road-variant" size={14} color={colorIconoHeader} />
              <Text style={[s.cardHeaderTitulo, { color: colorTituloCard }]}>
                {t("vehiculo.tarifas", { defaultValue: "Tarifas por kilometraje" })}
              </Text>
            </View>

            <View style={[s.subCardInner, { borderColor: colorBorde, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF" }]}>
              <View style={s.filaTarifa}>
                <Text style={[s.filaTarifaLabel, { color: colorTextoPrimario }]}>Kilometraje limitado</Text>
                <Text style={[s.filaTarifaPrecio, { color: colorTextoPrimario }]}>
                  {formatCurrency(tarifas.kmLimitado?.precio ?? 60000, monedaActual, tasaUSD)}/día
                </Text>
              </View>
              <View style={[s.divisorFila, { backgroundColor: colorBorde }]} />
              <View style={s.filaTarifa}>
                <Text style={[s.filaTarifaLabel, { color: colorTextoPrimario }]}>Kilometraje ilimitado</Text>
                <Text style={[s.filaTarifaPrecio, { color: colorTextoPrimario }]}>
                  {formatCurrency(tarifas.kmIlimitado?.precio ?? 75000, monedaActual, tasaUSD)}/día
                </Text>
              </View>
            </View>
          </View>

          {/* 8. Características Técnicas */}
          <View style={[s.card, { backgroundColor: c.bgCard, borderColor: colorBorde }]}>
            <View style={s.cardHeaderRow}>
              <MaterialIcons name="format-list-bulleted" size={14} color={colorIconoHeader} />
              <Text style={[s.cardHeaderTitulo, { color: colorTituloCard }]}>
                {t("vehiculo.caracteristicas", { defaultValue: "Características" })}
              </Text>
            </View>

            <View style={s.caracteristicasGrid}>
              <View style={s.columnaCaracteristica}>
                <Text style={[s.labelCaracteristica, { color: colorTextoSecundario }]}>{t("reserva.flujo.categoria", { defaultValue: "Categoría" })}</Text>
                <Text style={[s.valorCaracteristica, { color: colorTextoPrimario }]}>
                  {t(`catalogo.categoriaValores.${vehiculo.categoria ?? "Economico"}`, { defaultValue: vehiculo.categoria ?? "Económico" })}
                </Text>
              </View>

              <View style={s.columnaCaracteristica}>
                <Text style={[s.labelCaracteristica, { color: colorTextoSecundario }]}>{t("vehiculo.ficha.transmision", { defaultValue: "Transmisión" })}</Text>
                <Text style={[s.valorCaracteristica, { color: colorTextoPrimario }]}>
                  {t(`catalogo.transmisionValores.${vehiculo.transmision ?? "Manual"}`, { defaultValue: vehiculo.transmision ?? "Manual" })}
                </Text>
              </View>

              <View style={s.columnaCaracteristica}>
                <Text style={[s.labelCaracteristica, { color: colorTextoSecundario }]}>{t("vehiculo.ficha.combustible", { defaultValue: "Combustible" })}</Text>
                <Text style={[s.valorCaracteristica, { color: colorTextoPrimario }]}>
                  {t(`catalogo.combustibleValores.${vehiculo.combustible ?? "Gasolina"}`, { defaultValue: vehiculo.combustible ?? "Gasolina" })}
                </Text>
              </View>

              <View style={s.columnaCaracteristica}>
                <Text style={[s.labelCaracteristica, { color: colorTextoSecundario }]}>{t("vehiculo.ficha.pasajeros", { defaultValue: "Capacidad" })}</Text>
                <Text style={[s.valorCaracteristica, { color: colorTextoPrimario }]}>
                  {vehiculo.pasajeros ?? 4} {t("catalogo.detalles.personas", { defaultValue: "pasajeros" })}
                </Text>
              </View>

              <View style={s.columnaCaracteristica}>
                <Text style={[s.labelCaracteristica, { color: colorTextoSecundario }]}>{t("vehiculo.ficha.puertas", { defaultValue: "Puertas" })}</Text>
                <Text style={[s.valorCaracteristica, { color: colorTextoPrimario }]}>{vehiculo.puertas ?? 4}</Text>
              </View>

              <View style={s.columnaCaracteristica}>
                <Text style={[s.labelCaracteristica, { color: colorTextoSecundario }]}>{t("vehiculo.ficha.maletero", { defaultValue: "Maletero" })}</Text>
                <Text style={[s.valorCaracteristica, { color: colorTextoPrimario }]}>{vehiculo.maletero ?? 170} L</Text>
              </View>

              <View style={s.columnaCaracteristica}>
                <Text style={[s.labelCaracteristica, { color: colorTextoSecundario }]}>{t("vehiculo.ficha.cilindraje", { defaultValue: "Motor" })}</Text>
                <Text style={[s.valorCaracteristica, { color: colorTextoPrimario }]}>{vehiculo.cilindraje || "1.0L"}</Text>
              </View>

              <View style={s.columnaCaracteristica}>
                <Text style={[s.labelCaracteristica, { color: colorTextoSecundario }]}>{t("vehiculo.ficha.color", { defaultValue: "Color" })}</Text>
                <Text style={[s.valorCaracteristica, { color: colorTextoPrimario }]}>{vehiculo.color || "Rojo Passion"}</Text>
              </View>

              <View style={s.columnaCaracteristica}>
                <Text style={[s.labelCaracteristica, { color: colorTextoSecundario }]}>{t("vehiculo.ficha.anio", { defaultValue: "Año" })}</Text>
                <Text style={[s.valorCaracteristica, { color: colorTextoPrimario }]}>{vehiculo.año ?? 2023}</Text>
              </View>

              <View style={s.columnaCaracteristica}>
                <Text style={[s.labelCaracteristica, { color: colorTextoSecundario }]}>{t("reserva.flujo.placa", { defaultValue: "Placa" })}</Text>
                <Text style={[s.valorCaracteristica, { color: colorTextoPrimario }]}>{vehiculo.placa || "GHI-789"}</Text>
              </View>
            </View>
          </View>

          {/* 9. Requisitos para rentar */}
          <View style={[s.card, { backgroundColor: c.bgCard, borderColor: colorBorde }]}>
            <View style={s.cardHeaderRow}>
              <MaterialIcons name="assignment-turned-in" size={14} color={colorIconoHeader} />
              <Text style={[s.cardHeaderTitulo, { color: colorTituloCard }]}>
                {t("reserva.flujo.requisitosParaRentar", { defaultValue: "Requisitos para rentar" })}
              </Text>
            </View>

            <View style={s.requisitosLista}>
              {/* Edad mínima */}
              <View style={s.requisitoItem}>
                <Ionicons name="person" size={14} color={colorTextoSecundario} style={s.requisitoIcono} />
                <View style={s.requisitoTextCol}>
                  <Text style={[s.requisitoTitulo, { color: colorTextoPrimario }]}>
                    {t("reserva.flujo.edadMinimaTitulo", { defaultValue: "Edad mínima" })}
                  </Text>
                  <Text style={[s.requisitoDesc, { color: colorTextoSecundario }]}>
                    {t("reserva.flujo.edadMinimaDesc", { defaultValue: "Debes tener al menos 18 años para rentar." })}
                  </Text>
                </View>
              </View>

              {/* Identificación */}
              <View style={s.requisitoItem}>
                <MaterialIcons name="badge" size={14} color={colorTextoSecundario} style={s.requisitoIcono} />
                <View style={s.requisitoTextCol}>
                  <Text style={[s.requisitoTitulo, { color: colorTextoPrimario }]}>
                    {t("reserva.flujo.identificacionTitulo", { defaultValue: "Identificación" })}
                  </Text>
                  <Text style={[s.requisitoDesc, { color: colorTextoSecundario }]}>
                    {t("reserva.flujo.identificacionDesc", {
                      defaultValue: "Cédula de ciudadanía para nacionales o pasaporte vigente para extranjeros.",
                    })}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 10. Precio por día ($COP) */}
          <View style={[s.card, { backgroundColor: c.bgCard, borderColor: colorBorde }]}>
            <View style={s.precioCardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="pricetag" size={14} color={colorIconoHeader} />
                <Text style={[s.cardHeaderTitulo, { color: colorTituloCard }]}>
                  {t("vehiculo.precioPorDia", { defaultValue: "Precio por día ($COP)" })}
                </Text>
              </View>
              <View style={s.badgeDescuento}>
                <Text style={s.badgeDescuentoTexto}>-{descuentoNum}%</Text>
              </View>
            </View>

            <View style={[s.subCardInner, { borderColor: colorBorde, backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF", marginTop: 4 }]}>
              <View style={s.filaTarifa}>
                <Text style={[s.filaTarifaLabel, { color: colorTextoSecundario, fontWeight: "500", fontSize: 12 }]}>Antes</Text>
                <Text style={[s.filaTarifaPrecio, { color: colorTextoSecundario, fontWeight: "500", fontSize: 12, textDecorationLine: "line-through" }]}>
                  {formatCurrency(precioOriginal, monedaActual, tasaUSD)}/día
                </Text>
              </View>
              <View style={[s.divisorFila, { backgroundColor: colorBorde }]} />
              <View style={s.filaTarifa}>
                <Text style={[s.filaTarifaLabel, { color: colorAzulAccion, fontSize: 12.5, fontWeight: "700" }]}>Ahora</Text>
                <Text style={[s.filaTarifaPrecio, { color: colorAzulAccion, fontSize: 13.5, fontWeight: "800" }]}>
                  {formatCurrency(precioConDescuento, monedaActual, tasaUSD)}/día
                </Text>
              </View>
            </View>
          </View>

          {/* Divisor entre Precio por día y Reseñas */}
          <View style={[s.divisorSeccion, { backgroundColor: colorBorde }]} />

          {/* 11. Reseñas de clientes */}
          <VehicleReviews
            comentarios={comentariosMostrar}
            calificacionPromedio={vehiculo.calificacion}
            vehiculoId={vehiculo.id}
            vehiculoNombre={vehiculo.nombre}
          />
        </Animated.View>
      </ScrollView>

      {/* Barra inferior fija: Precio + Reservar ahora */}
      <View style={[s.barraInferior, { backgroundColor: c.bgCard, borderTopColor: colorBorde, paddingBottom: insets.bottom + 10 }]}>
        <View>
          <Text style={[s.barraPrecioLabel, { color: c.textMuted }]}>{t("catalogo.tarjeta.tarifaPorDia", { defaultValue: "Tarifa diaria" })}</Text>
          <Text style={[s.barraPrecio, { color: colorTituloCard }]}>
            {formatCurrency(precioConDescuento, monedaActual, tasaUSD)}
            <Text style={[s.barraPrecioDia, { color: c.textMuted }]}>
              {t("vehiculo.porDia", { defaultValue: "/día" }).startsWith("/")
                ? ` ${t("vehiculo.porDia", { defaultValue: "/día" })}`
                : ` /${t("vehiculo.porDia", { defaultValue: "día" })}`}
            </Text>
          </Text>
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
            <Ionicons name="car-sport-outline" size={16} color="#fff" />
            <Text style={s.reservarBtnText}>{t("vehiculo.reservarAhora", { defaultValue: "Reservar ahora" })}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Modal de Cómo llegar */}
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

  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  volverBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitulo: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  cardHeaderTitulo: {
    fontSize: 13,
    fontWeight: "700",
  },

  precioCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeDescuento: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeDescuentoTexto: {
    fontSize: 11,
    fontWeight: "800",
    color: "#047857",
  },

  reservarBtnInline: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  reservarBtnInlineTexto: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  sucursalNombre: {
    fontSize: 13.5,
    fontWeight: "600",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
  },
  infoRowTexto: {
    fontSize: 13,
    fontWeight: "400",
  },

  btnAccion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    width: "100%",
  },
  btnAccionTexto: {
    fontSize: 13,
    fontWeight: "700",
  },

  parrafoTexto: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
  },

  subCardInner: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filaTarifa: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  filaTarifaLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  filaTarifaPrecio: {
    fontSize: 13,
    fontWeight: "600",
  },
  divisorFila: {
    height: 1,
    width: "100%",
  },
  divisorSeccion: {
    height: 1,
    width: "100%",
    marginBottom: 14,
  },

  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
    marginTop: 2,
  },
  chipItem: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipTexto: {
    fontSize: 12,
    fontWeight: "500",
    flexShrink: 1,
  },

  caracteristicasGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 14,
    marginTop: 4,
  },
  columnaCaracteristica: {
    width: "50%",
    paddingRight: 8,
  },
  labelCaracteristica: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 2,
  },
  valorCaracteristica: {
    fontSize: 13,
    fontWeight: "600",
  },

  requisitosLista: {
    gap: 12,
    marginTop: 4,
  },
  requisitoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  requisitoIcono: {
    marginTop: 2,
  },
  requisitoTextCol: {
    flex: 1,
  },
  requisitoTitulo: {
    fontSize: 13.5,
    fontWeight: "600",
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
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  barraPrecioLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  barraPrecio: {
    fontSize: 19,
    fontWeight: "900",
    color: "#1E3A8A",
  },
  barraPrecioDia: {
    fontSize: 12,
    fontWeight: "500",
  },
  reservarBtnWrap: {
    borderRadius: 10,
    overflow: "hidden",
  },
  reservarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  reservarBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});