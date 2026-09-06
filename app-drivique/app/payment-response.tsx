// app/payment-response.tsx
//
// Pantalla a la que vuelve el usuario después del checkout de Wompi.
// Equivalente a src/modules/payments/pages/RespuestaPagoPage.jsx en la web:
// lee la reserva guardada localmente por su referencia y muestra el estado
// del pago (Wompi confirma la transacción de forma asíncrona vía webhook
// en el backend real; acá solo reflejamos que quedó "en validación").
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { GRADIENTES } from "@/constants/gradients";
import { COLOR_MARCA, getCiudadPorSucursal, getDireccionSucursal } from "@/modules/catalog/constants/catalog.constants";
import {
  calcularGrupoReserva,
  ReservaGuardada,
  reservaPersistService,
} from "@/modules/reservation/services/reservationPersistService";
import FirmaContrato from "@/modules/reservation/components/ContractSignature";
import { Vehiculo } from "@/modules/catalog/types/catalog.types";
import {
  DatosDocumentos,
  DatosFechasLugar,
  DatosPersonales,
  DatosPlanes,
} from "@/modules/reservation/types/reservation.types";
import { fechaCorta, fmt } from "@/modules/reservation/components/BookingSummaryModal.pieces";
import { contratoService, ContratoGuardado } from "@/modules/reservation/services/contractService";
import {
  compartirPdfOriginal,
  crearTextosContrato,
  descargarContratoVisible,
  generarContratoPdf,
  leerPdfOriginalBase64,
} from "@/modules/reservation/services/pdfService";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  aCentavos,
  construirUrlCheckout,
  consultarTransaccionWompi,
  WompiTransactionResponse,
} from "@/modules/reservation/services/wompiService";
import * as Linking from "expo-linking";

export default function PagoRespuestaScreen() {
  const insets = useSafeAreaInsets();
  const c = useTemaColores();
  const { t } = useTranslation();
  const { ref, id } = useLocalSearchParams<{ ref?: string; id?: string }>();
  const primaryAccent = c.oscuro ? "#60A5FA" : COLOR_MARCA;

  const [cargando, setCargando] = useState(true);
  const [reserva, setReserva] = useState<ReservaGuardada | null>(null);
  const [contratoFirmado, setContratoFirmado] = useState(false);
  const [contratoActual, setContratoActual] = useState<ContratoGuardado | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [claveDesbloqueada, setClaveDesbloqueada] = useState(false);
  const [claveIngresada, setClaveIngresada] = useState("");
  const [errorClave, setErrorClave] = useState("");

  useEffect(() => {
    let activo = true;
    (async () => {
      let refBuscada = ref;
      let txData: WompiTransactionResponse | null = null;

      if (id) {
        txData = await consultarTransaccionWompi(id);
        if (txData?.reference) {
          refBuscada = txData.reference;
        }
      }

      if (!refBuscada) {
        setCargando(false);
        return;
      }

      let encontrada = await reservaPersistService.obtenerPorReferencia(refBuscada);

      if (encontrada && txData) {
        const cambios: Partial<ReservaGuardada> = { paymentId: txData.id };
        if (txData.status === "APPROVED") {
          cambios.estado = "CONFIRMADA";
        } else if (txData.status === "PENDING") {
          cambios.estado = "PENDIENTE_EFECTIVO";
          cambios.metodoPagoDetalle =
            txData.payment_method_type === "BANCOLOMBIA_COLLECT"
              ? "Corresponsales Bancolombia"
              : txData.payment_method_type;
          cambios.fechaLimitePago = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
          cambios.horasLimitePago = 72;
          if (txData.payment_method?.extra?.business_agreement_code) {
            cambios.convenioWompi = txData.payment_method.extra.business_agreement_code;
          }
          if (txData.payment_method?.extra?.payment_reference) {
            cambios.referenciaWompi = txData.payment_method.extra.payment_reference;
          }
        } else if (txData.status === "DECLINED" || txData.status === "ERROR") {
          cambios.estado = "CANCELADA";
        }
        await reservaPersistService.actualizarReserva(refBuscada, cambios);
        encontrada = await reservaPersistService.obtenerPorReferencia(refBuscada);
      }

      const contrato = await contratoService.obtenerPorReserva(refBuscada);
      if (activo) {
        setReserva(encontrada ?? null);
        setContratoFirmado(!!contrato);
        setContratoActual(contrato);
        setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [ref, id]);

  const irAMisReservas = () => router.replace("/(tabs)/my-bookings" as any);
  const irAlInicio = () => router.replace("/(tabs)/catalog" as any);

  const handlePagarWompi = async () => {
    if (!reserva) return;
    try {
      const redirectUrl = Linking.createURL("pago-respuesta");
      const amountInCents = aCentavos(reserva.total);
      const url = await construirUrlCheckout({
        reference: reserva.referencia,
        amountInCents,
        redirectUrl,
      });
      await Linking.openURL(url);
    } catch (err) {
      console.error("[payment-response] Error abriendo Wompi", err);
      Alert.alert(t("comun.error", { defaultValue: "Error" }), t("reserva.confirmacion.errorWompi", { defaultValue: "No se pudo abrir la pasarela de pago de Wompi." }));
    }
  };

  const sucursalNombre = reserva?.lugarRetiro || (reserva?.fechasLugarSnapshot as any)?.lugarRetiro || "";
  const ciudadSucursal = sucursalNombre ? getCiudadPorSucursal(String(sucursalNombre)) : "";
  const direccionSucursal = sucursalNombre ? getDireccionSucursal(String(sucursalNombre)) : "";

  if (cargando) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLOR_MARCA} />
        <Text style={[styles.procesandoTexto, { color: c.textSecondary }]}>
          {t("reserva.confirmacion.respuesta.procesando")}
        </Text>
      </View>
    );
  }

  if (!reserva) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg, paddingTop: insets.top, paddingHorizontal: 32 }]}>
        <Ionicons name="help-circle-outline" size={56} color={c.textMuted} />
        <Text style={[styles.tituloVacio, { color: c.textPrimary }]}>
          {t("reserva.confirmacion.respuesta.noEncontrada")}
        </Text>
        <Text style={[styles.textoVacio, { color: c.textMuted }]}>
          {t("reserva.confirmacion.respuesta.noEncontradaMensaje")}
        </Text>
        <TouchableOpacity style={styles.btnWrap} onPress={irAMisReservas} activeOpacity={0.85}>
          <LinearGradient
            colors={GRADIENTES.boton.colors}
            start={GRADIENTES.boton.start}
            end={GRADIENTES.boton.end}
            style={styles.btn}
          >
            <Text style={styles.btnTexto}>{t("reserva.confirmacion.respuesta.volverAMisReservas")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const esPendienteEfectivo =
    reserva.estado === "PENDIENTE_EFECTIVO" ||
    (reserva.estado === "PENDIENTE" && reserva.metodoPago === "efectivo");

  // La firma de contrato se solicita únicamente si el pago ya fue aprobado/confirmado
  // y no está pendiente de pago en efectivo.
  const requiereFirma = !contratoFirmado && !esPendienteEfectivo && (
    reserva.estado === "CONFIRMADA" ||
    (reserva.metodoPago === "wompi" && ["PENDIENTE_VALIDACION"].includes(reserva.estado))
  );

  if (requiereFirma) {
    const vehiculoSnap = reserva.vehiculoSnapshot as Vehiculo | undefined;
    const datosPersonalesSnap = reserva.datosPersonalesSnapshot as DatosPersonales | undefined;
    const datosDocumentosSnap = reserva.datosDocumentosSnapshot as DatosDocumentos | undefined;
    const fechasLugarSnap = reserva.fechasLugarSnapshot as DatosFechasLugar | undefined;
    const planesSnap = reserva.planesSnapshot as DatosPlanes | undefined;

    if (vehiculoSnap && datosPersonalesSnap && fechasLugarSnap && planesSnap) {
      return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <HeaderDetalle insets={insets} c={c} titulo={t("reserva.contrato.title")} onVolver={irAMisReservas} />
          <FirmaContrato
            vehiculo={vehiculoSnap}
            datosPersonales={datosPersonalesSnap}
            datosDocumentos={
              datosDocumentosSnap ?? { cedulaFrente: null, cedulaReverso: null, licenciaConduccion: null }
            }
            fechasLugar={fechasLugarSnap}
            planes={planesSnap}
            total={reserva.total}
            referencia={reserva.referencia}
            onFirmado={async () => {
              await reservaPersistService.actualizarEstado(reserva.referencia, "CONFIRMADA");
              const actualizada = await reservaPersistService.obtenerPorReferencia(reserva.referencia);
              const contratoNuevo = await contratoService.obtenerPorReserva(reserva.referencia);
              setReserva(actualizada ?? null);
              setContratoActual(contratoNuevo);
              setContratoFirmado(true);
            }}
          />
        </View>
      );
    }
  }

  const estadoTexto = t(`reserva.confirmacion.estados.${reserva.estado}`, {
    defaultValue: reserva.estado,
  });

  const grupo = calcularGrupoReserva(reserva);

  const encabezadoPorGrupo: Record<
    string,
    { icono: keyof typeof Ionicons.glyphMap; color: string; titulo: string }
  > = {
    pendiente: {
      icono: reserva.estado === "PENDIENTE_EFECTIVO" ? "cash-outline" : "time-outline",
      color: "#f59e0b",
      titulo:
        reserva.estado === "PENDIENTE_EFECTIVO"
          ? t("misReservas.detalle.tituloPendienteEfectivo")
          : reserva.estado === "PENDIENTE_VALIDACION"
          ? t("misReservas.detalle.tituloPendienteValidacion")
          : t("misReservas.detalle.tituloPendiente"),
    },
    confirmada: { icono: "checkmark-done-circle-outline", color: COLOR_MARCA, titulo: t("misReservas.detalle.tituloConfirmada") },
    en_curso: { icono: "navigate-circle-outline", color: "#16a34a", titulo: t("misReservas.detalle.tituloEnCurso") },
    finalizada: { icono: "flag-outline", color: "#6b7280", titulo: t("misReservas.detalle.tituloFinalizada") },
    cancelada: { icono: "close-circle-outline", color: "#dc2626", titulo: t("misReservas.detalle.tituloCancelada") },
  };
  const encabezado = encabezadoPorGrupo[grupo];

  const vehiculoSnap = reserva.vehiculoSnapshot as Vehiculo | undefined;
  const datosPersonalesSnap = reserva.datosPersonalesSnapshot as DatosPersonales | undefined;
  const datosDocumentosSnap = reserva.datosDocumentosSnapshot as DatosDocumentos | undefined;
  const fechasLugarSnap = reserva.fechasLugarSnapshot as DatosFechasLugar | undefined;
  const planesSnap = reserva.planesSnapshot as DatosPlanes | undefined;
  const foto = vehiculoSnap?.imagenes?.[0];

  const handleValidarClave = () => {
    const datosPersonalesSnap = reserva?.datosPersonalesSnapshot as DatosPersonales | undefined;
    const numeroDocumento = datosPersonalesSnap?.numeroDocumento?.replace(/\D/g, "");
    const claveNormalizada = claveIngresada.replace(/\D/g, "");
    if (numeroDocumento && claveNormalizada === numeroDocumento) {
      setErrorClave("");
      setClaveDesbloqueada(true);
    } else {
      setErrorClave(t("misReservas.claveIncorrecta"));
    }
  };

  const handleDescargarPdf = async () => {
    if (!contratoActual) {
      Alert.alert(t("misReservas.contratoNoDisponibleTitulo"), t("misReservas.contratoNoDisponible"));
      return;
    }
    setGenerandoPdf(true);
    try {
      if (Platform.OS === "web") {
        await descargarContratoVisible(`contrato-${reserva.referencia}.pdf`);
        return;
      }
      if (!vehiculoSnap || !datosPersonalesSnap || !fechasLugarSnap || !planesSnap) {
        Alert.alert(t("misReservas.contratoNoDisponibleTitulo"), t("misReservas.contratoNoDisponible"));
        return;
      }
      let pdfBase64 = contratoActual.contratoPdfBase64;
      let pdfNombre = contratoActual.contratoPdfNombre || `contrato-${reserva.referencia}.pdf`;

      if (!pdfBase64) {
        const tipoDocumentoTexto = datosPersonalesSnap.tipoDocumento
          ? t(`reserva.datosPersonales.tiposDocumento.${datosPersonalesSnap.tipoDocumento === "Doc. Extranjero" ? "DocExtranjero" : datosPersonalesSnap.tipoDocumento}`, { defaultValue: datosPersonalesSnap.tipoDocumento })
          : "";
        const uriContrato = await generarContratoPdf({
          contrato: contratoActual,
          vehiculo: vehiculoSnap,
          datosPersonales: datosPersonalesSnap,
          datosDocumentos: datosDocumentosSnap ?? { cedulaFrente: null, cedulaReverso: null, licenciaConduccion: null },
          fechasLugar: fechasLugarSnap,
          planes: planesSnap,
          total: reserva.total,
          referencia: reserva.referencia,
          formatPrecio: fmt,
          formatearFecha: (iso: string | null) => (iso ? fechaCorta(iso) : "—"),
          tipoDocumentoTexto,
          textos: crearTextosContrato((key: string) => t(key)),
        });
        pdfBase64 = await leerPdfOriginalBase64(uriContrato);
        if (pdfBase64) {
          const actualizado = await contratoService.guardarPdfContrato(reserva.referencia, pdfBase64, pdfNombre);
          if (actualizado) setContratoActual(actualizado);
        }
      }
      if (pdfBase64) {
        await compartirPdfOriginal(
          pdfBase64,
          pdfNombre
        );
      }
    } catch (error) {
      console.error("[pago-respuesta] Error generando el PDF", error);
      Alert.alert(t("misReservas.errorPdfTitulo"), t("misReservas.errorPdfMensaje"));
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <HeaderDetalle
        insets={insets}
        c={c}
        titulo={t("misReservas.detalle.tituloHeader", { defaultValue: "Detalle de Reserva" })}
        onVolver={irAMisReservas}
      />

      {contratoActual && claveDesbloqueada && vehiculoSnap && datosPersonalesSnap && fechasLugarSnap && planesSnap ? (
        <FirmaContrato
          vehiculo={vehiculoSnap}
          datosPersonales={datosPersonalesSnap}
          datosDocumentos={
            datosDocumentosSnap ?? { cedulaFrente: null, cedulaReverso: null, licenciaConduccion: null }
          }
          fechasLugar={fechasLugarSnap}
          planes={planesSnap}
          total={reserva.total}
          referencia={reserva.referencia}
          onFirmado={() => {}}
          soloLectura
          contratoFirmado={contratoActual}
          onDescargar={handleDescargarPdf}
          descargando={generandoPdf}
        />
      ) : (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: c.bg }}
          contentContainerStyle={[styles.scroll, { paddingTop: 24, paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
      {foto ? (
        <Image source={{ uri: foto }} style={styles.foto} />
      ) : (
        <View style={[styles.iconoWrap, { backgroundColor: c.primaryBg }]}>
          <Ionicons name={encabezado.icono} size={40} color={encabezado.color} />
        </View>
      )}

      <Text style={[styles.titulo, { color: c.textPrimary }]}>{encabezado.titulo}</Text>
      <Text style={[styles.subtitulo, { color: c.textSecondary }]}>
        {reserva.vehiculoNombre}
      </Text>

      <View style={[styles.card, styles.detalleCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <LinearGradient
          colors={[c.primary, "#60A5FA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.detalleFranja}
        />
        <FilaDetalle
          icono="car-sport-outline"
          label={t("reserva.confirmacion.respuesta.vehiculo")}
          valor={reserva.vehiculoNombre}
          c={c}
        />
        <FilaDetalle
          icono="calendar-outline"
          label={t("misReservas.detalle.fechaInicio")}
          valor={reserva.fechaRetiro ? fechaCorta(String(reserva.fechaRetiro)) : "—"}
          c={c}
        />
        <FilaDetalle
          icono="calendar-number-outline"
          label={t("misReservas.detalle.fechaFin")}
          valor={reserva.fechaDevolucion ? fechaCorta(String(reserva.fechaDevolucion)) : "—"}
          c={c}
        />
        <FilaDetalle
          icono="location-outline"
          label={t("misReservas.detalle.lugar")}
          valor={String(reserva.lugarRetiro ?? "—")}
          c={c}
        />
        {reserva.proteccion ? (
          <FilaDetalle
            icono="shield-checkmark-outline"
            label={t("misReservas.detalle.proteccion")}
            valor={t(`reserva.planes.nombreSeguro.${reserva.proteccion}`, { defaultValue: String(reserva.proteccion) })}
            c={c}
          />
        ) : null}
        <FilaDetalle
          icono="receipt-outline"
          label={t("reserva.confirmacion.respuesta.referencia")}
          valor={reserva.referencia}
          c={c}
        />
        {reserva.paymentId ? (
          <FilaDetalle
            icono="card-outline"
            label={t("reserva.confirmacion.respuesta.idTransaccion")}
            valor={String(reserva.paymentId)}
            c={c}
          />
        ) : null}
        <FilaDetalle
          icono="cash-outline"
          label={t("reserva.confirmacion.respuesta.total")}
          valor={fmt(reserva.total)}
          c={c}
        />
        <FilaDetalle
          icono="checkmark-circle-outline"
          label={t("reserva.confirmacion.respuesta.estado")}
          valor={estadoTexto}
          c={c}
          ultima
        />
      </View>

      {esPendienteEfectivo && (
        <View style={[styles.card, styles.cardEfectivo, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          {/* Logo Circular Superior */}
          <View
            style={[
              styles.logoCircle,
              {
                backgroundColor: "#FFFFFF",
                borderColor: c.oscuro ? "#334155" : "#F1F5F9",
              },
            ]}
          >
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          {/* Título */}
          <Text style={[styles.tituloEfectivo, { color: c.textPrimary }]}>
            {t("reserva.confirmacion.efectivoConfirmadaTitulo", { defaultValue: "Reserva Registrada" })}
          </Text>

          {/* Mensaje descriptivo */}
          <Text style={[styles.descripcionEfectivo, { color: c.textSecondary }]}>
            {(reserva as any).metodoPagoDetalle === "Corresponsales Bancolombia"
              ? "Tu reserva quedó registrada. Realiza el pago en efectivo en cualquier punto o Corresponsal Bancolombia con la siguiente referencia."
              : sucursalNombre
              ? `Tu reserva quedó registrada. Para confirmarla, realiza el pago en efectivo en el punto autorizado ${sucursalNombre}.`
              : "Tu reserva quedó registrada. Para confirmarla, realiza el pago en efectivo en la sucursal seleccionada."}
          </Text>

          {/* Caja de Referencia y Total */}
          <View style={[styles.cajaReferencia, { backgroundColor: c.oscuro ? c.bgInput : "#F8FAFC", borderColor: c.border }]}>
            <View style={styles.filaInfoEfectivo}>
              <Text style={[styles.etiquetaEfectivo, { color: c.textSecondary }]}>
                {t("reserva.confirmacion.respuesta.referencia", { defaultValue: "Referencia de reserva" })}:
              </Text>
              <Text style={[styles.valorRefEfectivo, { color: primaryAccent }]}>{reserva.referencia}</Text>
            </View>

            {!!(reserva as any).convenioWompi && (
              <View style={styles.filaInfoEfectivo}>
                <Text style={[styles.etiquetaEfectivo, { color: c.textSecondary }]}>Convenio Bancolombia:</Text>
                <Text style={[styles.valorEfectivo, { color: c.textPrimary }]}>{(reserva as any).convenioWompi}</Text>
              </View>
            )}

            {!!(reserva as any).referenciaWompi && (
              <View style={styles.filaInfoEfectivo}>
                <Text style={[styles.etiquetaEfectivo, { color: c.textSecondary }]}>Referencia de Pago:</Text>
                <Text style={[styles.valorRefEfectivo, { color: primaryAccent }]}>{(reserva as any).referenciaWompi}</Text>
              </View>
            )}

            {!(reserva as any).convenioWompi && !!sucursalNombre && (
              <View style={styles.filaInfoEfectivo}>
                <Text style={[styles.etiquetaEfectivo, { color: c.textSecondary }]}>
                  {t("reserva.confirmacion.sucursal", { defaultValue: "Sucursal" })}:
                </Text>
                <Text style={[styles.valorEfectivo, { color: c.textPrimary }]} numberOfLines={1}>
                  {sucursalNombre}
                </Text>
              </View>
            )}

            {!(reserva as any).convenioWompi && !!ciudadSucursal && (
              <View style={styles.filaInfoEfectivo}>
                <Text style={[styles.etiquetaEfectivo, { color: c.textSecondary }]}>
                  {t("reserva.confirmacion.ciudad", { defaultValue: "Ciudad" })}:
                </Text>
                <Text style={[styles.valorEfectivo, { color: c.textPrimary }]}>{ciudadSucursal}</Text>
              </View>
            )}

            {!(reserva as any).convenioWompi && !!direccionSucursal && (
              <View style={styles.filaInfoEfectivo}>
                <Text style={[styles.etiquetaEfectivo, { color: c.textSecondary }]}>
                  {t("reserva.confirmacion.direccion", { defaultValue: "Dirección" })}:
                </Text>
                <Text style={[styles.valorEfectivo, { color: c.textPrimary }]} numberOfLines={2}>
                  {direccionSucursal}
                </Text>
              </View>
            )}

            <View style={[styles.divisorEfectivo, { backgroundColor: c.border }]} />

            <View style={styles.filaInfoEfectivo}>
              <Text style={[styles.etiquetaTotalEfectivo, { color: c.textSecondary }]}>
                {t("reserva.confirmacion.totalAPagar", { defaultValue: "TOTAL A PAGAR" })}:
              </Text>
              <Text style={[styles.valorTotalEfectivo, { color: primaryAccent }]}>{fmt(reserva.total)}</Text>
            </View>
          </View>

          {/* Tarjeta Amarilla: PLAZO PARA PAGAR */}
          <View
            style={[
              styles.plazoCardEfectivo,
              {
                backgroundColor: c.oscuro ? "#261C08" : "#FEFCE8",
                borderColor: c.oscuro ? "#785C15" : "#FDE047",
              },
            ]}
          >
            <Text style={[styles.plazoTituloEfectivo, { color: c.oscuro ? "#FCD34D" : "#854D0E" }]}>
              {t("reserva.confirmacion.plazoParaPagarTitulo", { defaultValue: "PLAZO PARA PAGAR" })}
            </Text>
            <Text style={[styles.plazoTextoEfectivo, { color: c.oscuro ? "#FDE68A" : "#713F12" }]}>
              {t("reserva.confirmacion.efectivoConfirmadaMensaje", {
                defaultValue:
                  "Tienes 72 horas desde ahora para realizar el pago. Si no pagas dentro de este plazo, la reserva se cancelará automáticamente.",
                horas: 72,
              })}
            </Text>
          </View>
        </View>
      )}

      {reserva.metodoPago === "wompi" && !esPendienteEfectivo && reserva.estado === "PENDIENTE" && (
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border, marginTop: 4, marginBottom: 16 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <View
              style={{
                backgroundColor: "rgba(37, 99, 235, 0.12)",
                paddingHorizontal: 8,
                paddingVertical: 3.5,
                borderRadius: 6,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Ionicons name="card-outline" size={13} color="#2563eb" />
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#2563eb" }}>Wompi Checkout</Text>
            </View>
          </View>
          <Text style={[styles.tituloEfectivo, { color: c.textPrimary, fontSize: 17, marginBottom: 6 }]}>
            {t("reserva.confirmacion.pagoPendienteTitulo", { defaultValue: "Pago Digital Pendiente" })}
          </Text>
          <Text style={[styles.descripcionEfectivo, { color: c.textSecondary, marginBottom: 14 }]}>
            {t("reserva.confirmacion.pagoPendienteTexto", {
              defaultValue:
                "Tu reserva está guardada como pendiente. Completa el pago seguro en Wompi para confirmar y habilitar tu contrato de alquiler.",
            })}
          </Text>
          <View
            style={[
              styles.cajaReferencia,
              { backgroundColor: c.oscuro ? c.bgInput : "#F8FAFC", borderColor: c.border, marginBottom: 14 },
            ]}
          >
            <View style={styles.filaInfoEfectivo}>
              <Text style={[styles.etiquetaTotalEfectivo, { color: c.textSecondary }]}>
                {t("reserva.confirmacion.totalAPagar", { defaultValue: "TOTAL A PAGAR" })}:
              </Text>
              <Text style={[styles.valorTotalEfectivo, { color: primaryAccent }]}>{fmt(reserva.total)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.btnWrap} onPress={handlePagarWompi} activeOpacity={0.88}>
            <LinearGradient
              colors={GRADIENTES.boton.colors}
              start={GRADIENTES.boton.start}
              end={GRADIENTES.boton.end}
              style={styles.btn}
            >
              <Ionicons name="card-outline" size={17} color="#fff" />
              <Text style={styles.btnTexto}>
                {t("reserva.confirmacion.pagarConWompi", { defaultValue: "Pagar con Wompi" })}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {contratoActual && !claveDesbloqueada ? (
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border, alignItems: "center" }]}>
          <Ionicons name="lock-closed-outline" size={32} color={c.textMuted} style={{ marginBottom: 10 }} />
          <Text style={[styles.tituloCandado, { color: c.textPrimary }]}>
            {t("misReservas.contratoBloqueadoTitulo")}
          </Text>
          <Text style={[styles.textoCandado, { color: c.textSecondary }]}>
            {t("misReservas.contratoBloqueadoTexto")}
          </Text>
          <View style={{ width: "100%", marginTop: 12 }}>
            <PasswordInput
              label={t("misReservas.claveContrato")}
              placeholder={t("misReservas.claveContratoPlaceholder")}
              value={claveIngresada}
              onChangeText={(v) => {
                setClaveIngresada(v);
                if (errorClave) setErrorClave("");
              }}
              error={errorClave}
              keyboardType="number-pad"
            />
          </View>
          <TouchableOpacity style={[styles.btnWrap, { marginTop: 4 }]} onPress={handleValidarClave} activeOpacity={0.85}>
            <LinearGradient
              colors={GRADIENTES.boton.colors}
              start={GRADIENTES.boton.start}
              end={GRADIENTES.boton.end}
              style={styles.btn}
            >
              <Text style={styles.btnTexto}>{t("misReservas.verContrato")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (!esPendienteEfectivo && !contratoActual) ? (
        <TouchableOpacity
          style={[styles.btnWrap, { marginBottom: 12 }, !contratoActual && { opacity: 0.5 }]}
          onPress={handleDescargarPdf}
          activeOpacity={0.85}
          disabled={generandoPdf || !contratoActual}
        >
          <LinearGradient
            colors={GRADIENTES.boton.colors}
            start={GRADIENTES.boton.start}
            end={GRADIENTES.boton.end}
            style={[styles.btn, { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }]}
          >
            {generandoPdf ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.btnTexto}>
              {generandoPdf ? t("misReservas.generandoPdf") : t("misReservas.descargarContrato")}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}

    </ScrollView>
      </KeyboardAvoidingView>
      )}
    </View>
  );
}

function HeaderDetalle({
  insets,
  c,
  titulo,
  onVolver,
}: {
  insets: { top: number };
  c: ReturnType<typeof useTemaColores>;
  titulo: string;
  onVolver: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingTop: insets.top,
        height: insets.top + 56,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        backgroundColor: c.bgHeader,
      }}
    >
      <TouchableOpacity
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.bgInput,
        }}
        onPress={onVolver}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={20} color={c.textPrimary} />
      </TouchableOpacity>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: c.textPrimary,
          marginLeft: 12,
          flexShrink: 1,
        }}
        numberOfLines={1}
      >
        {titulo}
      </Text>
    </View>
  );
}

function FilaDetalle({
  icono,
  label,
  valor,
  c,
  ultima,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  label: string;
  valor: string;
  c: ReturnType<typeof useTemaColores>;
  ultima?: boolean;
}) {
  return (
    <View
      style={[
        filaS.fila,
        { backgroundColor: c.bgInput, borderColor: c.border },
        ultima && { backgroundColor: c.primaryBg, borderColor: `${c.primary}35` },
      ]}
    >
      <View style={[filaS.iconoWrap, { backgroundColor: c.primaryBg }]}>
        <Ionicons name={icono} size={17} color={ultima ? c.success : c.primary} />
      </View>
      <Text style={[filaS.label, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[filaS.valor, { color: c.textPrimary }]} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

const filaS = StyleSheet.create({
  fila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  iconoWrap: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12.5, flex: 1 },
  valor: { fontSize: 12.5, fontWeight: "800", maxWidth: "52%", flexShrink: 1, textAlign: "right" },
});

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  procesandoTexto: { fontSize: 14 },
  tituloVacio: { fontSize: 17, fontWeight: "800", marginTop: 12, textAlign: "center" },
  textoVacio: { fontSize: 13, marginTop: 6, textAlign: "center", lineHeight: 19 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, alignItems: "center" },
  iconoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  foto: {
    width: 96,
    height: 72,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: "cover",
  },
  titulo: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  subtitulo: { fontSize: 13.5, textAlign: "center", marginTop: 8, lineHeight: 19, marginBottom: 20 },
  card: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  detalleCard: { padding: 12, paddingTop: 18, overflow: "hidden" },
  detalleFranja: { position: "absolute", top: 0, left: 0, right: 0, height: 6 },
  btnWrap: { width: "100%", borderRadius: 12 },
  btn: { paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  btnTexto: { color: "#fff", fontSize: 14.5, fontWeight: "800" },
  tituloCandado: { fontSize: 15.5, fontWeight: "800", textAlign: "center" },
  textoCandado: { fontSize: 12.5, textAlign: "center", marginTop: 6, lineHeight: 18 },
  btnDescargarWrap: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  cardEfectivo: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center",
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  logoImg: {
    width: 44,
    height: 28,
  },
  tituloEfectivo: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  descripcionEfectivo: {
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  cajaReferencia: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  filaInfoEfectivo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2.5,
  },
  etiquetaEfectivo: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  etiquetaTotalEfectivo: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  valorEfectivo: {
    fontSize: 11.5,
    fontWeight: "600",
    maxWidth: "55%",
    textAlign: "right",
  },
  valorRefEfectivo: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  valorTotalEfectivo: {
    fontSize: 14.5,
    fontWeight: "800",
  },
  divisorEfectivo: {
    height: 1,
    marginVertical: 6,
  },
  plazoCardEfectivo: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1.2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  plazoTituloEfectivo: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  plazoTextoEfectivo: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "500",
  },
  simuladorCaja: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  simuladorTitulo: {
    fontSize: 12,
    fontWeight: "800",
  },
  simuladorTexto: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
  },
  simuladorBtn: {
    backgroundColor: "#D97706",
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
  },
  simuladorBtnTexto: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
