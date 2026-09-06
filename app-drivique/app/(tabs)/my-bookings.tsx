import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { GRADIENTES } from "@/constants/gradients";
import { COLOR_MARCA } from "@/modules/catalog/constants/catalog.constants";
import { IdiomaKey } from "@/modules/i18n";
import { useIdioma, useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import {
  GrupoReserva,
  ReservaGuardada,
  calcularGrupoReserva,
  reservaPersistService,
} from "@/modules/reservation/services/reservationPersistService";
import { ResenaGuardada, resenaService } from "@/modules/reservation/services/resenaService";
import { ModalCalificar } from "@/modules/reservation/components/ModalCalificar";
import { fmt } from "@/modules/reservation/components/BookingSummaryModal.pieces";
import { Vehiculo } from "@/modules/catalog/types/catalog.types";
import { AlertModal } from "@/components/ui/AlertModal";
import { useUsuarioStore } from "@/store/userStore";

const COLOR_GRUPO: Record<GrupoReserva, string> = {
  pendiente: "#f59e0b",
  confirmada: "#2563eb",
  en_curso: "#16a34a",
  finalizada: "#6b7280",
  cancelada: "#dc2626",
};

const ORDEN_GRUPOS: GrupoReserva[] = ["pendiente", "confirmada", "en_curso", "finalizada", "cancelada"];

// Mapa de idioma de la app -> locale BCP-47 para nombres de mes localizados
const LOCALE_POR_IDIOMA: Record<IdiomaKey, string> = {
  es: "es-CO",
  en: "en-US",
  fr: "fr-FR",
  pt: "pt-PT",
  br: "pt-BR",
};

function claveMes(fecha: string): string {
  return fecha.slice(0, 7); // "YYYY-MM"
}

function etiquetaMes(claveYYYYMM: string, locale: string): string {
  const fecha = new Date(claveYYYYMM + "-01T00:00:00");
  const texto = fecha.toLocaleDateString(locale, { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function etiquetaMesCorto(claveYYYYMM: string, locale: string): string {
  const fecha = new Date(claveYYYYMM + "-01T00:00:00");
  const texto = fecha.toLocaleDateString(locale, { month: "short" }).replace(".", "");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatFechaCard(fechaStr: string | null | undefined, locale: string): string {
  if (!fechaStr) return "—";
  try {
    const d = new Date(fechaStr.includes("T") ? fechaStr : fechaStr + "T00:00:00");
    return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return fechaStr;
  }
}

export default function MisReservasScreen() {
  const insets = useSafeAreaInsets();
  const c = useTemaColores();
  const { t } = useTranslation();
  const { idiomaActual } = useIdioma();
  const usuario = useUsuarioStore((state) => state.usuario);
  const usuarioId = usuario.id;
  const usuarioCorreo = usuario.correo;
  const usuarioDocumento = usuario.numeroDocumento;
  const usuarioKey = usuarioId || usuarioCorreo || usuarioDocumento;
  const [reservas, setReservas] = useState<ReservaGuardada[]>([]);
  const [cargando, setCargando] = useState(true);

  const [filtroGrupo, setFiltroGrupo] = useState<GrupoReserva | "todas">("todas");
  const [modalEstadoVisible, setModalEstadoVisible] = useState(false);
  const [modalMesVisible, setModalMesVisible] = useState(false);
  const [filtroMes, setFiltroMes] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      (async () => {
        const data = await reservaPersistService.getReservasUsuario({
          id: usuarioId,
          correo: usuarioCorreo,
          numeroDocumento: usuarioDocumento,
        });
        if (activo) {
          setReservas(
            [...data].sort((a, b) => {
              const fechaA = String(a.fechaRetiro || a.fechaReserva || "");
              const fechaB = String(b.fechaRetiro || b.fechaReserva || "");
              return fechaB.localeCompare(fechaA);
            })
          );
          setCargando(false);
        }
      })();
      return () => {
        activo = false;
      };
    }, [usuarioId, usuarioCorreo, usuarioDocumento])
  );

  const hayFiltrosActivos = filtroGrupo !== "todas" || !!filtroMes;

  const limpiarFiltros = () => {
    setFiltroGrupo("todas");
    setFiltroMes(null);
  };

  const locale = LOCALE_POR_IDIOMA[idiomaActual] ?? "es-CO";

  const anioActual = new Date().getFullYear();
  const mesesDelAnio = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const clave = `${anioActual}-${String(i + 1).padStart(2, "0")}`;
      return { clave, etiqueta: etiquetaMesCorto(clave, locale) };
    });
  }, [anioActual, locale]);

  const hayReservaEnMes = (claveDelMes: string) =>
    reservas.some((r) => {
      const fecha = r.fechaRetiro ? String(r.fechaRetiro) : r.fechaReserva;
      return !!fecha && claveMes(fecha) === claveDelMes;
    });

  const seleccionarMes = (clave: string | null) => {
    setFiltroMes(clave);
    setModalMesVisible(false);
    if (clave && !hayReservaEnMes(clave)) {
      Alert.alert(t("misReservas.sinResultadosFiltroTitulo"), t("misReservas.sinReservasEnMes", { mes: etiquetaMes(clave, locale) }));
    }
  };

  const reservasFiltradas = useMemo(() => {
    return reservas.filter((r) => {
      if (filtroGrupo !== "todas" && calcularGrupoReserva(r) !== filtroGrupo) return false;
      if (filtroMes) {
        const fecha = r.fechaRetiro ? String(r.fechaRetiro) : r.fechaReserva;
        if (!fecha || claveMes(fecha) !== filtroMes) return false;
      }
      return true;
    });
  }, [reservas, filtroGrupo, filtroMes]);

  const irADetalle = (referencia: string) =>
    router.push(`/payment-response?ref=${encodeURIComponent(referencia)}`);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
      <LinearGradient
        colors={GRADIENTES.boton.colors}
        start={GRADIENTES.boton.start}
        end={GRADIENTES.boton.end}
        style={styles.header}
      >
        <Text style={[styles.headerTitulo, { color: "#ffffff" }]}>{t("misReservas.titulo")}</Text>
        <Text style={[styles.headerSubtitulo, { color: "rgba(255,255,255,0.7)" }]}>
          {t("misReservas.subtitulo")}
        </Text>
      </LinearGradient>

      {!cargando && reservas.length > 0 && (
        <View style={[styles.filtrosWrap, { borderColor: c.border, backgroundColor: c.bgCard }]}>
          <View style={styles.filtrosCabecera}>
            <View style={[styles.filtrosIcono, { backgroundColor: c.primaryBg }]}>
              <Ionicons name="options-outline" size={18} color={c.primary} />
            </View>
            <Text style={[styles.filtrosTitulo, { color: c.textPrimary }]}>{t("misReservas.filtros")}</Text>
            {hayFiltrosActivos && (
              <TouchableOpacity onPress={limpiarFiltros} activeOpacity={0.7}>
                <Text style={[styles.limpiarBtnTexto, { color: c.primary }]}>{t("misReservas.limpiarFiltros")}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.selectoresFila}>
            <SelectorFiltro
              icono="flag-outline"
              etiqueta={t("misReservas.filtrarPorEstado")}
              valor={filtroGrupo === "todas" ? t("misReservas.todas") : t(`misReservas.grupos.${filtroGrupo}`)}
              activo={filtroGrupo !== "todas"}
              onPress={() => setModalEstadoVisible(true)}
              c={c}
            />
            <SelectorFiltro
              icono="calendar-outline"
              etiqueta={t("misReservas.filtrarPorMes")}
              valor={filtroMes ? etiquetaMes(filtroMes, locale) : t("misReservas.todosLosMeses")}
              activo={!!filtroMes}
              onPress={() => setModalMesVisible(true)}
              c={c}
            />
          </View>

          <Modal visible={modalEstadoVisible} transparent animationType="fade" onRequestClose={() => setModalEstadoVisible(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setModalEstadoVisible(false)}>
              <Pressable style={[styles.modalCard, { backgroundColor: c.bgCard }]} onPress={() => {}}>
                <Text style={[styles.modalTitulo, { color: c.textPrimary }]}>{t("misReservas.filtrarPorEstado")}</Text>
                {(["todas", ...ORDEN_GRUPOS] as const).map((grupo) => {
                  const activo = filtroGrupo === grupo;
                  return (
                    <TouchableOpacity
                      key={grupo}
                      style={[styles.opcionEstado, { borderBottomColor: c.border }]}
                      onPress={() => { setFiltroGrupo(grupo); setModalEstadoVisible(false); }}
                    >
                      <Text style={[styles.opcionEstadoTexto, { color: activo ? c.primary : c.textPrimary }]}>
                        {grupo === "todas" ? t("misReservas.todas") : t(`misReservas.grupos.${grupo}`)}
                      </Text>
                      {activo && <Ionicons name="checkmark-circle" size={20} color={c.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </Pressable>
            </Pressable>
          </Modal>

          <Modal
            visible={modalMesVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setModalMesVisible(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setModalMesVisible(false)}>
              <Pressable style={[styles.modalCard, { backgroundColor: c.bgCard }]} onPress={() => {}}>
                <Text style={[styles.modalTitulo, { color: c.textPrimary }]}>{t("misReservas.filtrarPorMes")}</Text>

                <View style={styles.mesesGrid}>
                  {mesesDelAnio.map((m) => (
                    <TouchableOpacity
                      key={m.clave}
                      style={[styles.celdaMes, { backgroundColor: filtroMes === m.clave ? COLOR_MARCA : c.bgInput }]}
                      onPress={() => seleccionarMes(m.clave)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.celdaMesTexto, { color: filtroMes === m.clave ? "#fff" : c.textPrimary }]}>
                        {m.etiqueta}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.todosMesesBtn} onPress={() => seleccionarMes(null)} activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.todosMesesTexto,
                      { color: !filtroMes ? c.primary : c.textSecondary, fontWeight: !filtroMes ? "800" : "600" },
                    ]}
                  >
                    {t("misReservas.todosLosMeses")}
                  </Text>
                  {!filtroMes && <Ionicons name="checkmark" size={16} color={c.primary} />}
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      )}

      {!cargando && reservas.length > 0 && reservasFiltradas.length > 0 && (
        <View style={styles.conteoWrap}>
          <Text style={[styles.conteoTexto, { color: c.textSecondary }]}>
            {t("misReservas.conteo", {
              count: reservasFiltradas.length,
              defaultValue: `${reservasFiltradas.length} ${reservasFiltradas.length === 1 ? "reserva encontrada" : "reservas encontradas"}`,
            })}
          </Text>
        </View>
      )}

      {!cargando && reservas.length > 0 && reservasFiltradas.length > 0 && (
        <FlatList
          data={reservasFiltradas}
          keyExtractor={(item) => item.referencia}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TarjetaReserva
              reserva={item}
              usuarioId={usuarioKey}
              c={c}
              t={t}
              locale={locale}
              onPress={() => irADetalle(item.referencia)}
            />
          )}
        />
      )}

      {!cargando && reservas.length > 0 && reservasFiltradas.length === 0 && (
        <View style={styles.vacioContainer}>
          <Ionicons name="search-outline" size={40} color={c.textMuted} />
          <Text style={[styles.vacioTitulo, { color: c.textPrimary }]}>{t("misReservas.sinResultadosFiltroTitulo")}</Text>
          <Text style={[styles.vacioTexto, { color: c.textMuted }]}>{t("misReservas.sinResultadosFiltro")}</Text>
          <TouchableOpacity onPress={limpiarFiltros}>
            <Text style={[styles.limpiarBtnTexto, { color: c.primary, fontSize: 13 }]}>{t("misReservas.limpiarFiltros")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!cargando && reservas.length === 0 && (
        <View style={styles.vacioContainer}>
          <View style={[styles.vacioIconoWrap, { backgroundColor: c.primaryBg }]}>
            <Ionicons name="receipt-outline" size={40} color={COLOR_MARCA} />
          </View>
          <Text style={[styles.vacioTitulo, { color: c.textPrimary }]}>{t("misReservas.vacioTitulo")}</Text>
          <Text style={[styles.vacioTexto, { color: c.textMuted }]}>
            {t("misReservas.vacioTexto")}
          </Text>
          <TouchableOpacity
            style={styles.vacioBtnWrap}
            onPress={() => router.push("/(tabs)/catalog")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={GRADIENTES.boton.colors}
              start={GRADIENTES.boton.start}
              end={GRADIENTES.boton.end}
              style={styles.vacioBtn}
            >
              <Ionicons name="car-sport-outline" size={16} color="#fff" />
              <Text style={styles.vacioBtnText}>{t("misReservas.explorarVehiculos")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function SelectorFiltro({
  icono,
  etiqueta,
  valor,
  activo,
  onPress,
  c,
}: {
  icono: React.ComponentProps<typeof Ionicons>["name"];
  etiqueta: string;
  valor: string;
  activo: boolean;
  onPress: () => void;
  c: ReturnType<typeof useTemaColores>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.selectorFiltro,
        {
          backgroundColor: activo ? c.primaryBg : c.bgInput,
          borderColor: activo ? c.primary : c.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.selectorFiltroSuperior}>
        <Ionicons name={icono} size={14} color={activo ? c.primary : c.textMuted} />
        <Text style={[styles.selectorFiltroEtiqueta, { color: c.textMuted }]} numberOfLines={1}>{etiqueta}</Text>
      </View>
      <View style={styles.selectorFiltroInferior}>
        <Text style={[styles.selectorFiltroValor, { color: activo ? c.primary : c.textPrimary }]} numberOfLines={1}>{valor}</Text>
        <Ionicons name="chevron-down" size={14} color={activo ? c.primary : c.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function TarjetaReserva({
  reserva,
  usuarioId,
  c,
  t,
  locale,
  onPress,
}: {
  reserva: ReservaGuardada;
  usuarioId: string;
  c: ReturnType<typeof useTemaColores>;
  t: (key: string, opts?: any) => string;
  locale: string;
  onPress: () => void;
}) {
  const grupo = calcularGrupoReserva(reserva);
  const primaryAccent = c.oscuro ? "#60A5FA" : COLOR_MARCA;
  const vehiculoSnap = reserva.vehiculoSnapshot as Vehiculo | undefined;
  const foto = vehiculoSnap?.imagenes?.[0];

  const sucursalNombre =
    reserva.lugarRetiro ||
    (reserva.fechasLugarSnapshot as any)?.lugarRetiro ||
    (reserva.vehiculoSnapshot as any)?.sucursal ||
    "Sucursal Drivique";

  const [resena, setResena] = useState<ResenaGuardada | null>(null);
  const [modalCalificarVisible, setModalCalificarVisible] = useState(false);
  const [alertGuardadoVisible, setAlertGuardadoVisible] = useState(false);

  useEffect(() => {
    if (grupo !== "finalizada") return;
    let activo = true;
    resenaService.obtenerPorReserva(reserva.referencia, usuarioId).then((r) => {
      if (activo) setResena(r);
    });
    return () => {
      activo = false;
    };
  }, [grupo, reserva.referencia, usuarioId]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.tarjeta,
        {
          backgroundColor: c.bgCard,
          borderColor: c.border,
        },
      ]}
      onPress={onPress}
    >
      {/* Cabecera Superior: Estado Badge (izq) y Total (der) */}
      <View style={styles.tarjetaTopHeader}>
        <View
          style={[
            styles.badgeEstado,
            {
              backgroundColor:
                grupo === "pendiente"
                  ? c.oscuro ? "#2E2004" : "#FEFCE8"
                  : grupo === "en_curso"
                  ? c.oscuro ? "#052E16" : "#F0FDF4"
                  : grupo === "confirmada"
                  ? c.oscuro ? "#172554" : "#EFF6FF"
                  : grupo === "cancelada"
                  ? c.oscuro ? "#450A0A" : "#FEF2F2"
                  : c.oscuro ? "#1E293B" : "#F8FAFC",
              borderColor:
                grupo === "pendiente"
                  ? c.oscuro ? "#854D0E" : "#FDE047"
                  : grupo === "en_curso"
                  ? c.oscuro ? "#166534" : "#86EFAC"
                  : grupo === "confirmada"
                  ? c.oscuro ? "#1E40AF" : "#93C5FD"
                  : grupo === "cancelada"
                  ? c.oscuro ? "#991B1B" : "#FCA5A5"
                  : c.oscuro ? "#475569" : "#CBD5E1",
            },
          ]}
        >
          <Text
            style={[
              styles.badgeEstadoTexto,
              {
                color:
                  grupo === "pendiente"
                    ? c.oscuro ? "#FCD34D" : "#B45309"
                    : grupo === "en_curso"
                    ? c.oscuro ? "#4ADE80" : "#16A34A"
                    : grupo === "confirmada"
                    ? c.oscuro ? "#60A5FA" : "#2563EB"
                    : grupo === "cancelada"
                    ? c.oscuro ? "#F87171" : "#DC2626"
                    : c.oscuro ? "#94A3B8" : "#64748B",
              },
            ]}
            numberOfLines={1}
          >
            {t(`misReservas.grupos.${grupo}`, { defaultValue: grupo.toUpperCase() }).toUpperCase()}
          </Text>
        </View>

        <Text style={[styles.tarjetaTotalTexto, { color: primaryAccent }]}>
          {fmt(reserva.total)}
        </Text>
      </View>

      {/* Sección Vehículo: Foto + Referencia y Nombre */}
      <View style={styles.tarjetaVehiculoFila}>
        {foto ? (
          <Image source={{ uri: foto }} style={[styles.tarjetaFoto, { backgroundColor: c.bgInput }]} />
        ) : (
          <View style={[styles.tarjetaFotoVacia, { backgroundColor: c.bgInput }]}>
            <Ionicons name="car-sport-outline" size={26} color={c.textMuted} />
          </View>
        )}

        <View style={styles.tarjetaVehiculoInfo}>
          <Text style={[styles.tarjetaRefTexto, { color: primaryAccent }]} numberOfLines={1}>
            RESERVA #{reserva.referencia}
          </Text>
          <Text style={[styles.tarjetaVehiculoTitulo, { color: c.textPrimary }]} numberOfLines={2}>
            {reserva.vehiculoNombre}
          </Text>
        </View>
      </View>

      {/* Contenedor de Fechas y Sucursal */}
      <View style={[styles.infoCardBox, { backgroundColor: c.bgInput, borderColor: c.border }]}>
        {/* Fila Fechas Recogida -> Devolución */}
        <View style={styles.fechasRow}>
          <View style={styles.fechaCol}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="calendar-outline" size={12} color={primaryAccent} />
              <Text style={[styles.infoLabelText, { color: c.textMuted }]}>
                {t("misReservas.card.recogida", { defaultValue: "RECOGIDA" })}
              </Text>
            </View>
            <Text style={[styles.infoValorText, { color: c.textPrimary }]} numberOfLines={1}>
              {formatFechaCard(reserva.fechaRetiro ? String(reserva.fechaRetiro) : null, locale)}
            </Text>
          </View>

          <View style={styles.fechaFlechaCol}>
            <Ionicons name="arrow-forward" size={14} color={c.textMuted} />
          </View>

          <View style={styles.fechaCol}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="calendar-outline" size={12} color={primaryAccent} />
              <Text style={[styles.infoLabelText, { color: c.textMuted }]}>
                {t("misReservas.card.devolucion", { defaultValue: "DEVOLUCIÓN" })}
              </Text>
            </View>
            <Text style={[styles.infoValorText, { color: c.textPrimary }]} numberOfLines={1}>
              {formatFechaCard(reserva.fechaDevolucion ? String(reserva.fechaDevolucion) : null, locale)}
            </Text>
          </View>
        </View>

        {/* Separador sutil */}
        <View style={[styles.infoBoxDivider, { backgroundColor: c.border }]} />

        {/* Sucursal */}
        <View style={styles.sucursalRow}>
          <View style={styles.infoLabelRow}>
            <Ionicons name="location-outline" size={12} color={primaryAccent} />
            <Text style={[styles.infoLabelText, { color: c.textMuted }]}>
              {t("misReservas.card.sucursal", { defaultValue: "SUCURSAL" })}
            </Text>
          </View>
          <Text style={[styles.infoValorText, { color: c.textPrimary, marginTop: 2 }]} numberOfLines={2}>
            {sucursalNombre}
          </Text>
        </View>
      </View>

      {/* Fila Inferior de Acciones */}
      <View style={styles.tarjetaAccionesFila}>
        {/* Botón para reportar incidencia */}
        {(grupo === "confirmada" || grupo === "en_curso") && (
          <TouchableOpacity
            style={[
              styles.reportarBtn,
              {
                backgroundColor: c.oscuro ? "rgba(220, 38, 38, 0.15)" : "#FEF2F2",
                borderColor: c.oscuro ? "#991B1B" : "#FECACA",
              },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              router.push({
                pathname: "/(tabs)/support",
                params: {
                  reservaId: reserva.referencia,
                  vehiculoNombre: reserva.vehiculoNombre,
                  ...(vehiculoSnap?.placa ? { placa: vehiculoSnap.placa } : {}),
                },
              } as any);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="flag-outline" size={13} color={c.oscuro ? "#F87171" : "#DC2626"} />
            <Text style={[styles.reportarBtnText, { color: c.oscuro ? "#F87171" : "#DC2626" }]}>
              {t("tabs.hacerReporte", { defaultValue: "Hacer reporte" })}
            </Text>
          </TouchableOpacity>
        )}

        {/* Botón Calificar viaje si está finalizada */}
        {grupo === "finalizada" && (
          <TouchableOpacity
            style={[styles.reportarBtn, { backgroundColor: c.bgInput, borderColor: c.border }]}
            onPress={(e) => {
              e.stopPropagation();
              setModalCalificarVisible(true);
            }}
            activeOpacity={0.8}
          >
            {resena ? (
              <>
                <View style={{ flexDirection: "row", gap: 1 }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Ionicons
                      key={i}
                      name={i < resena.calificacion ? "star" : "star-outline"}
                      size={12}
                      color="#F59E0B"
                    />
                  ))}
                </View>
                <Text style={[styles.reportarBtnText, { color: c.primary }]} numberOfLines={1}>
                  {t("misReservas.editarCalificacion", { defaultValue: "Editar calificación" })}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="star-outline" size={13} color={c.primary} />
                <Text style={[styles.reportarBtnText, { color: c.primary }]}>
                  {t("misReservas.calificarViaje", { defaultValue: "Calificar viaje" })}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Botón Ver Detalle con Gradiente */}
        <TouchableOpacity
          style={styles.verDetalleBtnWrap}
          onPress={onPress}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={GRADIENTES.boton.colors}
            start={GRADIENTES.boton.start}
            end={GRADIENTES.boton.end}
            style={styles.verDetalleBtn}
          >
            <Text style={styles.verDetalleBtnTexto}>
              {t("catalogo.verDetalles", { defaultValue: "Ver detalle" })}
            </Text>
            <Ionicons name="chevron-forward" size={13} color="#FFFFFF" style={{ marginLeft: 3 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {grupo === "finalizada" && (
        <>
          <ModalCalificar
            visible={modalCalificarVisible}
            referenciaReserva={reserva.referencia}
            usuarioId={usuarioId}
            valorInicial={resena}
            onCerrar={() => setModalCalificarVisible(false)}
            onGuardado={(nuevaResena) => {
              setResena(nuevaResena);
              setModalCalificarVisible(false);
              setAlertGuardadoVisible(true);
            }}
          />
          <AlertModal
            visible={alertGuardadoVisible}
            icono="checkmark-circle-outline"
            titulo={t("misReservas.calificacionGuardadaTitulo")}
            mensaje={t("misReservas.calificacionGuardadaMensaje")}
            onCerrar={() => setAlertGuardadoVisible(false)}
          />
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitulo: { fontSize: 20, fontWeight: "800" },
  headerSubtitulo: { fontSize: 13, marginTop: 4 },

  filtrosWrap: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 2,
    padding: 14,
    borderWidth: 1,
    borderRadius: 16,
  },
  filtrosCabecera: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  filtrosIcono: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  filtrosTitulo: { flex: 1, marginLeft: 9, fontSize: 14, fontWeight: "800" },
  limpiarBtnTexto: { fontSize: 12, fontWeight: "700" },
  selectoresFila: { flexDirection: "row", gap: 10 },
  selectorFiltro: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 12, padding: 10 },
  selectorFiltroSuperior: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 5 },
  selectorFiltroInferior: { flexDirection: "row", alignItems: "center", gap: 4 },
  selectorFiltroEtiqueta: { flex: 1, fontSize: 10, fontWeight: "600" },
  selectorFiltroValor: { flex: 1, fontSize: 12, fontWeight: "800" },
  opcionEstado: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 46,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  opcionEstadoTexto: { fontSize: 14, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
  },
  modalTitulo: { fontSize: 16, fontWeight: "800", marginBottom: 14 },
  mesesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  celdaMes: {
    width: "31%",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  celdaMesTexto: { fontSize: 13, fontWeight: "700" },
  todosMesesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
  },
  todosMesesTexto: { fontSize: 13.5 },

  conteoWrap: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 2,
  },
  conteoTexto: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  lista: { padding: 16, paddingBottom: 40 },
  tarjeta: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  tarjetaTopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badgeEstado: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeEstadoTexto: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  tarjetaTotalTexto: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  tarjetaVehiculoFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  tarjetaFoto: {
    width: 105,
    height: 70,
    borderRadius: 10,
    resizeMode: "cover",
  },
  tarjetaFotoVacia: {
    width: 105,
    height: 70,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tarjetaVehiculoInfo: {
    flex: 1,
    justifyContent: "center",
  },
  tarjetaRefTexto: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  tarjetaVehiculoTitulo: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
  },

  infoCardBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 11,
    marginBottom: 14,
  },
  fechasRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fechaCol: {
    flex: 1,
  },
  fechaFlechaCol: {
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  infoLabelText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  infoValorText: {
    fontSize: 12,
    fontWeight: "700",
  },
  infoBoxDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 9,
  },
  sucursalRow: {
    marginTop: 1,
  },

  tarjetaAccionesFila: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  reportarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7.5,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
  },
  reportarBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  verDetalleBtnWrap: {
    borderRadius: 9,
    overflow: "hidden",
  },
  verDetalleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9,
    justifyContent: "center",
  },
  verDetalleBtnTexto: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  vacioContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 6,
  },
  vacioIconoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  vacioTitulo: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
    textAlign: "center",
  },
  vacioTexto: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 14,
  },
  vacioBtnWrap: {
    borderRadius: 12,
    marginTop: 8,
  },
  vacioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 12,
  },
  vacioBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
