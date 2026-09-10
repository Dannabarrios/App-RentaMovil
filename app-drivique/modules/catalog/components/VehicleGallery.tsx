// modules/catalog/components/VehicleGallery.tsx
import React, { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";

interface Props {
  imagenes: string[];
  calificacion?: number;
  borderColor?: string;
  style?: any;
}

export function VehicleGallery({ imagenes, calificacion, borderColor, style }: Props) {
  const c = useTemaColores();
  const [activa, setActiva] = useState(0);

  const finalBorderColor = borderColor || (c.oscuro ? c.border : "#E2E8F0");

  if (imagenes.length === 0) {
    return (
      <View style={[s.card, { backgroundColor: c.bgCard, borderColor: finalBorderColor }, style]}>
        <View style={[s.principal, s.principalVacio, { backgroundColor: c.bgInput }]}>
          <Ionicons name="car-outline" size={56} color={c.textMuted} />
        </View>
      </View>
    );
  }

  const irAnterior = () => {
    if (imagenes.length <= 1) return;
    setActiva((prev) => (prev > 0 ? prev - 1 : imagenes.length - 1));
  };

  const irSiguiente = () => {
    if (imagenes.length <= 1) return;
    setActiva((prev) => (prev < imagenes.length - 1 ? prev + 1 : 0));
  };

  return (
    <View style={[s.card, { backgroundColor: c.bgCard, borderColor: finalBorderColor }, style]}>
      {/* Imagen Principal */}
      <View style={[s.principalContainer, { backgroundColor: c.bgInput }]}>
        <Image source={{ uri: imagenes[activa] }} style={s.principal} resizeMode="cover" />

        {/* Badge Calificación / Nuevo */}
        <View style={s.badge}>
          <Ionicons name="star" size={12} color="#FBBF24" />
          <Text style={s.badgeTexto}>
            {calificacion && calificacion > 0 ? calificacion.toFixed(1) : "Nuevo"}
          </Text>
        </View>

        {/* Flechas de navegación */}
        {imagenes.length > 1 && (
          <>
            <TouchableOpacity
              style={[s.arrowBtn, s.arrowLeft]}
              onPress={irAnterior}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.arrowBtn, s.arrowRight]}
              onPress={irSiguiente}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Fila de Miniaturas */}
      {imagenes.length > 1 && (
        <View style={s.miniaturasFila}>
          {imagenes.slice(0, 3).map((uri, i) => {
            const esActiva = i === activa;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => setActiva(i)}
                activeOpacity={0.8}
                style={[
                  s.miniaturaWrap,
                  {
                    borderColor: esActiva ? "#2563EB" : "transparent",
                  },
                ]}
              >
                <Image
                  source={{ uri }}
                  style={[s.miniatura, !esActiva && s.miniaturaInactiva]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  principalContainer: {
    width: "100%",
    aspectRatio: 16 / 10.5,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
  },
  principal: {
    width: "100%",
    height: "100%",
  },
  principalVacio: {
    alignItems: "center",
    justifyContent: "center",
    aspectRatio: 16 / 10.5,
    borderRadius: 14,
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeTexto: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  arrowBtn: {
    position: "absolute",
    top: "50%",
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowLeft: {
    left: 8,
  },
  arrowRight: {
    right: 8,
  },
  miniaturasFila: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  miniaturaWrap: {
    flex: 1,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
  },
  miniatura: {
    width: "100%",
    height: "100%",
  },
  miniaturaInactiva: {
    opacity: 0.75,
  },
});