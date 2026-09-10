// app/contract-view.tsx
//
// Pantalla propia e independiente para visualizar y descargar el contrato de alquiler firmado.
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { COLOR_MARCA } from "@/modules/catalog/constants/catalog.constants";
import { GRADIENTES } from "@/constants/gradients";
import { useIdioma, useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Vehiculo } from "@/modules/catalog/types/catalog.types";
import {
  DatosDocumentos,
  DatosFechasLugar,
  DatosPersonales,
  DatosPlanes,
} from "@/modules/reservation/types/reservation.types";
import {
  ContratoGuardado,
  contratoService,
} from "@/modules/reservation/services/contractService";
import {
  ReservaGuardada,
  reservaPersistService,
} from "@/modules/reservation/services/reservationPersistService";
import {
  compartirContratoPdf,
  crearTextosContrato,
  generarContratoPdf,
} from "@/modules/reservation/services/pdfService";
import { fmt, fechaCorta } from "@/modules/reservation/components/BookingSummaryModal.pieces";
import FirmaContrato from "@/modules/reservation/components/ContractSignature";
import { documentosService } from "@/modules/reservation/services/documentsService";

export default function ContratoScreen() {
  const insets = useSafeAreaInsets();
  const c = useTemaColores();
  const { t } = useTranslation();
  const { temaActual, toggleTema } = useIdioma();
  const { ref, unlocked } = useLocalSearchParams<{ ref?: string; unlocked?: string }>();
  const primaryAccent = c.oscuro ? "#60A5FA" : COLOR_MARCA;

  const [cargando, setCargando] = useState(true);
  const [reserva, setReserva] = useState<ReservaGuardada | null>(null);
  const [contrato, setContrato] = useState<ContratoGuardado | null>(null);
  const [claveDesbloqueada, setClaveDesbloqueada] = useState(unlocked === "1" || unlocked === "true");
  const [claveIngresada, setClaveIngresada] = useState("");
  const [errorClave, setErrorClave] = useState("");
  const [generandoPdf, setGenerandoPdf] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      if (!ref) {
        setCargando(false);
        return;
      }
      const cleanRef = ref.includes("_") ? ref.split("_")[0] : ref;
      const [res, con] = await Promise.all([
        reservaPersistService.obtenerPorReferencia(cleanRef),
        contratoService.obtenerPorReserva(cleanRef),
      ]);

      if (activo) {
        setReserva(res ?? null);
        setContrato(con ?? null);
        setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [ref]);

  const handleValidarClave = () => {
    const datosPersonalesSnap = reserva?.datosPersonalesSnapshot as DatosPersonales | undefined;
    const numeroDocumento = datosPersonalesSnap?.numeroDocumento?.replace(/\D/g, "");
    const claveNormalizada = claveIngresada.replace(/\D/g, "");
    if (numeroDocumento && claveNormalizada === numeroDocumento) {
      setErrorClave("");
      setClaveDesbloqueada(true);
    } else {
      setErrorClave(t("misReservas.claveIncorrecta", { defaultValue: "Número de documento incorrecto." }));
    }
  };

  const vehiculoSnap = reserva?.vehiculoSnapshot as Vehiculo | undefined;
  const datosPersonalesSnap = reserva?.datosPersonalesSnapshot as DatosPersonales | undefined;
  const datosDocumentosSnap = reserva?.datosDocumentosSnapshot as DatosDocumentos | undefined;
  const fechasLugarSnap = reserva?.fechasLugarSnapshot as DatosFechasLugar | undefined;
  const planesSnap = reserva?.planesSnapshot as DatosPlanes | undefined;

  const vehiculoEfectivo: Vehiculo = (vehiculoSnap || {
    id: reserva?.vehiculoId || 1,
    nombre: reserva?.vehiculoNombre || "Vehículo",
    placa: (reserva as any)?.vehiculoPlaca || "ABC-123",
    precio: reserva?.total || 0,
    sucursal: reserva?.lugarRetiro || "Bogotá",
  }) as Vehiculo;

  const datosPersonalesEfectivos: DatosPersonales = (datosPersonalesSnap || {
    nombreCompleto: (reserva as any)?.nombreCompleto || "Cliente Demo",
    tipoDocumento: (reserva as any)?.tipoDocumento || "CC",
    numeroDocumento: (reserva as any)?.numeroDocumento || "1075228306",
    correo: (reserva as any)?.correo || "cliente@drivique.com",
    celular: (reserva as any)?.celular || "3000000000",
    nacionalidad: "Colombia",
    terminosAceptados: true,
  }) as DatosPersonales;

  const fechasLugarEfectivas: DatosFechasLugar = (fechasLugarSnap || {
    fechaRetiro: reserva?.fechaRetiro || new Date().toISOString(),
    fechaDevolucion: reserva?.fechaDevolucion || new Date().toISOString(),
    horaRetiro: (reserva as any)?.horaRetiro || "10:00",
    horaDevolucion: (reserva as any)?.horaDevolucion || "10:00",
    lugarRetiro: reserva?.lugarRetiro || "Sucursal Principal",
    lugarDevolucion: reserva?.lugarDevolucion || "Sucursal Principal",
    metodoPago: (reserva?.metodoPago as any) || "wompi",
  }) as DatosFechasLugar;

  const planesEfectivos: DatosPlanes = (planesSnap || {
    proteccion: reserva?.proteccion || "Básica",
    tipoKilometraje: reserva?.tipoKilometraje || "ilimitado",
    serviciosSeleccionados: [],
  }) as DatosPlanes;

  const nombreLicenciaSnap =
    datosDocumentosSnap?.licenciaConduccion?.nombre || "Licencia verificada en perfil";
  const nombreCedulaSnap = datosDocumentosSnap?.cedulaFrente?.nombre || null;

  const datosDocumentosEfectivos: DatosDocumentos = {
    cedulaFrente: nombreCedulaSnap ? { nombre: nombreCedulaSnap } : null,
    cedulaReverso: datosDocumentosSnap?.cedulaReverso ?? null,
    licenciaConduccion: { nombre: nombreLicenciaSnap },
  };

  const handleDescargarPdf = async () => {
    if (!contrato || !reserva) {
      Alert.alert(
        t("misReservas.contratoNoDisponibleTitulo", { defaultValue: "Contrato no disponible" }),
        t("misReservas.contratoNoDisponible", { defaultValue: "El contrato de esta reserva todavía no ha sido firmado." })
      );
      return;
    }
    setGenerandoPdf(true);
    try {
      const pdfNombre = contrato.contratoPdfNombre || `contrato-${reserva.referencia}.pdf`;
      const tipoDoc = datosPersonalesEfectivos.tipoDocumento;
      const tipoDocumentoTexto = tipoDoc
        ? t(`reserva.datosPersonales.tiposDocumento.${tipoDoc === "Doc. Extranjero" ? "DocExtranjero" : tipoDoc}`, { defaultValue: tipoDoc })
        : "";

      const resPdf = await generarContratoPdf({
        contrato,
        vehiculo: vehiculoEfectivo,
        datosPersonales: datosPersonalesEfectivos,
        datosDocumentos: datosDocumentosEfectivos,
        fechasLugar: fechasLugarEfectivas,
        planes: planesEfectivos,
        total: reserva.total || 0,
        referencia: reserva.referencia,
        formatPrecio: fmt,
        formatearFecha: (iso: string | null) => (iso ? fechaCorta(iso) : "—"),
        tipoDocumentoTexto,
        textos: crearTextosContrato((key: string, opts?: any) => t(key, opts)),
      });

      if (resPdf?.base64 && !contrato.contratoPdfBase64) {
        const actualizado = await contratoService.guardarPdfContrato(reserva.referencia, resPdf.base64, pdfNombre);
        if (actualizado) setContrato(actualizado);
      }

      if (resPdf?.uri) {
        await compartirContratoPdf(resPdf.uri, pdfNombre);
      }
    } catch (error) {
      console.error("[contract-view] Error generando el PDF", error);
      Alert.alert(
        t("misReservas.errorPdfTitulo", { defaultValue: "Error" }),
        t("misReservas.errorPdfMensaje", { defaultValue: "No fue posible generar o descargar el PDF del contrato." })
      );
    } finally {
      setGenerandoPdf(false);
    }
  };

  const handleVolver = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (ref) {
      router.replace(`/payment-response?ref=${encodeURIComponent(ref)}` as any);
    } else {
      router.replace("/(tabs)/my-bookings" as any);
    }
  };

  return (
    <View style={[styles.contenedor, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={c.oscuro ? "light-content" : "dark-content"} />

      {/* ── HEADER ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: c.bgHeader,
            borderBottomColor: c.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: c.oscuro ? c.bgInput : "#F1F5F9" }]}
          onPress={handleVolver}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitulo, { color: c.textPrimary }]} numberOfLines={1}>
          {t("reserva.contrato.title", { defaultValue: "Contrato de Alquiler" })}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {contrato && claveDesbloqueada && (
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: c.primaryBg }]}
              onPress={handleDescargarPdf}
              disabled={generandoPdf}
              activeOpacity={0.7}
            >
              {generandoPdf ? (
                <ActivityIndicator size="small" color={c.primary} />
              ) : (
                <Ionicons name="download-outline" size={19} color={c.primary} />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: c.oscuro ? c.bgInput : "#F1F5F9" }]}
            onPress={toggleTema}
            activeOpacity={0.7}
          >
            <Ionicons
              name={temaActual === "oscuro" ? "sunny-outline" : "moon-outline"}
              size={18}
              color={c.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── CUERPO DE LA PANTALLA ── */}
      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={COLOR_MARCA} />
          <Text style={[styles.cargandoTexto, { color: c.textSecondary }]}>
            {t("comun.cargando", { defaultValue: "Cargando contrato..." })}
          </Text>
        </View>
      ) : !reserva || !contrato ? (
        <View style={styles.centrado}>
          <Ionicons name="document-text-outline" size={60} color={c.textMuted} />
          <Text style={[styles.tituloVacio, { color: c.textPrimary }]}>
            {t("misReservas.contratoNoDisponibleTitulo", { defaultValue: "Contrato no disponible" })}
          </Text>
          <Text style={[styles.textoVacio, { color: c.textSecondary }]}>
            {t("misReservas.contratoNoDisponible", {
              defaultValue: "El contrato de esta reserva todavía no ha sido firmado o no fue encontrado.",
            })}
          </Text>
          <TouchableOpacity style={styles.volverBtn} onPress={handleVolver} activeOpacity={0.85}>
            <LinearGradient
              colors={GRADIENTES.boton.colors}
              start={GRADIENTES.boton.start}
              end={GRADIENTES.boton.end}
              style={styles.btnGradiente}
            >
              <Text style={styles.btnTexto}>{t("comun.volver", { defaultValue: "Volver" })}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : !claveDesbloqueada ? (
        /* Bloqueo con número de documento */
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.bloqueoContenedor}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.bloqueoCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
              <View style={[styles.bloqueoIcono, { backgroundColor: c.primaryBg }]}>
                <Ionicons name="lock-closed-outline" size={32} color={primaryAccent} />
              </View>
              <Text style={[styles.bloqueoTitulo, { color: c.textPrimary }]}>
                {t("misReservas.contratoBloqueadoTitulo", { defaultValue: "Contrato protegido" })}
              </Text>
              <Text style={[styles.bloqueoSubtitulo, { color: c.textSecondary }]}>
                {t("misReservas.contratoBloqueadoTexto", {
                  defaultValue: "Ingresa el número de documento con el que confirmaste esta reserva para ver el contrato.",
                })}
              </Text>

              <View style={{ width: "100%", marginTop: 14 }}>
                <PasswordInput
                  placeholder={t("misReservas.claveContratoPlaceholder", { defaultValue: "Número de documento" })}
                  value={claveIngresada}
                  onChangeText={(v) => {
                    setClaveIngresada(v);
                    if (errorClave) setErrorClave("");
                  }}
                  error={errorClave}
                  keyboardType="number-pad"
                />
              </View>

              <TouchableOpacity
                style={{ width: "100%", marginTop: 8 }}
                onPress={handleValidarClave}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={GRADIENTES.boton.colors}
                  start={GRADIENTES.boton.start}
                  end={GRADIENTES.boton.end}
                  style={styles.btnGradiente}
                >
                  <Text style={styles.btnTexto}>{t("misReservas.verContrato", { defaultValue: "Ver contrato" })}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : vehiculoSnap && datosPersonalesSnap && fechasLugarSnap && planesSnap ? (
        /* Visualización completa del contrato */
        <View style={{ flex: 1 }}>
          <FirmaContrato
            vehiculo={vehiculoSnap}
            datosPersonales={datosPersonalesSnap}
            datosDocumentos={datosDocumentosEfectivos}
            fechasLugar={fechasLugarSnap}
            planes={planesSnap}
            total={reserva.total}
            referencia={reserva.referencia}
            onFirmado={() => {}}
            soloLectura
            contratoFirmado={contrato}
            onDescargar={handleDescargarPdf}
            descargando={generandoPdf}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitulo: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  cargandoTexto: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  tituloVacio: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 6,
  },
  textoVacio: {
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 10,
  },
  volverBtn: {
    borderRadius: 12,
    marginTop: 6,
    width: 160,
  },
  bloqueoContenedor: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  bloqueoCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  bloqueoIcono: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  bloqueoTitulo: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  bloqueoSubtitulo: {
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 6,
  },
  btnGradiente: {
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTexto: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
