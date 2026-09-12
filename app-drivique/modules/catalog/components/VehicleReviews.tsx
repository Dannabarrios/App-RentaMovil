// modules/catalog/components/VehicleReviews.tsx
import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { Comentario } from "../types/catalog.types";
import { resenaService, ResenaGuardada } from "@/modules/reservation/services/resenaService";

interface Props {
  comentarios: Comentario[];
  calificacionPromedio?: number;
  vehiculoId?: number | string;
  vehiculoNombre?: string;
}

const COLOR_BORDE_CARD = "#E2E8F0";

function Estrellas({ valor, tamano = 14 }: { valor: number; tamano?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => {
        const lleno = i < Math.round(valor);
        return (
          <Ionicons
            key={i}
            name={lleno ? "star" : "star-outline"}
            size={tamano}
            color={lleno ? "#F59E0B" : "#CBD5E1"}
          />
        );
      })}
    </View>
  );
}

function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return partes.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
}

export function VehicleReviews({ comentarios, calificacionPromedio, vehiculoId, vehiculoNombre }: Props) {
  const c = useTemaColores();
  const { t } = useTranslation();
  const [visibles, setVisibles] = useState(2);
  const [resenasLocales, setResenasLocales] = useState<ResenaGuardada[]>([]);
  const [fotoModalUri, setFotoModalUri] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    if (vehiculoId || vehiculoNombre) {
      resenaService.obtenerPorVehiculo(vehiculoId, vehiculoNombre).then((r) => {
        if (activo) setResenasLocales(r);
      });
    }
    return () => {
      activo = false;
    };
  }, [vehiculoId, vehiculoNombre]);

  // Convertimos las reseñas guardadas en formato de comentarios
  const comentariosGuardados: (Comentario & { fotos?: string[] })[] = resenasLocales.map((r) => ({
    autor: r.usuarioNombre || "Cliente Drivique",
    calificacion: r.calificacion,
    texto: r.comentario,
    fecha: r.fecha,
    fotos: r.fotos,
  }));

  // Combinamos reseñas reales primero, luego los comentarios base
  const listaComentarios: (Comentario & { fotos?: string[] })[] = [
    ...comentariosGuardados,
    ...(comentarios ?? []),
  ];

  const total = listaComentarios.length;

  const promedio =
    total > 0
      ? listaComentarios.reduce((acc, curr) => acc + curr.calificacion, 0) / total
      : calificacionPromedio && calificacionPromedio > 0
      ? calificacionPromedio
      : 4.5;

  // Conteo de estrellas de 1 a 5
  const counts = [5, 4, 3, 2, 1].map((estrella) => {
    const count = listaComentarios.filter((c) => Math.round(c.calificacion) === estrella).length;
    return { estrella, count };
  });

  const colorScore = c.oscuro ? "#93C5FD" : "#1E3A8A";
  const colorBorde = c.oscuro ? c.border : COLOR_BORDE_CARD;

  if (total === 0) {
    return (
      <View style={{ marginBottom: 14 }}>
        <Text style={[s.tituloPrincipal, { color: colorScore, marginBottom: 10 }]}>
          {t("vehiculo.resenas.titulo", { defaultValue: "Reseñas de clientes" })}
        </Text>
        <View style={[s.cardVacio, { backgroundColor: c.bgCard, borderColor: colorBorde }]}>
          <Text style={[s.vacioTitulo, { color: c.oscuro ? "#F8FAFC" : "#0F172A" }]}>
            {t("vehiculo.resenas.sinResenasTitulo", { defaultValue: "Este vehículo aún no tiene reseñas" })}
          </Text>
          <Text style={[s.vacioSubtitulo, { color: c.oscuro ? "#94A3B8" : "#64748B" }]}>
            {t("vehiculo.resenas.sinResenasSubtitulo", {
              defaultValue: "¡Anímate a reservarlo y sé el primero en compartir tu experiencia!",
            })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.card, { backgroundColor: c.bgCard, borderColor: colorBorde }]}>
      {/* Título de la sección */}
      <Text style={[s.tituloPrincipal, { color: colorScore }]}>
        {t("vehiculo.resenas.titulo", { defaultValue: "Reseñas de clientes" })}
      </Text>

      {/* Bloque Resumen: Calificación + Barras */}
      <View style={s.resumenContenedor}>
        {/* Columna Izquierda: Número grande + Estrellas + Total */}
        <View style={s.columnaPuntaje}>
          <Text style={[s.puntajeGrande, { color: colorScore }]}>{promedio.toFixed(1)}</Text>
          <Estrellas valor={promedio} tamano={15} />
          <Text style={[s.conteoTexto, { color: c.oscuro ? "#94A3B8" : "#64748B" }]}>
            {total} {total === 1 ? "reseña" : "reseñas"}
          </Text>
        </View>

        {/* Columna Derecha: Barras de 5 a 1 estrella */}
        <View style={s.columnaBarras}>
          {counts.map(({ estrella, count }) => {
            const porcentaje = total > 0 ? (count / total) * 100 : 0;
            return (
              <View key={estrella} style={s.filaBarra}>
                <Text style={[s.barraEstrellaNum, { color: c.oscuro ? "#94A3B8" : "#64748B" }]}>
                  {estrella}
                </Text>
                <Ionicons name="star" size={11} color="#F59E0B" style={{ marginRight: 6 }} />
                <View style={[s.barraTrack, { backgroundColor: c.oscuro ? "#334155" : "#EEF2F6" }]}>
                  <View
                    style={[
                      s.barraFill,
                      {
                        width: `${porcentaje}%`,
                        backgroundColor: porcentaje > 0 ? "#2563EB" : "transparent",
                      },
                    ]}
                  />
                </View>
                <Text style={[s.barraConteoNum, { color: c.oscuro ? "#94A3B8" : "#64748B" }]}>
                  {count}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Divisor */}
      {total > 0 && <View style={[s.divisor, { backgroundColor: colorBorde }]} />}

      {/* Lista de Reseñas */}
      <View style={s.listaComentarios}>
        {listaComentarios.slice(0, visibles).map((r, i) => (
          <View
            key={i}
            style={[
              s.comentarioItem,
              i > 0 && { borderTopWidth: 1, borderTopColor: colorBorde, paddingTop: 14 },
            ]}
          >
            {/* Avatar circular con iniciales */}
            <View style={[s.avatarWrap, { backgroundColor: c.oscuro ? "#334155" : "#F1F5F9" }]}>
              <Text style={[s.avatarTexto, { color: c.oscuro ? "#93C5FD" : "#1E3A8A" }]}>
                {inicialesDe(r.autor)}
              </Text>
            </View>

            {/* Contenido de la reseña */}
            <View style={s.comentarioCuerpo}>
              <View style={s.comentarioHeaderRow}>
                <Text style={[s.autorNombre, { color: c.oscuro ? "#F8FAFC" : "#0F172A" }]}>
                  {r.autor}
                </Text>
                <Estrellas valor={r.calificacion} tamano={13} />
              </View>

              {!!r.fecha && (
                <Text style={[s.fechaTexto, { color: c.oscuro ? "#94A3B8" : "#64748B" }]}>
                  {r.fecha}
                </Text>
              )}

              {!!r.texto && (
                <Text style={[s.comentarioTexto, { color: c.oscuro ? "#F8FAFC" : "#0F172A" }]}>
                  {r.texto}
                </Text>
              )}

              {/* Galería de fotos si la reseña tiene imágenes */}
              {r.fotos && r.fotos.length > 0 && (
                <View style={s.fotosResenaFila}>
                  {r.fotos.map((fotoUri, fIdx) => (
                    <TouchableOpacity
                      key={fIdx}
                      activeOpacity={0.8}
                      onPress={() => setFotoModalUri(fotoUri)}
                      style={s.fotoResenaThumbWrap}
                    >
                      <Image source={{ uri: fotoUri }} style={s.fotoResenaThumb} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Botón Ver más / Ocultar */}
      {total > 2 && (
        <>
          <View style={[s.divisor, { backgroundColor: colorBorde }]} />
          <TouchableOpacity
            style={s.verMasBtn}
            onPress={() => setVisibles((v) => (v >= total ? 2 : total))}
            activeOpacity={0.7}
          >
            <Text style={[s.verMasTexto, { color: colorScore }]}>
              {visibles >= total
                ? t("vehiculo.resenas.ocultar", { defaultValue: "Ocultar" })
                : t("vehiculo.resenas.verMas", { defaultValue: "Ver más" })}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Modal visor de foto completa */}
      <Modal
        visible={!!fotoModalUri}
        transparent
        animationType="fade"
        onRequestClose={() => setFotoModalUri(null)}
      >
        <Pressable style={s.modalFotoOverlay} onPress={() => setFotoModalUri(null)}>
          <View style={s.modalFotoContenedor}>
            {!!fotoModalUri && (
              <Image source={{ uri: fotoModalUri }} style={s.modalFotoImg} resizeMode="contain" />
            )}
            <TouchableOpacity
              style={s.modalFotoCerrarBtn}
              onPress={() => setFotoModalUri(null)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
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
  tituloPrincipal: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 16,
  },
  resumenContenedor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginBottom: 8,
  },
  columnaPuntaje: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  puntajeGrande: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    marginBottom: 2,
  },
  conteoTexto: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: "400",
  },
  columnaBarras: {
    flex: 1,
    gap: 4,
  },
  filaBarra: {
    flexDirection: "row",
    alignItems: "center",
  },
  barraEstrellaNum: {
    fontSize: 11,
    fontWeight: "700",
    width: 10,
    textAlign: "right",
    marginRight: 2,
  },
  barraTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginRight: 8,
  },
  barraFill: {
    height: "100%",
    borderRadius: 3,
  },
  barraConteoNum: {
    fontSize: 11,
    fontWeight: "400",
    width: 14,
    textAlign: "right",
  },
  divisor: {
    height: 1,
    width: "100%",
    marginVertical: 14,
  },
  cardVacio: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  vacioTitulo: {
    fontSize: 14.5,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  vacioSubtitulo: {
    fontSize: 12.5,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 18,
  },
  listaComentarios: {
    gap: 14,
  },
  comentarioItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTexto: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  comentarioCuerpo: {
    flex: 1,
  },
  comentarioHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  autorNombre: {
    fontSize: 13,
    fontWeight: "600",
  },
  fechaTexto: {
    fontSize: 11,
    fontWeight: "400",
    marginBottom: 4,
  },
  comentarioTexto: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  fotosResenaFila: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  fotoResenaThumbWrap: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  fotoResenaThumb: {
    width: "100%",
    height: "100%",
  },
  verMasBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  verMasTexto: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  modalFotoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalFotoContenedor: {
    width: "100%",
    height: "80%",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  modalFotoImg: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  modalFotoCerrarBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});