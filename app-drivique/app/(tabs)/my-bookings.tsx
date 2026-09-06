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
import { COLOR_MARCA, getDireccionSucursal } from "@/modules/catalog/constants/catalog.constants";
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
import { BranchCashPaymentModal } from "@/modules/reservation/components/BranchCashPaymentModal";
import { fmt, fechaCorta } from "@/modules/reservation/components/BookingSummaryModal.pieces";
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

  // Los 12 meses del año actual (siempre los 12, tenga o no reservas, para
  // poder filtrar por cualquier mes).
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
        <FlatList
          data={reservasFiltradas}
          keyExtractor={(item) => item.referencia}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <TarjetaReserva reserva={item} usuarioId={usuarioKey} c={c} t={t} onPress={() => irADetalle(item.referencia)} />}
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
  onPress,
}: {
  reserva: ReservaGuardada;
  usuarioId: string;
  c: ReturnType<typeof useTemaColores>;
  t: (key: string, opts?: any) => string;
  onPress: () => void;
}) {
  const grupo = calcularGrupoReserva(reserva);
  const vehiculoSnap = reserva.vehiculoSnapshot as Vehiculo | undefined;
  const foto = vehiculoSnap?.imagenes?.[0];

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
      activeOpacity={0.85}
      style={[styles.tarjeta, { backgroundColor: c.bgCard, borderColor: c.border }]}
      onPress={onPress}
    >
      <View style={styles.tarjetaFila}>
        {foto ? (
          <Image source={{ uri: foto }} style={styles.tarjetaFoto} />
        ) : (
          <View style={[styles.tarjetaFotoVacia, { backgroundColor: c.bgInput }]}>
            <Ionicons name="car-sport-outline" size={20} color={c.textMuted} />
          </View>
        )}

        <View style={styles.tarjetaInfo}>
          <View style={styles.tarjetaHeader}>
            <Text style={[styles.tarjetaVehiculo, { color: c.textPrimary }]} numberOfLines={1}>
              {reserva.vehiculoNombre}
            </Text>
            <View style={[styles.badge, { backgroundColor: `${COLOR_GRUPO[grupo]}22` }]}>
              <View style={[styles.badgeDot, { backgroundColor: COLOR_GRUPO[grupo] }]} />
              <Text style={[styles.badgeTexto, { color: COLOR_GRUPO[grupo] }]} numberOfLines={1}>
                {t(`misReservas.grupos.${grupo}`)}
              </Text>
            </View>
          </View>

          <Text style={[styles.tarjetaFechas, { color: c.textSecondary }]} numberOfLines={1}>
            {reserva.fechaRetiro ? fechaCorta(String(reserva.fechaRetiro)) : "—"}
            {" → "}
            {reserva.fechaDevolucion ? fechaCorta(String(reserva.fechaDevolucion)) : "—"}
          </Text>

          <View style={styles.tarjetaFooter}>
            <Text style={[styles.tarjetaReferencia, { color: c.textMuted }]} numberOfLines={1}>
              {reserva.referencia}
            </Text>
            <Text style={[styles.tarjetaTotal, { color: c.textPrimary }]}>{fmt(reserva.total)}</Text>
          </View>



          {/* Botón para reportar incidencia en el vehículo */}
          {(grupo === "confirmada" || grupo === "en_curso") && (
            <TouchableOpacity
              style={[styles.reportarBtn, { backgroundColor: c.bgInput, borderColor: c.border }]}
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
              <Ionicons name="build-outline" size={13} color={c.primary} />
              <Text style={[styles.reportarBtnText, { color: c.primary }]}>
                {t("tabs.hacerReporte")}
              </Text>
            </TouchableOpacity>
          )}

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
                        size={13}
                        color="#F59E0B"
                      />
                    ))}
                  </View>
                  <Text style={[styles.reportarBtnText, { color: c.primary }]} numberOfLines={1}>
                    {t("misReservas.editarCalificacion")}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="star-outline" size={13} color={c.primary} />
                  <Text style={[styles.reportarBtnText, { color: c.primary }]}>
                    {t("misReservas.calificarViaje")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
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

  lista: { padding: 16, paddingBottom: 40 },
  tarjeta: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  tarjetaFila: { flexDirection: "row", gap: 12 },
  tarjetaFoto: { width: 72, height: 72, borderRadius: 10, resizeMode: "cover" },
  tarjetaFotoVacia: {
    width: 72,
    height: 72,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tarjetaInfo: { flex: 1, justifyContent: "space-between" },
  tarjetaHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  tarjetaVehiculo: { fontSize: 14, fontWeight: "800", flexShrink: 1 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    maxWidth: 120,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 2.5 },
  badgeTexto: { fontSize: 9.5, fontWeight: "700" },
  tarjetaFechas: { fontSize: 11.5, marginTop: 4 },
  tarjetaFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  tarjetaReferencia: { fontSize: 10, flexShrink: 1 },
  tarjetaTotal: { fontSize: 14, fontWeight: "800" },
  reportarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-end",
  },
  reportarBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  instruccionesMiniCaja: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    marginTop: 8,
    gap: 4,
  },
  instruccionesMiniFila: {
    fontSize: 10.5,
    lineHeight: 14,
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
