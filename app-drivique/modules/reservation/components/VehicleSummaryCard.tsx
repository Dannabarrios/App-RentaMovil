import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Vehiculo } from "@/modules/catalog/types/catalog.types";
import { COLOR_MARCA, COLORES } from "../constants/reservation.constants";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import { useMonedaStore } from "@/store/currencyStore";
import { formatCurrency } from "@/utils/currencyUtils";

interface Props {
  vehiculo: Vehiculo;
}

function getSafeImage(vehiculo: Vehiculo): string | null {
  const imgs = vehiculo.imagenes ?? [];
  const filtradas = imgs.filter(Boolean);
  if (filtradas.length > 0) return filtradas[0];
  if (vehiculo.imagen) return vehiculo.imagen;
  if (vehiculo.foto) return vehiculo.foto;
  return null;
}

export default function VehiculoResumenCard({ vehiculo }: Props) {
  const c = useTemaColores();
  const { t } = useTranslation();
  const monedaActual = useMonedaStore((s) => s.monedaActual);
  const tasaUSD = useMonedaStore((s) => s.tasaUSD);

  const imagen = getSafeImage(vehiculo);
  const nombreSucursal = vehiculo.sucursal || "Alquiler Neiva - Centro";

  return (
    <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
      {/* Cabecera con Imagen */}
      <View style={[styles.imagenContenedor, { backgroundColor: c.bgInput }]}>
        {imagen ? (
          <Image source={{ uri: imagen }} style={styles.imagen} resizeMode="cover" />
        ) : (
          <View style={styles.imagenFallback}>
            <Ionicons name="car-outline" size={40} color={COLORES.imageFallbackIcon} />
          </View>
        )}

        {/* Badge de Disponibilidad */}
        <View style={styles.badgeDisponibilidad}>
          <View style={styles.puntoVerde} />
          <Text style={styles.badgeDisponibilidadText}>
            {t("catalogo.tarjeta.disponible", { defaultValue: "Disponible" })}
          </Text>
        </View>

        {/* Badge de Calificación */}
        <View style={styles.badgeRating}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={styles.badgeRatingText}>
            {(vehiculo.calificacion ?? 4.5).toFixed(1)}
          </Text>
        </View>
      </View>

      {/* Contenido / Información */}
      <View style={styles.cuerpo}>
        {/* Pills: Categoría y Sucursal */}
        <View style={styles.pillsRow}>
          <View style={[styles.pillCategoria, { backgroundColor: c.primaryBg }]}>
            <Text style={[styles.pillCategoriaText, { color: c.primary }]}>
              {t(`catalogo.categoriaValores.${vehiculo.categoria ?? "Economico"}`, {
                defaultValue: vehiculo.categoria ?? "Económico",
              })}
            </Text>
          </View>

          <View style={[styles.pillSucursal, { backgroundColor: c.bgInput }]}>
            <Ionicons name="location-outline" size={12} color={c.textMuted} />
            <Text style={[styles.pillSucursalText, { color: c.textSecondary }]} numberOfLines={1}>
              {nombreSucursal}
            </Text>
          </View>
        </View>

        {/* Nombre del vehículo */}
        <Text style={[styles.nombre, { color: c.textPrimary }]} numberOfLines={1}>
          {vehiculo.nombre}
        </Text>

        {/* Fila de características clave */}
        <View style={styles.specsRow}>
          {!!vehiculo.transmision && (
            <View style={styles.specItem}>
              <Ionicons name="settings-outline" size={13} color={c.textMuted} />
              <Text style={[styles.specText, { color: c.textSecondary }]}>
                {t(`catalogo.transmisionValores.${vehiculo.transmision}`, { defaultValue: vehiculo.transmision })}
              </Text>
            </View>
          )}

          {!!vehiculo.combustible && (
            <View style={styles.specItem}>
              <MaterialCommunityIcons name="gas-station-outline" size={13} color={c.textMuted} />
              <Text style={[styles.specText, { color: c.textSecondary }]}>
                {t(`catalogo.combustibleValores.${vehiculo.combustible}`, { defaultValue: vehiculo.combustible })}
              </Text>
            </View>
          )}

          {!!vehiculo.pasajeros && (
            <View style={styles.specItem}>
              <Ionicons name="people-outline" size={13} color={c.textMuted} />
              <Text style={[styles.specText, { color: c.textSecondary }]}>
                {vehiculo.pasajeros} {t("catalogo.detalles.personas", { defaultValue: "pasajeros" })}
              </Text>
            </View>
          )}
        </View>

        {/* Divisor */}
        <View style={[styles.divisor, { backgroundColor: c.border }]} />

        {/* Fila de Precio */}
        <View style={styles.precioRow}>
          <Text style={[styles.precioLabel, { color: c.textMuted }]}>
            {t("catalogo.tarjeta.tarifaPorDia", { defaultValue: "Tarifa diaria" })}
          </Text>
          <View style={styles.precioValorWrap}>
            <Text style={[styles.precioValor, { color: c.primary }]}>
              {formatCurrency(vehiculo.precio, monedaActual, tasaUSD)}
            </Text>
            <Text style={[styles.precioDia, { color: c.textMuted }]}>
              {" "}/ {t("vehiculo.porDia", { defaultValue: "día" })}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 4,
  },
  imagenContenedor: {
    width: "100%",
    height: 170,
    position: "relative",
    overflow: "hidden",
  },
  imagen: {
    width: "100%",
    height: "100%",
  },
  imagenFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeDisponibilidad: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  puntoVerde: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  badgeDisponibilidadText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  badgeRating: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeRatingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cuerpo: {
    padding: 14,
  },
  pillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  pillCategoria: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillCategoriaText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  pillSucursal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: "65%",
  },
  pillSucursalText: {
    fontSize: 11.5,
    fontWeight: "500",
  },
  nombre: {
    fontSize: 16.5,
    fontWeight: "800",
    marginBottom: 8,
  },
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  specItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  specText: {
    fontSize: 12,
    fontWeight: "500",
  },
  divisor: {
    height: 1,
    width: "100%",
    marginTop: 12,
    marginBottom: 10,
  },
  precioRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  precioLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  precioValorWrap: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  precioValor: {
    fontSize: 18,
    fontWeight: "900",
  },
  precioDia: {
    fontSize: 12,
    fontWeight: "500",
  },
});