import { AlertModal } from "@/components/ui/AlertModal";
import BuscadorCatalogo from "@/modules/catalog/components/CatalogSearch";
import FiltrosCatalogo from "@/modules/catalog/components/CatalogFilters";
import VehiculoCard from "@/modules/catalog/components/VehicleCard";
import { useCatalogo } from "@/modules/catalog/hooks/useCatalog";
import { useFavoritos } from "@/modules/catalog/hooks/useFavorites";
import { useAuthStore } from "@/store/authStore";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { ConfiguracionModal } from "@/modules/i18n/components/ConfiguracionModal";
import { useAuditoria } from "@/store/auditStore";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AlertTipo = "busqueda" | "reservar" | "favorito";

// Aviso de "sin resultados" (buscador de fechas o filtros): a propósito NO
// es un <Modal> — es un banner normal, dentro del árbol de la pantalla.
// Antes se mostraba con el mismo AlertModal que usan "favorito"/"reservar",
// pero eso significaba presentar un <Modal> nativo justo cuando otro
// (Filtros o Buscar) recién se estaba cerrando, y en iOS/RN dos <Modal>
// coincidiendo en pantalla — aunque sea un instante — deja todo bloqueado:
// no responde ni al toque ni al scroll. Un banner normal no tiene ese
// riesgo porque nunca compite con la presentación nativa de otro modal.
function BannerSinResultados({
  onCerrar,
  c,
}: {
  onCerrar: () => void;
  c: ReturnType<typeof useTemaColores>;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.bannerSinResultados, { backgroundColor: c.primaryBg, borderColor: "#1E40AF" }]}>
      <Ionicons name="car-outline" size={22} color="#1E40AF" />
      <View style={styles.bannerSinResultadosTextos}>
        <Text style={styles.bannerSinResultadosTitulo}>{t("catalogo.alertas.sinResultadosTitulo")}</Text>
        <Text style={[styles.bannerSinResultadosMensaje, { color: c.textSecondary }]}>
          {t("catalogo.alertas.sinResultadosMensaje")}
        </Text>
      </View>
      <TouchableOpacity onPress={onCerrar} hitSlop={8}>
        <Ionicons name="close" size={18} color={c.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function ListFooter({
  paginaActual,
  totalPaginas,
  onAnterior,
  onSiguiente,
  c,
}: {
  paginaActual: number;
  totalPaginas: number;
  onAnterior: () => void;
  onSiguiente: () => void;
  c: ReturnType<typeof useTemaColores>;
}) {
  const { t } = useTranslation();
  if (totalPaginas <= 1) return null;
  return (
    <View style={styles.paginacionContainer}>
      <TouchableOpacity
        style={[
          styles.paginaBtn,
          paginaActual === 1 && [styles.paginaBtnDisabled, { backgroundColor: c.bgInput }],
        ]}
        onPress={onAnterior}
        disabled={paginaActual === 1}
        activeOpacity={0.7}
      >
        <Ionicons
          name="arrow-back"
          size={16}
          color={paginaActual === 1 ? c.textMuted : "#1E40AF"}
        />
        <Text
          style={[
            styles.paginaBtnText,
            paginaActual === 1 && [styles.paginaBtnTextDisabled, { color: c.textMuted }],
          ]}
        >
          {t("catalogo.anterior")}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.paginaInfoTexto, { color: c.textSecondary }]}>
        {paginaActual} / {totalPaginas}
      </Text>

      <TouchableOpacity
        style={[
          styles.paginaBtn,
          paginaActual === totalPaginas && [styles.paginaBtnDisabled, { backgroundColor: c.bgInput }],
        ]}
        onPress={onSiguiente}
        disabled={paginaActual === totalPaginas}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.paginaBtnText,
            paginaActual === totalPaginas && [styles.paginaBtnTextDisabled, { color: c.textMuted }],
          ]}
        >
          {t("catalogo.siguiente")}
        </Text>
        <Ionicons
          name="arrow-forward"
          size={16}
          color={paginaActual === totalPaginas ? c.textMuted : "#1E40AF"}
        />
      </TouchableOpacity>
    </View>
  );
}

export default function Catalogo() {
  const insets = useSafeAreaInsets();
  const c = useTemaColores();
  const { t } = useTranslation();
  const usuario = useAuthStore((state) => state.usuario);
  const getInitials = () => {
    if (!usuario) return "?";
    const name = usuario.nombres && usuario.nombres.trim() !== "" 
      ? usuario.nombres 
      : (usuario.correo ? usuario.correo.split("@")[0] : "");
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };
  const [textBusqueda, setTextBusqueda] = useState("");
  const [modalFormVisible, setModalFormVisible] = useState(false);
  const [sweetAlertVisible, setSweetAlertVisible] = useState(false);
  const [alertTipo, setAlertTipo] = useState("busqueda" as AlertTipo);
  const [ajustesVisible, setAjustesVisible] = useState(false);
  const { registrarEvento } = useAuditoria();

  const ORDEN_OPCIONES = useMemo(
    () => [
      { valor: "precio_asc", label: t("catalogo.ordenar.precioAsc") },
      { valor: "precio_desc", label: t("catalogo.ordenar.precioDesc") },
      { valor: "calificacion", label: t("catalogo.ordenar.calificacion") },
    ],
    [t]
  );

  const ALERT_CONTENT = useMemo(
    () => ({
      busqueda: {
        icono: "calendar-outline" as const,
        titulo: t("catalogo.alertas.busquedaTitulo"),
        mensaje: t("catalogo.alertas.busquedaMensaje"),
      },
      reservar: {
        icono: "car-sport-outline" as const,
        titulo: t("catalogo.alertas.reservarTitulo"),
        mensaje: t("catalogo.alertas.reservarMensaje"),
      },
      favorito: {
        icono: "heart-outline" as const,
        titulo: t("catalogo.alertas.favoritoTitulo"),
        mensaje: t("catalogo.alertas.favoritoMensaje"),
      },
    }),
    [t]
  );

  const params = useLocalSearchParams<{ favoritos?: string }>();
  const usuarioId = usuario ? String(usuario.id ?? usuario.correo ?? "user") : null;
  const { favoritos, toggleFavorito, esFavorito } = useFavoritos(usuarioId);
  const [soloFavoritos, setSoloFavoritos] = useState(false);

  useEffect(() => {
    if (params.favoritos === "true") {
      setSoloFavoritos(true);
    } else if (params.favoritos === "false") {
      setSoloFavoritos(false);
    }
  }, [params.favoritos]);

  const {
    cargando,
    error,
    filtros,
    setFiltro,
    vehiculosFiltrados,
    vehiculosPaginados,
    limpiarFiltros,
    limpiarBusqueda,
    busquedaForm,
    busquedaRealizada,
    setForm,
    handleBuscar,
    errorBusqueda,
    sinResultadosBusqueda,
    cerrarAlertaSinResultados,
    sinResultadosFiltros,
    paginaActual,
    totalPaginas,
    paginaSiguiente,
    paginaAnterior,
    setPagina,
  } = useCatalogo({ soloFavoritos, esFavorito, textoBusqueda: textBusqueda });

  const [filtrosVisible, setFiltrosVisible] = useState(false);
  const [ordenVisible, setOrdenVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [paginaActual]);

  // RF: la navegación del visitante queda registrada en auditoría.
  useEffect(() => {
    if (!usuario) registrarEvento("navegacion", "catalogo");
  }, [usuario, registrarEvento]);

  const ordenLabel =
    ORDEN_OPCIONES.find((o) => o.valor === filtros.orden)?.label ??
    t("catalogo.ordenar.porDefecto");

  const filtrosActivos =
    filtros.categoria !== "Todos" ||
    filtros.ciudad !== "Todas las ciudades" ||
    filtros.sucursal !== "Todas las sucursales" ||
    filtros.transmision !== "Todas" ||
    filtros.combustible !== "Todos" ||
    !!filtros.precioMin ||
    !!filtros.precioMax ||
    soloFavoritos;

  // El hook ya aplica favoritos y texto de búsqueda ANTES de paginar
  // (ver useCatalogo), así que lo que llega acá ya viene correcto.
  const vehiculosAMostrar = vehiculosPaginados;

  // Si el usuario completó una búsqueda válida en "Consultar disponibilidad",
  // esos datos precargan (editables) el resumen de la reserva. lugarDevolucion
  // de BusquedaForm en realidad guarda la sucursal (así lo maneja BuscadorCatalogo
  // y useCatalogo), por eso mapea a lugarRetiro en la reserva.
  const datosPrecargaReserva = busquedaRealizada
    ? {
        lugarRetiro: busquedaForm.lugarDevolucion,
        fechaRetiro: busquedaForm.fechaInicio,
        fechaDevolucion: busquedaForm.fechaFin,
      }
    : undefined;

  const abrirSweetAlert = (tipo: AlertTipo) => {
    setAlertTipo(tipo);
    setSweetAlertVisible(true);
    if (!usuario) registrarEvento("accion_restringida", tipo);
  };

  // Si la combinación de filtros (categoría, ciudad, sucursal, precio,
  // transmisión, combustible o el buscador de texto) no deja ningún
  // vehículo, useCatalogo vuelve a mostrar el catálogo completo por su
  // cuenta (ver sinResultadosFiltros/resultado en useCatalog.ts) y acá se
  // muestra el banner (no modal) encima de la lista. Se "re-arma" cada vez
  // que el usuario toca un filtro, para que vuelva a aparecer si la nueva
  // combinación también da 0.
  const [bannerFiltrosCerrado, setBannerFiltrosCerrado] = useState(false);
  useEffect(() => {
    setBannerFiltrosCerrado(false);
  }, [filtros, soloFavoritos, textBusqueda]);
  const mostrarBannerFiltros = sinResultadosFiltros && !bannerFiltrosCerrado;

  const handleToggleSoloFavoritos = () => {
    setSoloFavoritos((prev) => !prev);
    setPagina(1);
  };

  const handleLimpiarFiltros = () => {
    limpiarFiltros();
    setSoloFavoritos(false);
  };

  const alertInfo = ALERT_CONTENT[alertTipo];

  // "sinResultados" ya no pasa por acá — ahora es el banner no-modal (ver
  // BannerSinResultados). AlertModal queda solo para las 3 acciones que sí
  // necesitan Cancelar / Iniciar sesión.
  const alertBotones = [
    {
      texto: t("catalogo.alertas.cancelar"),
      variante: "secundario" as const,
      onPress: () => setSweetAlertVisible(false),
    },
    {
      texto: t("catalogo.alertas.iniciarSesion"),
      variante: "primario" as const,
      onPress: () => {
        setSweetAlertVisible(false);
        router.push("/(auth)/login");
      },
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.bg }]}>
      <StatusBar
        barStyle={c.oscuro ? "light-content" : "dark-content"}
        backgroundColor={c.bgHeader}
        translucent={true}
      />

      <View style={[styles.header, { backgroundColor: c.bgHeader, borderBottomColor: c.border }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Drivique</Text>
        </View>
        {usuario ? (
          <TouchableOpacity
            style={styles.avatarHeaderBtn}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.7}
          >
            <View style={[styles.avatarContainer, { backgroundColor: c.primaryBg }]}>
              <Text style={[styles.avatarText, { color: "#1D4ED8" }]}>
                {getInitials()}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtns}>
            <TouchableOpacity
              style={styles.ajustesBtn}
              onPress={() => setAjustesVisible(true)}
              hitSlop={6}
            >
              <Ionicons name="settings-outline" size={19} color="#1E40AF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.loginBtnText}>{t("catalogo.ingresar")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => router.push("/(auth)/register")}
            >
              <Text style={styles.registerBtnText}>{t("catalogo.registro")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <BuscadorCatalogo
        form={busquedaForm}
        setForm={setForm}
        textBusqueda={textBusqueda}
        setTextBusqueda={setTextBusqueda}
        onBuscar={handleBuscar}
        onLimpiarBusqueda={limpiarBusqueda}
        errorBusqueda={errorBusqueda}
        disabled={!usuario}
        onPressRestringida={() => abrirSweetAlert("busqueda")}
        modalFormVisible={modalFormVisible}
        setModalFormVisible={setModalFormVisible}
      />

      <View style={[styles.controlsBar, { backgroundColor: c.bgHeader, borderBottomColor: c.border }]}>
        <TouchableOpacity
          style={[styles.filtrosBtn, { backgroundColor: c.bgInput }, filtrosActivos && styles.filtrosBtnActivo]}
          onPress={() => setFiltrosVisible(true)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons
              name="options-outline"
              size={16}
              color={filtrosActivos ? "#fff" : c.textSecondary}
            />
            <Text
              style={[
                styles.filtrosBtnText,
                { color: c.textSecondary },
                filtrosActivos && styles.filtrosBtnTextActivo,
              ]}
            >
              {t("catalogo.filtrosBtn")}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.controlsRight}>
          <Text style={[styles.contadorText, { color: c.textSecondary }]}>
            {t("catalogo.vehiculosContador", { count: vehiculosFiltrados.length })}
          </Text>
          <TouchableOpacity
            style={[styles.ordenBtn, { backgroundColor: c.bgInput, borderColor: c.border }]}
            onPress={() => setOrdenVisible(!ordenVisible)}
          >
            <Text style={[styles.ordenBtnText, { color: c.textPrimary }]} numberOfLines={1}>
              {ordenLabel} ▼
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {ordenVisible && (
        <View style={[styles.ordenDropdown, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          {ORDEN_OPCIONES.map((op) => (
            <TouchableOpacity
              key={op.valor}
              style={[
                styles.ordenOpcion,
                filtros.orden === op.valor && { backgroundColor: c.primaryBg },
              ]}
              onPress={() => {
                setFiltro("orden", op.valor);
                setOrdenVisible(false);
              }}
            >
              <Text
                style={[
                  styles.ordenOpcionText,
                  { color: c.textPrimary },
                  filtros.orden === op.valor && styles.ordenOpcionTextActiva,
                ]}
              >
                {op.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {sinResultadosBusqueda && (
        <BannerSinResultados c={c} onCerrar={cerrarAlertaSinResultados} />
      )}
      {mostrarBannerFiltros && (
        <BannerSinResultados c={c} onCerrar={() => setBannerFiltrosCerrado(true)} />
      )}

      {cargando ? (
        <View style={styles.estadoCentro}>
          <ActivityIndicator size="large" color="#1E40AF" />
        </View>
      ) : error ? (
        <View style={styles.estadoCentro}>
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={vehiculosAMostrar}
          keyExtractor={(item) => item.id.toString()}
          extraData={[paginaActual, favoritos, soloFavoritos]}
          renderItem={({ item }) => (
            <VehiculoCard
              vehiculo={item as any}
              invitado={!usuario}
              esFavorito={esFavorito(item.id)}
              onAccionRestringida={!usuario ? abrirSweetAlert : undefined}
              onToggleFavorito={usuario ? toggleFavorito : undefined}
              datosPrecarga={datosPrecargaReserva}
            />
          )}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            soloFavoritos && favoritos.length === 0 ? (
              <View style={styles.estadoCentro}>
                <Ionicons name="heart-outline" size={48} color={c.textMuted} />
                <Text style={[styles.emptyText, { color: c.textMuted }]}>
                  {t("catalogo.sinFavoritosGuardados")}
                </Text>
              </View>
            ) : (
              <View style={styles.estadoCentro}>
                <Ionicons name="car-outline" size={48} color={c.textMuted} />
                <Text style={[styles.emptyText, { color: c.textMuted }]}>
                  {t("catalogo.sinResultadosFiltros")}
                </Text>
                {filtrosActivos && (
                  <TouchableOpacity style={styles.limpiarFiltrosBtn} onPress={handleLimpiarFiltros}>
                    <Text style={styles.limpiarFiltrosBtnText}>{t("catalogo.limpiarFiltros")}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          }
          ListFooterComponent={() => (
            <ListFooter
              paginaActual={paginaActual}
              totalPaginas={totalPaginas}
              onAnterior={paginaAnterior}
              onSiguiente={paginaSiguiente}
              c={c}
            />
          )}
        />
      )}

      <FiltrosCatalogo
        visible={filtrosVisible}
        onClose={() => setFiltrosVisible(false)}
        filtros={filtros}
        setFiltro={setFiltro}
        limpiar={handleLimpiarFiltros}
        usuario={!!usuario}
        soloFavoritos={soloFavoritos}
        onToggleSoloFavoritos={handleToggleSoloFavoritos}
        totalFavoritos={favoritos.length}
      />

      <AlertModal
        visible={sweetAlertVisible}
        icono={alertInfo.icono}
        titulo={alertInfo.titulo}
        mensaje={alertInfo.mensaje}
        botones={alertBotones}
        onCerrar={() => setSweetAlertVisible(false)}
      />

      <ConfiguracionModal
        visible={ajustesVisible}
        onClose={() => setAjustesVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitleContainer: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1E40AF",
    letterSpacing: -0.5,
  },
  headerBtns: { flexDirection: "row", gap: 8, alignItems: "center" },
  ajustesBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#1E40AF",
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#1E40AF",
  },
  loginBtnText: { fontSize: 13, fontWeight: "700", color: "#1E40AF" },
  registerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#1E40AF",
  },
  registerBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  controlsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filtrosBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  filtrosBtnActivo: { backgroundColor: "#1E40AF" },
  filtrosBtnText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  filtrosBtnTextActivo: { color: "#fff" },
  controlsRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  contadorText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  ordenBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFF",
  },
  ordenBtnText: { fontSize: 13, color: "#1E293B", fontWeight: "600" },
  ordenDropdown: {
    position: "absolute",
    top: 170,
    right: 16,
    zIndex: 100,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 4,
  },
  ordenOpcion: { paddingHorizontal: 16, paddingVertical: 12 },
  ordenOpcionActiva: { backgroundColor: "#F1F5F9" },
  ordenOpcionText: { fontSize: 13, color: "#1F2937" },
  ordenOpcionTextActiva: { color: "#1E40AF", fontWeight: "700" },
  bannerSinResultados: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  bannerSinResultadosTextos: { flex: 1 },
  bannerSinResultadosTitulo: { fontSize: 13.5, fontWeight: "700", color: "#1E40AF", marginBottom: 2 },
  bannerSinResultadosMensaje: { fontSize: 12.5, lineHeight: 17 },
  lista: { padding: 16 },
  estadoCentro: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  errorTexto: { fontSize: 14, color: "#EF4444", textAlign: "center" },
  emptyText: { fontSize: 14, color: "#94A3B8", marginTop: 12, fontWeight: "600", textAlign: "center", paddingHorizontal: 24 },
  limpiarFiltrosBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1E40AF",
  },
  limpiarFiltrosBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  paginacionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 28,
    paddingHorizontal: 4,
    gap: 8,
  },
  paginaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#1E40AF",
  },
  paginaBtnDisabled: { backgroundColor: "#F1F5F9" },
  paginaBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  paginaBtnTextDisabled: { color: "#CBD5E1" },
  paginaInfoTexto: { fontSize: 14, fontWeight: "700", color: "#475569" },
  avatarHeaderBtn: {
    padding: 2,
  },
  avatarContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1D4ED840",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
  },
});