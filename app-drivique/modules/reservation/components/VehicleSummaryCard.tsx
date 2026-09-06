import React, { useState } from "react";
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Vehiculo } from "@/modules/catalog/types/catalog.types";
import { COLOR_MARCA, COLORES } from "../constants/reservation.constants";
import { getDireccionSucursal, getCiudadPorSucursal } from "@/modules/catalog/constants/catalog.constants";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import BranchDirectionsModal from "./BranchDirectionsModal";

interface Props {
  vehiculo: Vehiculo;
}

function getSafeImages(vehiculo: Vehiculo): string[] {
  const imgs = vehiculo.imagenes ?? [];
  const filtradas = imgs.filter(Boolean);
  if (filtradas.length > 0) return filtradas.slice(0, 3);
  if (vehiculo.imagen) return [vehiculo.imagen];
  if (vehiculo.foto) return [vehiculo.foto];
  return [];
}

export default function VehiculoResumenCard({ vehiculo }: Props) {
  const c = useTemaColores();
  const { t } = useTranslation();
  const [fotoActiva, setFotoActiva] = useState(0);
  const [modalComoLlegarVisible, setModalComoLlegarVisible] = useState(false);
  const imagenes = getSafeImages(vehiculo);

  const irAnterior = () => {
    if (imagenes.length <= 1) return;
    setFotoActiva((prev) => (prev > 0 ? prev - 1 : imagenes.length - 1));
  };

  const irSiguiente = () => {
    if (imagenes.length <= 1) return;
    setFotoActiva((prev) => (prev < imagenes.length - 1 ? prev + 1 : 0));
  };

  const handleOpenPicoYPlaca = () => {
    const url = "https://www.pyphoy.com";
    Linking.openURL(url).catch(() => {});
  };

  const nombreSucursal = vehiculo.sucursal || "Alquiler Neiva - Centro";
  const ciudadSucursal = getCiudadPorSucursal(nombreSucursal);
  const direccionBase = getDireccionSucursal(nombreSucursal) || "Cra 5 # 12-34";
  const direccionCompleta = ciudadSucursal
    ? `${direccionBase}, ${ciudadSucursal}`
    : direccionBase;
  const horarioAtencion = t("reserva.flujo.horarioAtencion", { defaultValue: "Lun a sáb, 7:00 am - 7:00 pm" });

  return (
    <View style={[styles.cardPadre, { backgroundColor: c.bgCard, borderColor: c.border }]}>
      {/* --- SUB-TARJETA 1: GALERÍA DE IMÁGENES --- */}
      <View style={[styles.subCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        {/* Título del vehículo */}
        <Text style={[styles.nombre, { color: c.textPrimary }]} numberOfLines={1}>
          {vehiculo.nombre}
        </Text>

        {/* Imagen Principal */}
        <View style={[styles.imagenPrincipal, { backgroundColor: c.bgInput }]}>
          {imagenes.length > 0 ? (
            <>
              <Image
                source={{ uri: imagenes[fotoActiva] }}
                style={styles.imagenPrincipalImg}
                resizeMode="cover"
              />

              {/* Badge de Calificación */}
              <View style={styles.badgeRating}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.badgeRatingText}>
                  {(vehiculo.calificacion ?? 4.3).toFixed(1)}
                </Text>
              </View>

              {/* Flechas de navegación */}
              {imagenes.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.arrowBtn, styles.arrowLeft]}
                    onPress={irAnterior}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.arrowBtn, styles.arrowRight]}
                    onPress={irSiguiente}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <View style={styles.imagenFallback}>
              <Ionicons name="car-outline" size={48} color={COLORES.imageFallbackIcon} />
            </View>
          )}
        </View>

        {/* Fila de Miniaturas */}
        {imagenes.length > 1 && (
          <View style={styles.thumbsRow}>
            {imagenes.map((uri, i) => {
              const activo = i === fotoActiva;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => setFotoActiva(i)}
                  activeOpacity={0.8}
                  style={[
                    styles.thumbWrap,
                    activo && styles.thumbWrapActivo,
                  ]}
                >
                  <Image
                    source={{ uri }}
                    style={[styles.thumb, !activo && styles.thumbInactivo]}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* --- SUB-TARJETA 2: DESCRIPCIÓN --- */}
      {!!vehiculo.descripcion && (
        <View style={[styles.subCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <View style={styles.headerConIcono}>
            <Ionicons name="reorder-three" size={18} color={COLOR_MARCA} />
            <Text style={styles.tituloHeaderConIcono}>
              {t("reserva.flujo.descripcion", { defaultValue: "Descripción" })}
            </Text>
          </View>
          <Text style={[styles.descripcionTexto, { color: c.textSecondary }]}>
            {vehiculo.descripcion}
          </Text>
        </View>
      )}

      {/* --- SUB-TARJETA 3: SUCURSAL --- */}
      <View style={[styles.subCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <View style={styles.headerConIcono}>
          <Ionicons name="location" size={14} color={COLOR_MARCA} />
          <Text style={styles.tituloHeaderConIcono}>
            {t("reserva.flujo.sucursal", { defaultValue: "Sucursal" })}
          </Text>
        </View>

        <Text style={[styles.sucursalNombre, { color: c.textPrimary }]} numberOfLines={1}>
          {nombreSucursal}
        </Text>

        <View style={styles.infoFila}>
          <Ionicons name="location-outline" size={13} color={c.textMuted} />
          <Text style={[styles.infoTexto, { color: c.textSecondary }]} numberOfLines={1}>
            {direccionCompleta}
          </Text>
        </View>

        <View style={[styles.infoFila, { marginBottom: 12 }]}>
          <Ionicons name="time-outline" size={13} color={c.textMuted} />
          <Text style={[styles.infoTexto, { color: c.textSecondary }]}>
            {horarioAtencion}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btnComoLlegar, { borderColor: COLOR_MARCA }]}
          onPress={() => setModalComoLlegarVisible(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="directions" size={16} color={COLOR_MARCA} />
          <Text style={[styles.btnComoLlegarTexto, { color: COLOR_MARCA }]}>
            {t("reserva.flujo.comoLlegar", { defaultValue: "Cómo llegar" })}
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- SUB-TARJETA 4: CONSULTAR PICO Y PLACA --- */}
      <View style={[styles.subCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <View style={styles.headerConIcono}>
          <MaterialIcons name="directions-car" size={16} color={COLOR_MARCA} />
          <Text style={styles.tituloHeaderConIcono}>
            {t("reserva.flujo.consultarPicoYPlaca", { defaultValue: "Consultar Pico y Placa" })}
          </Text>
        </View>

        <Text style={[styles.picoPlacaTexto, { color: c.textSecondary }]}>
          {t(
            "reserva.flujo.picoYPlacaDesc",
            {
              defaultValue:
                "¿No estás seguro de si este vehículo tiene restricción de movilidad hoy? Consulta la información oficial a nivel nacional para planificar tu ruta y evitar multas o contratiempos durante tu reserva. Recuerda que las restricciones pueden variar según la ciudad y el día de la semana, por lo que es vital estar informado antes de viajar.",
            }
          )}
        </Text>

        <TouchableOpacity
          style={[styles.btnPicoPlaca, { borderColor: COLOR_MARCA }]}
          onPress={handleOpenPicoYPlaca}
          activeOpacity={0.8}
        >
          <MaterialIcons name="open-in-new" size={15} color={COLOR_MARCA} />
          <Text style={[styles.btnPicoPlacaTexto, { color: COLOR_MARCA }]}>
            {t("reserva.flujo.irALaPagina", { defaultValue: "Ir a la página" })}
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- SUB-TARJETA 5: CARACTERÍSTICAS --- */}
      <View style={[styles.subCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <View style={styles.headerConIcono}>
          <MaterialIcons name="format-list-bulleted" size={16} color={COLOR_MARCA} />
          <Text style={styles.tituloHeaderConIcono}>
            {t("reserva.flujo.caracteristicas", { defaultValue: "Características" })}
          </Text>
        </View>

        <View style={styles.caracteristicasGrid}>
          {/* Categoría */}
          <View style={styles.caracteristicaItem}>
            <View style={styles.caracteristicaLabelRow}>
              <Ionicons name="pricetag-outline" size={13} color="#8898AA" />
              <Text style={styles.caracteristicaLabel}>
                {t("reserva.flujo.categoria", { defaultValue: "Categoría" })}
              </Text>
            </View>
            <Text style={[styles.caracteristicaValor, { color: c.textPrimary }]}>
              {vehiculo.categoria || "Económico"}
            </Text>
          </View>

          {/* Transmisión */}
          <View style={styles.caracteristicaItem}>
            <View style={styles.caracteristicaLabelRow}>
              <Ionicons name="car-outline" size={13} color="#8898AA" />
              <Text style={styles.caracteristicaLabel}>
                {t("reserva.flujo.transmision", { defaultValue: "Transmisión" })}
              </Text>
            </View>
            <Text style={[styles.caracteristicaValor, { color: c.textPrimary }]}>
              {vehiculo.transmision || "Manual"}
            </Text>
          </View>

          {/* Combustible */}
          <View style={styles.caracteristicaItem}>
            <View style={styles.caracteristicaLabelRow}>
              <MaterialIcons name="local-gas-station" size={13} color="#8898AA" />
              <Text style={styles.caracteristicaLabel}>
                {t("reserva.flujo.combustible", { defaultValue: "Combustible" })}
              </Text>
            </View>
            <Text style={[styles.caracteristicaValor, { color: c.textPrimary }]}>
              {vehiculo.combustible || "Gasolina"}
            </Text>
          </View>

          {/* Capacidad */}
          <View style={styles.caracteristicaItem}>
            <View style={styles.caracteristicaLabelRow}>
              <Ionicons name="people-outline" size={13} color="#8898AA" />
              <Text style={styles.caracteristicaLabel}>
                {t("reserva.flujo.capacidad", { defaultValue: "Capacidad" })}
              </Text>
            </View>
            <Text style={[styles.caracteristicaValor, { color: c.textPrimary }]}>
              {t("reserva.flujo.pasajeros", { count: vehiculo.pasajeros ?? 5, defaultValue: `${vehiculo.pasajeros ?? 5} pasajeros` })}
            </Text>
          </View>

          {/* Puertas */}
          <View style={styles.caracteristicaItem}>
            <View style={styles.caracteristicaLabelRow}>
              <Ionicons name="grid-outline" size={13} color="#8898AA" />
              <Text style={styles.caracteristicaLabel}>
                {t("reserva.flujo.puertas", { defaultValue: "Puertas" })}
              </Text>
            </View>
            <Text style={[styles.caracteristicaValor, { color: c.textPrimary }]}>
              {vehiculo.puertas ?? 5}
            </Text>
          </View>

          {/* Maletero */}
          <View style={styles.caracteristicaItem}>
            <View style={styles.caracteristicaLabelRow}>
              <MaterialIcons name="luggage" size={13} color="#8898AA" />
              <Text style={styles.caracteristicaLabel}>
                {t("reserva.flujo.maletero", { defaultValue: "Maletero" })}
              </Text>
            </View>
            <Text style={[styles.caracteristicaValor, { color: c.textPrimary }]}>
              {`${vehiculo.maletero ?? 320} L`}
            </Text>
          </View>

          {/* Motor */}
          <View style={styles.caracteristicaItem}>
            <View style={styles.caracteristicaLabelRow}>
              <Ionicons name="flash-outline" size={13} color="#8898AA" />
              <Text style={styles.caracteristicaLabel}>
                {t("reserva.flujo.motor", { defaultValue: "Motor" })}
              </Text>
            </View>
            <Text style={[styles.caracteristicaValor, { color: c.textPrimary }]}>
              {vehiculo.cilindraje || "1.6L"}
            </Text>
          </View>

          {/* Color */}
          <View style={styles.caracteristicaItem}>
            <View style={styles.caracteristicaLabelRow}>
              <Ionicons name="color-palette-outline" size={13} color="#8898AA" />
              <Text style={styles.caracteristicaLabel}>
                {t("reserva.flujo.color", { defaultValue: "Color" })}
              </Text>
            </View>
            <Text style={[styles.caracteristicaValor, { color: c.textPrimary }]}>
              {vehiculo.color || "Gris Highland"}
            </Text>
          </View>

          {/* Año */}
          <View style={styles.caracteristicaItem}>
            <View style={styles.caracteristicaLabelRow}>
              <Ionicons name="calendar-outline" size={13} color="#8898AA" />
              <Text style={styles.caracteristicaLabel}>
                {t("reserva.flujo.ano", { defaultValue: "Año" })}
              </Text>
            </View>
            <Text style={[styles.caracteristicaValor, { color: c.textPrimary }]}>
              {vehiculo.año ?? 2023}
            </Text>
          </View>

          {/* Placa */}
          <View style={styles.caracteristicaItem}>
            <View style={styles.caracteristicaLabelRow}>
              <Ionicons name="card-outline" size={13} color="#8898AA" />
              <Text style={styles.caracteristicaLabel}>
                {t("reserva.flujo.placa", { defaultValue: "Placa" })}
              </Text>
            </View>
            <Text style={[styles.caracteristicaValor, { color: c.textPrimary }]}>
              {vehiculo.placa || "PQR-678"}
            </Text>
          </View>
        </View>
      </View>

      {/* --- SUB-TARJETA 6: REQUISITOS PARA RENTAR --- */}
      <View style={[styles.subCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <View style={styles.headerConIcono}>
          <MaterialIcons name="assignment-turned-in" size={16} color={COLOR_MARCA} />
          <Text style={styles.tituloHeaderConIcono}>
            {t("reserva.flujo.requisitosParaRentar", { defaultValue: "Requisitos para rentar" })}
          </Text>
        </View>

        <View style={styles.requisitosLista}>
          {/* Requisito 1: Edad mínima */}
          <View style={styles.requisitoItem}>
            <Ionicons name="person" size={16} color="#8898AA" style={styles.requisitoIcono} />
            <View style={styles.requisitoTextCol}>
              <Text style={[styles.requisitoTitulo, { color: c.textPrimary }]}>
                {t("reserva.flujo.edadMinimaTitulo", { defaultValue: "Edad mínima" })}
              </Text>
              <Text style={[styles.requisitoDesc, { color: c.textSecondary }]}>
                {t("reserva.flujo.edadMinimaDesc", { defaultValue: "Debes tener al menos 21 años para rentar." })}
              </Text>
            </View>
          </View>

          {/* Requisito 2: Identificación */}
          <View style={styles.requisitoItem}>
            <MaterialIcons name="badge" size={16} color="#8898AA" style={styles.requisitoIcono} />
            <View style={styles.requisitoTextCol}>
              <Text style={[styles.requisitoTitulo, { color: c.textPrimary }]}>
                {t("reserva.flujo.identificacionTitulo", { defaultValue: "Identificación" })}
              </Text>
              <Text style={[styles.requisitoDesc, { color: c.textSecondary }]}>
                {t("reserva.flujo.identificacionDesc", {
                  defaultValue: "Cédula de ciudadanía para nacionales o pasaporte vigente para extranjeros.",
                })}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Modal interactivo de Cómo llegar */}
      <BranchDirectionsModal
        visible={modalComoLlegarVisible}
        nombreSucursal={nombreSucursal}
        direccion={direccionCompleta}
        horario={horarioAtencion}
        onCerrar={() => setModalComoLlegarVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cardPadre: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 0,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  subCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  nombre: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  imagenPrincipal: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
  },
  imagenPrincipalImg: {
    width: "100%",
    height: "100%",
  },
  imagenFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRating: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeRatingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  arrowBtn: {
    position: "absolute",
    top: "50%",
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowLeft: {
    left: 8,
  },
  arrowRight: {
    right: 8,
  },
  thumbsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  thumbWrap: {
    flex: 1,
    height: 54,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  thumbWrapActivo: {
    borderColor: COLOR_MARCA,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbInactivo: {
    opacity: 0.85,
  },
  headerConIcono: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  tituloHeaderConIcono: {
    fontSize: 12,
    fontWeight: "600",
    color: COLOR_MARCA,
    letterSpacing: 0.3,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  descripcionTexto: {
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "400",
  },
  sucursalNombre: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  infoFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  infoTexto: {
    fontSize: 12,
    fontWeight: "400",
    flex: 1,
  },
  btnComoLlegar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 4,
  },
  btnComoLlegarTexto: {
    fontSize: 12,
    fontWeight: "600",
  },
  picoPlacaTexto: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "400",
    marginBottom: 12,
  },
  btnPicoPlaca: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 9,
    width: "100%",
  },
  btnPicoPlacaTexto: {
    fontSize: 12,
    fontWeight: "600",
  },
  caracteristicasGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 14,
    marginTop: 6,
  },
  caracteristicaItem: {
    width: "50%",
    paddingRight: 8,
  },
  caracteristicaLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  caracteristicaLabel: {
    fontSize: 11,
    fontWeight: "400",
    color: "#8898AA",
  },
  caracteristicaValor: {
    fontSize: 13,
    fontWeight: "500",
  },
  requisitosLista: {
    gap: 12,
    marginTop: 6,
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
    fontSize: 12.5,
    fontWeight: "500",
    marginBottom: 2,
  },
  requisitoDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "400",
  },
});