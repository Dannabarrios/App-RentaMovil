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
import { useIdioma, useTemaColores } from "@/modules/i18n/hooks/useLanguage";
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
  compartirContratoPdf,
  crearTextosContrato,
  generarContratoPdf,
} from "@/modules/reservation/services/pdfService";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  aCentavos,
  construirUrlCheckout,
  consultarTransaccionWompi,
  WompiTransactionResponse,
} from "@/modules/reservation/services/wompiService";
import { documentosService, RegistroDocumentos } from "@/modules/reservation/services/documentsService";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

export default function PagoRespuestaScreen() {
  const insets = useSafeAreaInsets();
  const c = useTemaColores();
  const { t } = useTranslation();
  const { ref, id } = useLocalSearchParams<{ ref?: string; id?: string }>();
  const primaryAccent = c.oscuro ? "#60A5FA" : COLOR_MARCA;

  const [cargando, setCargando] = useState(true);
  const [reserva, setReserva] = useState<ReservaGuardada | null>(null);
  const [docsUsuario, setDocsUsuario] = useState<RegistroDocumentos | null>(null);
  const [contratoFirmado, setContratoFirmado] = useState(false);
  const [contratoActual, setContratoActual] = useState<ContratoGuardado | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [claveDesbloqueada, setClaveDesbloqueada] = useState(false);
  const [claveIngresada, setClaveIngresada] = useState("");
  const [errorClave, setErrorClave] = useState("");
  const [mostrarFirma, setMostrarFirma] = useState(false);
  const [mostrarLectorContrato, setMostrarLectorContrato] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      let rawRef = ref;
      let txData: WompiTransactionResponse | null = null;

      if (id) {
        txData = await consultarTransaccionWompi(id);
        if (txData?.reference) {
          rawRef = txData.reference;
        }
      }

      const cleanRef = rawRef ? (rawRef.includes("_") ? rawRef.split("_")[0] : rawRef) : undefined;

      if (!cleanRef && !rawRef) {
        setCargando(false);
        return;
      }

      let encontrada = await reservaPersistService.obtenerPorReferencia(cleanRef || rawRef!);
      if (!encontrada && rawRef) {
        encontrada = await reservaPersistService.obtenerPorReferencia(rawRef);
      }

      if (!txData && encontrada?.paymentId) {
        txData = await consultarTransaccionWompi(encontrada.paymentId);
      }

      if (encontrada && txData) {
        const pmType = (txData.payment_method_type || "").toUpperCase();
        let detalleMetodo = "Wompi";
        if (pmType === "BANCOLOMBIA_COLLECT" || pmType.includes("COLLECT")) {
          detalleMetodo = "Efectivo en Bancolombia";
        } else if (pmType === "NEQUI" || pmType.includes("NEQUI")) {
          detalleMetodo = "Nequi";
        } else if (pmType === "BANCOLOMBIA_TRANSFER" || pmType.includes("TRANSFER") || pmType.includes("BOTON_BANCOLOMBIA")) {
          detalleMetodo = "Bancolombia";
        } else if (pmType === "DAVIPLATA" || pmType.includes("DAVIPLATA")) {
          detalleMetodo = "Daviplata";
        } else if (pmType === "PSE" || pmType.includes("PSE")) {
          detalleMetodo = "PSE";
        } else if (pmType === "CARD" || pmType.includes("CARD")) {
          const brand = txData.payment_method?.extra?.brand || "";
          const last4 = txData.payment_method?.extra?.last_four || "";
          detalleMetodo = brand ? `Tarjeta ${brand} ${last4 ? `(••• ${last4})` : ""}`.trim() : "Tarjeta";
        }

        const cambios: Partial<ReservaGuardada> = {
          paymentId: txData.id,
          paymentMethodType: pmType,
          metodoPagoDetalle: detalleMetodo,
        };

        if (txData.status === "APPROVED") {
          cambios.estado = "CONFIRMADA";
        } else if (txData.status === "PENDING") {
          if (pmType === "BANCOLOMBIA_COLLECT" || pmType.includes("COLLECT")) {
            cambios.estado = "PENDIENTE_EFECTIVO";
            cambios.fechaLimitePago = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
            cambios.horasLimitePago = 72;
            cambios.convenioWompi =
              txData.payment_method?.extra?.business_agreement_code ||
              (txData as any).extra?.business_agreement_code ||
              "00000";
            cambios.referenciaWompi =
              txData.payment_method?.extra?.payment_reference ||
              (txData as any).extra?.payment_reference ||
              "";
          } else {
            cambios.estado = "PENDIENTE_VALIDACION";
            cambios.convenioWompi = null;
            cambios.referenciaWompi = null;
          }
        } else if (txData.status === "DECLINED" || txData.status === "ERROR") {
          cambios.estado = "CANCELADA";
        }
        await reservaPersistService.actualizarReserva(encontrada.referencia, cambios);
        encontrada = await reservaPersistService.obtenerPorReferencia(encontrada.referencia);
      }

      const refParaContrato = encontrada?.referencia || cleanRef || rawRef || "";
      const contrato = await contratoService.obtenerPorReserva(refParaContrato);
      if (encontrada?.usuarioId) {
        const docs = await documentosService.obtenerDocumentos(encontrada.usuarioId);
        if (activo) setDocsUsuario(docs);
      }
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
      const redirectUrl = "https://localtest.me/respuesta";
      const amountInCents = aCentavos(reserva.total);
      const attemptRef = `${reserva.referencia}_${Date.now()}`;
      const url = await construirUrlCheckout({
        reference: attemptRef,
        amountInCents,
        redirectUrl,
      });

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.href = url;
        return;
      }

      router.push({
        pathname: "/wompi-checkout",
        params: {
          url: encodeURIComponent(url),
          ref: encodeURIComponent(reserva.referencia),
        },
      });
    } catch (err) {
      console.error("[payment-response] Error abriendo Wompi", err);
      Alert.alert(t("comun.error", { defaultValue: "Error" }), t("reserva.confirmacion.errorWompi", { defaultValue: "No se pudo abrir la pasarela de pago de Wompi." }));
    }
  };

  const resolverMedioPagoTexto = (r: ReservaGuardada): string => {
    const pmType = String(
      r.paymentMethodType ||
      (r as any).wompiPaymentMethodType ||
      (r as any).wompiMetodo ||
      ""
    ).toUpperCase();

    const det = String(
      r.metodoPagoDetalle ||
      (r as any).subMetodoPago ||
      (r as any).formaPago ||
      ""
    ).trim();

    const mp = (r.metodoPago || "").toLowerCase();

    if (
      pmType === "BANCOLOMBIA_COLLECT" ||
      pmType.includes("COLLECT") ||
      det.toLowerCase().includes("corresponsal") ||
      det.toLowerCase().includes("efectivo en bancolombia") ||
      !!r.convenioWompi
    ) {
      return "Efectivo en Bancolombia";
    }

    if (mp === "efectivo" && !pmType) {
      return "Efectivo en sucursal";
    }

    if (pmType === "NEQUI" || det.toLowerCase().includes("nequi") || mp.includes("nequi")) {
      return "Pago Wompi - Nequi";
    }

    if (pmType === "DAVIPLATA" || det.toLowerCase().includes("daviplata") || mp.includes("daviplata")) {
      return "Pago Wompi - Daviplata";
    }

    if (
      pmType === "BANCOLOMBIA_TRANSFER" ||
      pmType === "BOTON_BANCOLOMBIA" ||
      (pmType.includes("BANCOLOMBIA") && !pmType.includes("COLLECT")) ||
      (det.toLowerCase().includes("bancolombia") && !det.toLowerCase().includes("corresponsal"))
    ) {
      return "Pago Wompi - Bancolombia";
    }

    if (pmType === "PSE" || det.toLowerCase().includes("pse") || mp.includes("pse")) {
      return "Pago Wompi - PSE";
    }

    if (pmType === "CARD" || det.toLowerCase().includes("tarjeta") || det.toLowerCase().includes("card") || mp.includes("tarjeta")) {
      return det && (det.toLowerCase().includes("visa") || det.toLowerCase().includes("mastercard"))
        ? `Pago Wompi - ${det}`
        : "Pago Wompi - Tarjeta";
    }

    if (det && det.toLowerCase() !== "wompi") {
      return det.startsWith("Pago Wompi") ? det : `Pago Wompi - ${det}`;
    }

    return "Pago Wompi";
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

  const pmTypeUpper = String(reserva.paymentMethodType || "").toUpperCase();
  const detLower = String(reserva.metodoPagoDetalle || "").toLowerCase();

  const esPendienteEfectivo =
    reserva.estado === "PENDIENTE_EFECTIVO" ||
    (reserva.estado === "PENDIENTE" && reserva.metodoPago === "efectivo") ||
    pmTypeUpper.includes("COLLECT") ||
    detLower.includes("efectivo en bancolombia");

  // La firma solo se habilita para reservas pagadas/confirmadas o pendientes de validacion digital, NUNCA cuando está pendiente pago en efectivo
  const puedeFirmar = !contratoFirmado && !esPendienteEfectivo && (
    reserva.estado === "CONFIRMADA" ||
    (reserva.metodoPago === "wompi" && reserva.estado === "PENDIENTE_VALIDACION")
  );

  // Pantalla completa de firma cuando el usuario la solicita
  if (mostrarFirma && puedeFirmar) {
    const vehiculoSnap2 = reserva.vehiculoSnapshot as Vehiculo | undefined;
    const datosPersonalesSnap2 = reserva.datosPersonalesSnapshot as DatosPersonales | undefined;
    const datosDocumentosSnap2 = reserva.datosDocumentosSnapshot as DatosDocumentos | undefined;
    const fechasLugarSnap2 = reserva.fechasLugarSnapshot as DatosFechasLugar | undefined;
    const planesSnap2 = reserva.planesSnapshot as DatosPlanes | undefined;

    if (vehiculoSnap2 && datosPersonalesSnap2 && fechasLugarSnap2 && planesSnap2) {
      const nombreLicenciaSnap2 =
        datosDocumentosSnap2?.licenciaConduccion?.nombre ||
        docsUsuario?.licencia?.nombre ||
        "Licencia verificada en perfil";
      const nombreCedulaSnap2 =
        datosDocumentosSnap2?.cedulaFrente?.nombre ||
        docsUsuario?.identificacion?.nombre ||
        null;

      const datosDocumentosParaFirma: DatosDocumentos = {
        cedulaFrente: nombreCedulaSnap2 ? { nombre: nombreCedulaSnap2 } : null,
        cedulaReverso: datosDocumentosSnap2?.cedulaReverso ?? null,
        licenciaConduccion: { nombre: nombreLicenciaSnap2 },
      };

      return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <HeaderDetalle
            insets={insets}
            c={c}
            titulo={t("reserva.contrato.title", { defaultValue: "Contrato de Alquiler" })}
            onVolver={() => setMostrarFirma(false)}
          />
          <FirmaContrato
            vehiculo={vehiculoSnap2}
            datosPersonales={datosPersonalesSnap2}
            datosDocumentos={datosDocumentosParaFirma}
            fechasLugar={fechasLugarSnap2}
            planes={planesSnap2}
            total={reserva.total}
            referencia={reserva.referencia}
            onFirmado={async () => {
              await reservaPersistService.actualizarEstado(reserva.referencia, "CONFIRMADA");
              const actualizada = await reservaPersistService.obtenerPorReferencia(reserva.referencia);
              const contratoNuevo = await contratoService.obtenerPorReserva(reserva.referencia);
              setReserva(actualizada ?? null);
              setContratoActual(contratoNuevo);
              setContratoFirmado(true);
              setMostrarFirma(false);
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
          ? t("misReservas.detalle.tituloPendienteEfectivo", { defaultValue: "Pendiente de pago en efectivo" })
          : reserva.estado === "PENDIENTE_VALIDACION"
          ? t("misReservas.detalle.tituloPendienteValidacion", { defaultValue: "Pago en validación" })
          : reserva.metodoPago === "wompi" || reserva.estado === "PENDIENTE"
          ? t("misReservas.detalle.tituloPagoDigitalPendiente", { defaultValue: "Pago Digital Pendiente" })
          : t("misReservas.detalle.tituloPendiente", { defaultValue: "Reserva pendiente" }),
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

  const nombreLicenciaSnap =
    datosDocumentosSnap?.licenciaConduccion?.nombre ||
    docsUsuario?.licencia?.nombre ||
    "Licencia verificada en perfil";
  const nombreCedulaSnap =
    datosDocumentosSnap?.cedulaFrente?.nombre ||
    docsUsuario?.identificacion?.nombre ||
    null;

  const datosDocumentosEfectivos: DatosDocumentos = {
    cedulaFrente: nombreCedulaSnap ? { nombre: nombreCedulaSnap } : null,
    cedulaReverso: datosDocumentosSnap?.cedulaReverso ?? null,
    licenciaConduccion: { nombre: nombreLicenciaSnap },
  };

  const formatLugar = (lugar: string | undefined | null, modo: "entrega" | "devolucion") => {
    if (!lugar || lugar.trim() === "") return "—";
    if (lugar === "domicilio") {
      return t(modo === "entrega" ? "reserva.fechasLugar.entregaDomicilio" : "reserva.fechasLugar.devolucionDomicilio", {
        defaultValue: modo === "entrega" ? "Entrega a domicilio" : "Devolución a domicilio",
      });
    }
    if (lugar === "aeropuerto") {
      return t(modo === "entrega" ? "reserva.fechasLugar.entregaAeropuerto" : "reserva.fechasLugar.devolucionAeropuerto", {
        defaultValue: modo === "entrega" ? "Entrega en aeropuerto" : "Devolución en aeropuerto",
      });
    }
    if (lugar === "terminal") {
      return t(modo === "entrega" ? "reserva.fechasLugar.entregaTerminal" : "reserva.fechasLugar.devolucionTerminal", {
        defaultValue: modo === "entrega" ? "Entrega en terminal" : "Devolución en terminal",
      });
    }
    return lugar;
  };

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
    numeroDocumento: (reserva as any)?.numeroDocumento || "",
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

  const handleValidarClave = () => {
    const docReserva = String(datosPersonalesEfectivos?.numeroDocumento || (reserva as any)?.numeroDocumento || "");
    const numeroDocumento = docReserva.replace(/\D/g, "");
    const claveNormalizada = claveIngresada.replace(/\D/g, "");
    if ((numeroDocumento && claveNormalizada === numeroDocumento) || (docReserva && claveIngresada.trim() === docReserva.trim())) {
      setErrorClave("");
      setClaveIngresada("");
      router.push(`/contract-view?ref=${encodeURIComponent(reserva.referencia)}&unlocked=true`);
    } else {
      setErrorClave(t("misReservas.claveIncorrecta", { defaultValue: "Número de documento incorrecto." }));
    }
  };

  const handleDescargarPdf = async () => {
    if (!contratoActual) {
      Alert.alert(t("misReservas.contratoNoDisponibleTitulo"), t("misReservas.contratoNoDisponible"));
      return;
    }
    setGenerandoPdf(true);
    try {
      const pdfNombre = contratoActual.contratoPdfNombre || `contrato-${reserva.referencia}.pdf`;
      const tipoDoc = datosPersonalesEfectivos.tipoDocumento;
      const tipoDocumentoTexto = tipoDoc
        ? String(t(`reserva.datosPersonales.tiposDocumento.${tipoDoc === "Doc. Extranjero" ? "DocExtranjero" : tipoDoc}`, { defaultValue: tipoDoc }))
        : "";

      const resPdf = await generarContratoPdf({
        contrato: contratoActual,
        vehiculo: vehiculoEfectivo,
        datosPersonales: datosPersonalesEfectivos,
        datosDocumentos: datosDocumentosEfectivos,
        fechasLugar: fechasLugarEfectivas,
        planes: planesEfectivos,
        total: reserva.total,
        referencia: reserva.referencia,
        formatPrecio: fmt,
        formatearFecha: (iso: string | null) => (iso ? fechaCorta(iso) : "—"),
        tipoDocumentoTexto,
        textos: crearTextosContrato((key: string, opts?: any) => String(t(key, opts) || "")),
      });

      if (resPdf?.base64 && !contratoActual.contratoPdfBase64) {
        const actualizado = await contratoService.guardarPdfContrato(reserva.referencia, resPdf.base64, pdfNombre);
        if (actualizado) setContratoActual(actualizado);
      }

      if (resPdf?.uri) {
        await compartirContratoPdf(resPdf.uri, pdfNombre, resPdf.html);
      }
    } catch (error) {
      console.error("[pago-respuesta] Error generando el PDF", error);
      Alert.alert(
        t("misReservas.errorPdfTitulo", { defaultValue: "Error" }),
        t("misReservas.errorPdfMensaje", { defaultValue: "No fue posible generar o descargar el PDF del contrato." })
      );
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
      {/* Título y Subtítulo afuera de la tarjeta */}
      <Text style={[styles.titulo, { color: c.textPrimary }]}>{encabezado.titulo}</Text>
      <Text style={[styles.subtitulo, { color: c.textSecondary }]}>{reserva.vehiculoNombre}</Text>

      {/* Tarjeta 1: Ficha y Resumen del Alquiler */}
      <View style={[styles.card, styles.resumenCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        {/* Foto del vehículo */}
        {foto ? (
          <Image source={{ uri: foto }} style={styles.fotoVehiculo} resizeMode="cover" />
        ) : (
          <View style={[styles.fotoVehiculoFallback, { backgroundColor: c.primaryBg }]}>
            <Ionicons name="car-sport-outline" size={48} color={c.primary} />
          </View>
        )}

        {/* Grid de 10 Tiles */}
        <View style={styles.gridTiles}>
          <InfoTile
            icono="car-sport"
            label={t("reserva.confirmacion.respuesta.vehiculo", { defaultValue: "Vehículo" })}
            valor={reserva.vehiculoNombre}
            c={c}
          />
          <InfoTile
            icono="calendar"
            label={t("misReservas.detalle.fechaInicio", { defaultValue: "Fecha de retiro" })}
            valor={reserva.fechaRetiro ? fechaCorta(String(reserva.fechaRetiro)) : "—"}
            c={c}
          />
          <InfoTile
            icono="calendar-outline"
            label={t("misReservas.detalle.fechaFin", { defaultValue: "Fecha de devolución" })}
            valor={reserva.fechaDevolucion ? fechaCorta(String(reserva.fechaDevolucion)) : "—"}
            c={c}
          />
          <InfoTile
            icono="location"
            label={t("misReservas.detalle.lugarRetiro", { defaultValue: "Lugar de retiro" })}
            valor={formatLugar(reserva.lugarRetiro ?? (reserva.fechasLugarSnapshot as any)?.lugarRetiro, "entrega")}
            c={c}
          />
          <InfoTile
            icono="location"
            label={t("misReservas.detalle.lugarDevolucion", { defaultValue: "Lugar de devolución" })}
            valor={formatLugar(reserva.lugarDevolucion ?? (reserva.fechasLugarSnapshot as any)?.lugarDevolucion ?? reserva.lugarRetiro, "devolucion")}
            c={c}
          />
          <InfoTile
            icono="card"
            label={t("reserva.confirmacion.respuesta.medioPago", { defaultValue: "Medio de pago" })}
            valor={resolverMedioPagoTexto(reserva)}
            c={c}
          />
          <InfoTile
            icono="shield-checkmark"
            label={t("misReservas.detalle.proteccion", { defaultValue: "Protección" })}
            valor={
              reserva.proteccion
                ? t(`reserva.planes.nombreSeguro.${reserva.proteccion}`, { defaultValue: String(reserva.proteccion) })
                : "Protección Obligatoria"
            }
            c={c}
          />
          <InfoTile
            icono="receipt"
            label={
              esPendienteEfectivo && (reserva as any).referenciaWompi
                ? "Ref. de pago"
                : t("reserva.confirmacion.respuesta.referencia", { defaultValue: "Referencia" })
            }
            valor={
              esPendienteEfectivo && (reserva as any).referenciaWompi
                ? (reserva as any).referenciaWompi
                : reserva.referencia
            }
            c={c}
          />
          <InfoTile
            icono="cash"
            label={t("reserva.confirmacion.respuesta.total", { defaultValue: "Total" })}
            valor={fmt(reserva.total)}
            c={c}
          />
          <InfoTile
            icono="checkmark-circle"
            label={t("reserva.confirmacion.respuesta.estado", { defaultValue: "Estado" })}
            valor={estadoTexto}
            colorValor={
              grupo === "pendiente"
                ? "#16A34A"
                : grupo === "confirmada"
                ? "#2563EB"
                : grupo === "en_curso"
                ? "#16A34A"
                : grupo === "cancelada"
                ? "#DC2626"
                : c.textPrimary
            }
            c={c}
          />
        </View>
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
            {!!(reserva as any).convenioWompi || String((reserva as any).paymentMethodType || "").toUpperCase().includes("COLLECT") || String((reserva as any).metodoPagoDetalle || "").toLowerCase().includes("efectivo en bancolombia")
              ? "Pago en Efectivo - Bancolombia"
              : t("reserva.confirmacion.efectivoConfirmadaTitulo", { defaultValue: "Reserva Registrada" })}
          </Text>

          {/* Mensaje descriptivo */}
          <Text style={[styles.descripcionEfectivo, { color: c.textSecondary }]}>
            {!!(reserva as any).convenioWompi || String((reserva as any).paymentMethodType || "").toUpperCase().includes("COLLECT") || String((reserva as any).metodoPagoDetalle || "").toLowerCase().includes("efectivo en bancolombia")
              ? "Acércate a un Corresponsal Bancario Bancolombia con los datos mostrados a continuación y efectúa el pago antes del plazo límite para confirmar tu reserva:"
              : sucursalNombre
              ? `Tu reserva quedó registrada. Para confirmarla, realiza el pago en efectivo en el punto autorizado ${sucursalNombre}.`
              : "Tu reserva quedó registrada. Para confirmarla, realiza el pago en efectivo en la sucursal seleccionada."}
          </Text>

          {/* Caja de Referencia y Total */}
          <View style={[styles.cajaReferencia, { backgroundColor: c.oscuro ? c.bgInput : "#F8FAFC", borderColor: c.border }]}>
            {esPendienteEfectivo ? (
              <>
                <View style={styles.filaInfoEfectivo}>
                  <Text style={[styles.etiquetaEfectivo, { color: c.textSecondary, fontWeight: "700" }]}>Número de convenio:</Text>
                  <Text style={[styles.valorEfectivo, { color: primaryAccent, fontWeight: "800", fontSize: 16 }]}>
                    {(reserva as any).convenioWompi || "00000"}
                  </Text>
                </View>

                <View style={styles.filaInfoEfectivo}>
                  <Text style={[styles.etiquetaEfectivo, { color: c.textSecondary, fontWeight: "700" }]}>Referencia de pago:</Text>
                  <Text style={[styles.valorRefEfectivo, { color: primaryAccent, fontWeight: "800", fontSize: 16 }]}>
                    {(reserva as any).referenciaWompi ||
                     (reserva as any).wompiExtra?.payment_reference ||
                     (reserva as any).wompiExtra?.reference ||
                     (reserva as any).paymentId ||
                     reserva.referencia}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.filaInfoEfectivo}>
                <Text style={[styles.etiquetaEfectivo, { color: c.textSecondary }]}>
                  {t("reserva.confirmacion.respuesta.referencia", { defaultValue: "Referencia de reserva" })}:
                </Text>
                <Text style={[styles.valorRefEfectivo, { color: c.textPrimary }]}>{reserva.referencia}</Text>
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
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border, marginTop: 4, marginBottom: 16, alignItems: "center" }]}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: c.oscuro ? "rgba(96, 165, 250, 0.18)" : "rgba(37, 99, 235, 0.1)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons name="card-outline" size={26} color={primaryAccent} />
          </View>
          <Text style={[styles.tituloEfectivo, { color: c.textPrimary, fontSize: 18, marginBottom: 6 }]}>
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
              <Text style={[styles.valorTotalEfectivo, { color: primaryAccent }]}>{fmt(reserva.total)} COP</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.btnWrap} onPress={handlePagarWompi} activeOpacity={0.88}>
            <LinearGradient
              colors={GRADIENTES.boton.colors}
              start={GRADIENTES.boton.start}
              end={GRADIENTES.boton.end}
              style={[styles.btn, { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }]}
            >
              <Ionicons name="card-outline" size={18} color="#fff" />
              <Text style={styles.btnTexto}>
                {t("reserva.confirmacion.pagarConWompi", { defaultValue: "Pagar con Wompi" })}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Tarjeta CTA: Firma tu Contrato (solo cuando el pago ya fue confirmado y no se ha firmado) */}
      {puedeFirmar && (
        <View
          style={[
            styles.card,
            {
              backgroundColor: c.bgCard,
              borderColor: c.border,
              alignItems: "center",
            },
          ]}
        >
          {/* Logo Drivique con fondo blanco */}
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: c.oscuro ? "rgba(255, 255, 255, 0.08)" : "#FFFFFF",
              borderWidth: 1,
              borderColor: c.border,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            <Image
              source={require("@/assets/images/logo.png")}
              style={{ width: 38, height: 38, resizeMode: "contain" }}
            />
          </View>
          <Text style={[styles.tituloCandado, { color: c.textPrimary, marginBottom: 6 }]}>
            {t("misReservas.firmaContratoTitulo", { defaultValue: "Firma tu Contrato" })}
          </Text>
          <Text style={[styles.textoCandado, { color: c.textSecondary, marginBottom: 16 }]}>
            {t("misReservas.firmaContratoTexto", {
              defaultValue:
                "Tu reserva ha sido confirmada. Lee y firma el contrato de alquiler para habilitar el acceso al documento.",
            })}
          </Text>
          <TouchableOpacity
            style={styles.btnWrap}
            onPress={() => setMostrarFirma(true)}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={GRADIENTES.boton.colors}
              start={GRADIENTES.boton.start}
              end={GRADIENTES.boton.end}
              style={[styles.btn, { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }]}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.btnTexto}>
                {t("misReservas.firmaContratoBoton", { defaultValue: "Leer y Firmar Contrato" })}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Tarjeta de Contrato de Alquiler */}
      {!contratoActual ? (
        /* Estado 1: Contrato aún no firmado (Bloqueado hasta la firma) */
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border, alignItems: "center" }]}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: c.oscuro ? "rgba(148, 163, 184, 0.15)" : "#F1F5F9",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
            }}
          >
            <Ionicons name="lock-closed" size={24} color={c.textMuted} />
          </View>
          <Text style={[styles.tituloCandado, { color: c.textPrimary }]}>
            {t("misReservas.contratoBloqueadoTitulo", { defaultValue: "Contrato protegido" })}
          </Text>
          <Text style={[styles.textoCandado, { color: c.textSecondary }]}>
            {t("misReservas.contratoPendienteFirmaTexto", {
              defaultValue:
                "Para desbloquear el contrato con tu clave, primero se debe confirmar el pago y completar la firma digital del contrato.",
            })}
          </Text>
          <View style={{ width: "100%", marginTop: 12, opacity: c.oscuro ? 0.75 : 0.6 }}>
            <PasswordInput
              placeholder={t("misReservas.claveContratoPlaceholder")}
              value=""
              editable={false}
              keyboardType="number-pad"
            />
          </View>
          <View style={[styles.btnWrap, { marginTop: 4, opacity: c.oscuro ? 0.75 : 0.6 }]}>
            <View
              style={[
                styles.btn,
                {
                  backgroundColor: c.oscuro ? "rgba(148, 163, 184, 0.22)" : "#E2E8F0",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                },
              ]}
            >
              <Ionicons name="lock-closed" size={16} color={c.oscuro ? "#CBD5E1" : c.textMuted} />
              <Text style={[styles.btnTexto, { color: c.oscuro ? "#CBD5E1" : c.textMuted }]}>
                {t("misReservas.verContrato", { defaultValue: "Ver contrato" })}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        /* Tarjeta de presentación: Contrato firmado protegido con documento */
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border, alignItems: "center" }]}>
          <Ionicons name="lock-closed-outline" size={32} color={primaryAccent} style={{ marginBottom: 10 }} />
          <Text style={[styles.tituloCandado, { color: c.textPrimary }]}>
            {t("misReservas.contratoBloqueadoTitulo", { defaultValue: "Contrato protegido" })}
          </Text>
          <Text style={[styles.textoCandado, { color: c.textSecondary }]}>
            {t("misReservas.contratoBloqueadoTexto", {
              defaultValue: "Ingresa el número de documento con el que confirmaste esta reserva para ver el contrato.",
            })}
          </Text>
          <View style={{ width: "100%", marginTop: 12 }}>
            <PasswordInput
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
      )}

        </ScrollView>
      </KeyboardAvoidingView>
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
  const { temaActual, toggleTema } = useIdioma();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
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
          alignItems: "center",
          justifyContent: "center",
        }}
        onPress={onVolver}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
      </TouchableOpacity>

      <Text
        style={{
          flex: 1,
          fontSize: 16,
          fontWeight: "700",
          color: c.textPrimary,
          textAlign: "center",
          marginHorizontal: 8,
        }}
        numberOfLines={1}
      >
        {titulo}
      </Text>

      <TouchableOpacity
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.bgInput,
          borderWidth: 1,
          borderColor: c.border,
        }}
        onPress={toggleTema}
        activeOpacity={0.8}
      >
        <Ionicons
          name={temaActual === "oscuro" ? "sunny-outline" : "moon-outline"}
          size={18}
          color={temaActual === "oscuro" ? "#F59E0B" : c.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );
}

function InfoTile({
  icono,
  label,
  valor,
  colorValor,
  c,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  label: string;
  valor: string;
  colorValor?: string;
  c: ReturnType<typeof useTemaColores>;
}) {
  const azulMarca = c.oscuro ? "#93C5FD" : "#1E3A8A";
  const bgIcono = c.oscuro ? "rgba(147, 197, 253, 0.15)" : "rgba(30, 58, 138, 0.08)";

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: c.oscuro ? c.bgInput : "#F8FAFC",
          borderColor: c.border,
        },
      ]}
    >
      <View
        style={[
          styles.tileIconoWrap,
          {
            backgroundColor: bgIcono,
          },
        ]}
      >
        <Ionicons name={icono} size={18} color={azulMarca} />
      </View>
      <View style={styles.tileTextWrap}>
        <Text style={[styles.tileLabel, { color: c.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
        <Text
          style={[
            styles.tileValor,
            { color: colorValor || c.textPrimary },
          ]}
          numberOfLines={2}
        >
          {valor}
        </Text>
      </View>
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
  scroll: { paddingHorizontal: 16, paddingBottom: 40, alignItems: "center" },
  resumenCard: {
    padding: 16,
    marginBottom: 16,
  },
  fotoVehiculo: {
    width: "100%",
    height: 195,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: "#F1F5F9",
  },
  fotoVehiculoFallback: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  gridTiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  tile: {
    width: "48.5%",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tileIconoWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tileTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  tileLabel: {
    fontSize: 10.5,
    fontWeight: "500",
    marginBottom: 2,
  },
  tileValor: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
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
  subtitulo: { fontSize: 13, textAlign: "center", marginTop: 4, lineHeight: 18, marginBottom: 16 },
  card: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
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
