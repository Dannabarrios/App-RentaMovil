// modules/reserva/components/FormDatosPersonales.tsx
import { Vehiculo } from "@/modules/catalog/types/catalog.types";
import { useReservaStore } from "@/store/reservationStore";
import { useUsuarioStore } from "@/store/userStore";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { AlertModal } from "../../../components/ui/AlertModal";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import {
  COLOR_MARCA,
  getPrefijoPorNacionalidad,
  NACIONALIDADES,
  PORCENTAJE_CARGOS_ADMINISTRATIVOS,
  PORCENTAJE_IVA,
  RECARGO_LOGISTICO,
  getTiposDocumento,
} from "../constants/reservation.constants";
import { TipoDocumento } from "../types/reservation.types";
import {
  aCentavos,
  construirUrlCheckout,
  generarReferenciaUnica,
} from "../services/wompiService";
import {
  HORAS_LIMITE_PAGO_EFECTIVO,
  reservaPersistService,
} from "../services/reservationPersistService";
import { documentosService } from "../services/documentsService";
import BarraTotalConfirmar from "./TotalConfirmBar";
import CampoSelectorLista from "./ListSelectorField";
import FirmaContrato from "./ContractSignature";
import ModalReservaRegistrada from "./BookingRegisteredModal";
import { BranchCashPaymentModal } from "./BranchCashPaymentModal";
import { diasEntre } from "./BookingSummaryModal.pieces";
import TarjetaTerminosCondiciones from "./TermsConditionsCard";
import TarjetaVerificacionDocumental from "./DocumentVerificationCard";
import CouponSection from "./CouponSection";

const OPCIONES_NACIONALIDAD = NACIONALIDADES.map((n) => ({
  id: n.nombre,
  label: n.nombre,
}));

function combinarNombreCompleto(nombres: string, apellidos: string): string {
  return [nombres, apellidos].filter(Boolean).join(" ").trim();
}

function separarNombreCompleto(nombreCompleto: string): {
  nombres: string;
  apellidos: string;
} {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return { nombres: "", apellidos: "" };
  if (partes.length === 1) return { nombres: partes[0], apellidos: "" };
  const mitad = Math.ceil(partes.length / 2);
  return {
    nombres: partes.slice(0, mitad).join(" "),
    apellidos: partes.slice(mitad).join(" "),
  };
}

interface Props {
  vehiculo: Vehiculo;
}

export default function FormDatosPersonales({ vehiculo }: Props) {
  const c = useTemaColores();
  const { t } = useTranslation();
  const OPCIONES_TIPO_DOCUMENTO = useMemo(() => getTiposDocumento(t), [t]);
  const datosPersonales = useReservaStore((s) => s.datosPersonales);
  const actualizarDatosPersonales = useReservaStore(
    (s) => s.actualizarDatosPersonales,
  );
  const fechasLugar = useReservaStore((s) => s.fechasLugar);
  const planes = useReservaStore((s) => s.planes);
  const documentos = useReservaStore((s) => s.documentos);
  const cuponAplicado = useReservaStore((s) => s.cuponAplicado);

  const usuarioGlobal = useUsuarioStore((s) => s.usuario);
  const actualizarUsuarioGlobal = useUsuarioStore((s) => s.actualizarUsuario);
  const limpiarReserva = useReservaStore((s) => s.limpiarReserva);

  const [modalReservaVisible, setModalReservaVisible] = useState(false);
  const [docsVerificados, setDocsVerificados] = useState(false);

  useEffect(() => {
    let activo = true;
    documentosService.tieneDocumentos(usuarioGlobal.id).then((valor) => {
      if (activo) setDocsVerificados(valor);
    });
    return () => {
      activo = false;
    };
  }, [usuarioGlobal.id]);
  const [alertaFaltantesVisible, setAlertaFaltantesVisible] = useState(false);
  const [alertaEfectivoVisible, setAlertaEfectivoVisible] = useState(false);
  const [alertaErrorPagoVisible, setAlertaErrorPagoVisible] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [referenciaActual, setReferenciaActual] = useState<string | null>(null);
  const [mostrarContrato, setMostrarContrato] = useState(false);
  const [modalInstruccionesEfectivoVisible, setModalInstruccionesEfectivoVisible] = useState(false);

  const primaryAccent = c.oscuro ? "#60A5FA" : COLOR_MARCA;
  const brandBg = c.oscuro ? "#3B82F6" : COLOR_MARCA;

  useEffect(() => {
    const precarga: Partial<typeof datosPersonales> = {};
    if (
      !datosPersonales.nombreCompleto &&
      (usuarioGlobal.nombres || usuarioGlobal.apellidos)
    ) {
      precarga.nombreCompleto = combinarNombreCompleto(
        usuarioGlobal.nombres,
        usuarioGlobal.apellidos,
      );
    }
    if (!datosPersonales.correo && usuarioGlobal.correo) {
      precarga.correo = usuarioGlobal.correo;
    }
    if (!datosPersonales.nacionalidad && usuarioGlobal.nacionalidad) {
      precarga.nacionalidad = usuarioGlobal.nacionalidad;
    }
    if (!datosPersonales.tipoDocumento && usuarioGlobal.tipoDocumento) {
      precarga.tipoDocumento = usuarioGlobal.tipoDocumento;
    }
    if (!datosPersonales.numeroDocumento && usuarioGlobal.numeroDocumento) {
      precarga.numeroDocumento = usuarioGlobal.numeroDocumento;
    }
    if (!datosPersonales.celular && usuarioGlobal.telefono) {
      precarga.celular = usuarioGlobal.telefono;
    }
    if (Object.keys(precarga).length > 0) {
      actualizarDatosPersonales(precarga);
    }
  }, []);

  const prefijoTelefono = getPrefijoPorNacionalidad(
    datosPersonales.nacionalidad || null,
  );
  const hayPrefijo = prefijoTelefono !== "";

  const datosCompletos =
    !!datosPersonales.nombreCompleto.trim() &&
    !!datosPersonales.nacionalidad &&
    !!datosPersonales.correo.trim() &&
    !!datosPersonales.celular.trim() &&
    !!datosPersonales.tipoDocumento &&
    !!datosPersonales.numeroDocumento.trim() &&
    (docsVerificados || !!documentos.cedulaFrente) &&
    (docsVerificados || !!documentos.licenciaConduccion) &&
    !!datosPersonales.terminosAceptados;

  const total = useMemo(() => {
    const seguros = vehiculo.seguros ?? [];
    const kmLimitado = vehiculo.tarifas?.kmLimitado;
    const kmIlimitado = vehiculo.tarifas?.kmIlimitado;
    const servicios = (vehiculo.servicios ?? []).filter(
      (s) => !s.nombre.toLowerCase().includes("otra ciudad")
    );

    const seguroElegido =
      seguros.find((s) => s.nombre === planes.proteccion) ?? null;
    const kmElegido =
      planes.tipoKilometraje === "limitado"
        ? kmLimitado
        : planes.tipoKilometraje === "ilimitado"
          ? kmIlimitado
          : null;

    const dias = diasEntre(
      fechasLugar.fechaRetiro,
      fechasLugar.fechaDevolucion,
    );
    const diarias = vehiculo.precio * dias;
    const proteccion = seguroElegido ? seguroElegido.precio * dias : 0;
    const kilometraje = kmElegido ? kmElegido.precio * dias : 0;
    const servAdic = servicios
      .filter((s) => planes.serviciosSeleccionados.includes(s.nombre))
      .reduce((a, s) => a + s.precio * dias, 0);
    const subtotalBase = diarias + proteccion + kilometraje + servAdic;
    const cargos = Math.round(subtotalBase * PORCENTAJE_CARGOS_ADMINISTRATIVOS);
    const subtotalBruto = subtotalBase + cargos + RECARGO_LOGISTICO;
      
    let descuentoCupon = 0;
    if (cuponAplicado) {
      if (cuponAplicado.descuentoPorcentaje) {
        descuentoCupon = Math.round(subtotalBruto * (cuponAplicado.descuentoPorcentaje / 100));
      } else if (cuponAplicado.descuentoFijo) {
        descuentoCupon = cuponAplicado.descuentoFijo;
      }
    }
    
    const subtotal = Math.max(subtotalBruto - descuentoCupon, 0);
    const iva = Math.round(subtotal * PORCENTAJE_IVA);
    return subtotal + iva;
  }, [vehiculo, fechasLugar.fechaRetiro, fechasLugar.fechaDevolucion, planes, cuponAplicado]);

  const handleConfirmarReserva = async () => {
    if (!datosCompletos) {
      setAlertaFaltantesVisible(true);
      return;
    }

    const referencia = generarReferenciaUnica();
    const metodoPago = fechasLugar.metodoPago;

    // Si subió un documento nuevo (o todavía no tenía ninguno guardado),
    // lo dejamos registrado para no volver a pedírselo en la próxima
    // reserva — igual que en la web.
    if (documentos.cedulaFrente || documentos.licenciaConduccion || !docsVerificados) {
      await documentosService.guardarDocumentos(usuarioGlobal.id, {
        identificacion: documentos.cedulaFrente,
        licencia: documentos.licenciaConduccion,
      });
    }

    await reservaPersistService.guardarReserva({
      referencia,
      usuarioId: usuarioGlobal.id,
      vehiculoId: vehiculo.id,
      vehiculoNombre: vehiculo.nombre,
      metodoPago,
      total,
      fechaReserva: new Date().toISOString(),
      fechaRetiro: fechasLugar.fechaRetiro,
      fechaDevolucion: fechasLugar.fechaDevolucion,
      lugarRetiro: fechasLugar.lugarRetiro,
      lugarDevolucion: fechasLugar.lugarDevolucion,
      proteccion: planes.proteccion,
      tipoKilometraje: planes.tipoKilometraje,
      // Snapshot completo para poder reconstruir el contrato en la pantalla
      // de respuesta de pago, ya que ahí el store de la reserva en curso
      // (useReservaStore) ya se limpió.
      vehiculoSnapshot: vehiculo,
      datosPersonalesSnapshot: datosPersonales,
      datosDocumentosSnapshot: {
        licenciaConduccion: documentos.licenciaConduccion
          ? { nombre: documentos.licenciaConduccion.nombre }
          : null,
      },
      fechasLugarSnapshot: fechasLugar,
      planesSnapshot: planes,
    });

    setReferenciaActual(referencia);

    if (metodoPago === "efectivo") {
      setModalInstruccionesEfectivoVisible(true);
    } else {
      setModalReservaVisible(true);
    }
  };

  const handleIrAMisReservas = () => {
    setModalInstruccionesEfectivoVisible(false);
    limpiarReserva();
    router.replace("/(tabs)/my-bookings");
  };

  const handleVolverAlInicio = () => {
    setModalInstruccionesEfectivoVisible(false);
    limpiarReserva();
    router.replace("/(tabs)");
  };

  const handleCancelarModalReserva = async () => {
    setModalReservaVisible(false);
    if (referenciaActual) {
      await reservaPersistService.eliminarReserva(referenciaActual);
    }
  };

  const handleContratoFirmado = async () => {
    if (referenciaActual) {
      await reservaPersistService.actualizarEstado(referenciaActual, "CONFIRMADA");
    }
    setMostrarContrato(false);
    setAlertaEfectivoVisible(true);
  };

  const handlePagarWompi = async () => {
    if (!referenciaActual) return;
    setModalReservaVisible(false);
    setProcesandoPago(true);

    try {
      const redirectUrl = Linking.createURL("pago-respuesta");
      const amountInCents = aCentavos(total);

      const url = await construirUrlCheckout({
        reference: referenciaActual,
        amountInCents,
        redirectUrl,
      });

      const resultado = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

      if (resultado.type === "success" && resultado.url) {
        const { queryParams } = Linking.parse(resultado.url);
        const transactionId =
          typeof queryParams?.id === "string" ? queryParams.id : null;

        let nuevoEstado: "PENDIENTE_VALIDACION" | "PENDIENTE_EFECTIVO" | "CONFIRMADA" = "PENDIENTE_VALIDACION";

        if (transactionId) {
          try {
            const resp = await fetch(`https://sandbox.wompi.co/v1/transactions/${transactionId}`);
            const json = await resp.json();
            if (json?.data) {
              const methodType = json.data.payment_method_type;
              const status = json.data.status;

              if (methodType === "BANCOLOMBIA_COLLECT") {
                nuevoEstado = "PENDIENTE_EFECTIVO";
              } else if (status === "APPROVED") {
                nuevoEstado = "CONFIRMADA";
              } else {
                nuevoEstado = "PENDIENTE_VALIDACION";
              }
            }
          } catch (error) {
            console.error("[FormDatosPersonales] Error consultando transaccion de Wompi:", error);
          }
        }

        await reservaPersistService.actualizarEstado(
          referenciaActual,
          nuevoEstado,
          transactionId
        );

        limpiarReserva();

        if (nuevoEstado === "PENDIENTE_EFECTIVO") {
          router.replace("/(tabs)/my-bookings");
        } else {
          router.replace(`/payment-response?ref=${encodeURIComponent(referenciaActual)}`);
        }
      } else {
        // El usuario canceló el checkout o Wompi no completó la redirección.
        // Borramos la reserva de la base de datos para no dejar reservas fantasma.
        // Los datos del formulario se mantienen en memoria para que pueda reintentar.
        await reservaPersistService.eliminarReserva(referenciaActual);
        setAlertaErrorPagoVisible(true);
      }
    } catch (error) {
      console.error("[FormDatosPersonales] Error en el pago con Wompi", error);
      if (referenciaActual) {
        await reservaPersistService.eliminarReserva(referenciaActual);
      }
      setAlertaErrorPagoVisible(true);
    } finally {
      setProcesandoPago(false);
    }
  };

  if (mostrarContrato && referenciaActual) {
    return (
      <FirmaContrato
        vehiculo={vehiculo}
        datosPersonales={datosPersonales}
        datosDocumentos={documentos}
        fechasLugar={fechasLugar}
        planes={planes}
        total={total}
        referencia={referenciaActual}
        onFirmado={handleContratoFirmado}
      />
    );
  }

  return (
    <View>
      {/* Tarjeta Padre Contenedora */}
      <View style={[styles.cardPadre, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        {/* Tarjeta de Formulario de Datos Personales */}
        <View style={[styles.cardForm, { backgroundColor: c.oscuro ? c.bgCard : "#FFFFFF", borderColor: c.border }]}>
          <View style={styles.cardHeaderFila}>
            <Ionicons name="person" size={14} color={primaryAccent} />
            <Text style={[styles.cardHeaderTitulo, { color: primaryAccent }]}>
              {t("reserva.datosPersonales.titulo", { defaultValue: "Datos personales" })}
            </Text>
          </View>

          <Text style={[styles.cardSubtitulo, { color: c.textMuted }]}>
            {t("reserva.datosPersonales.subtitulo", {
              defaultValue: "Completa tus datos de contacto para la reserva y el contrato digital",
            })}
          </Text>

          <View style={styles.campo}>
            <Text style={[styles.inputLabel, { color: c.textPrimary }]}>
              {t("reserva.datosPersonales.nombreCompleto", { defaultValue: "Nombre completo *" })}
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF", borderColor: c.border, color: c.textPrimary },
              ]}
              value={datosPersonales.nombreCompleto}
              onChangeText={(v) => {
                actualizarDatosPersonales({ nombreCompleto: v });
                const { nombres, apellidos } = separarNombreCompleto(v);
                actualizarUsuarioGlobal({ nombres, apellidos });
              }}
              placeholder="Cliente Drivique"
              placeholderTextColor={c.textMuted}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.campo}>
            <CampoSelectorLista
              etiqueta={t("reserva.datosPersonales.nacionalidad", { defaultValue: "Nacionalidad *" })}
              valorSeleccionado={datosPersonales.nacionalidad || null}
              opciones={OPCIONES_NACIONALIDAD}
              onSeleccionar={(id) => {
                actualizarDatosPersonales({ nacionalidad: id });
                actualizarUsuarioGlobal({ nacionalidad: id });
              }}
            />
          </View>

          <View style={styles.campo}>
            <Text style={[styles.inputLabel, { color: c.textPrimary }]}>
              {t("reserva.datosPersonales.correoElectronico", { defaultValue: "Correo electrónico *" })}
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF", borderColor: c.border, color: c.textPrimary },
              ]}
              value={datosPersonales.correo}
              onChangeText={(v) => {
                actualizarDatosPersonales({ correo: v });
                actualizarUsuarioGlobal({ correo: v });
              }}
              placeholder="cliente@drivique.com"
              placeholderTextColor={c.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.campo}>
            <Text style={[styles.inputLabel, { color: c.textPrimary }]}>
              {t("reserva.datosPersonales.numeroCelular", { defaultValue: "Teléfono celular *" })}
            </Text>
            <View style={styles.filaCelular}>
              <View
                style={[
                  styles.prefijoBox,
                  { backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF", borderColor: c.border },
                  !hayPrefijo && { backgroundColor: c.oscuro ? "#1F2937" : "#F3F4F6" },
                ]}
              >
                <Text
                  style={[
                    styles.prefijoText,
                    { color: c.textPrimary },
                    !hayPrefijo && { color: c.textMuted },
                  ]}
                >
                  {hayPrefijo ? prefijoTelefono : "+57"}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  styles.inputCelular,
                  { backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF", borderColor: c.border, color: c.textPrimary },
                  !hayPrefijo && { backgroundColor: c.oscuro ? "#1F2937" : "#F3F4F6", color: c.textMuted },
                ]}
                value={datosPersonales.celular}
                onChangeText={(v) => {
                  const digits = v.replace(/\D/g, "");
                  actualizarDatosPersonales({ celular: digits });
                  actualizarUsuarioGlobal({ telefono: digits });
                }}
                keyboardType="phone-pad"
                placeholder="3001234567"
                placeholderTextColor={c.textMuted}
                editable={hayPrefijo}
              />
            </View>
          </View>

          <View style={styles.campo}>
            <CampoSelectorLista
              etiqueta={t("reserva.datosPersonales.tipoDeDocumento", { defaultValue: "Tipo de documento *" })}
              valorSeleccionado={datosPersonales.tipoDocumento}
              opciones={OPCIONES_TIPO_DOCUMENTO}
              onSeleccionar={(id) => {
                actualizarDatosPersonales({
                  tipoDocumento: id as typeof datosPersonales.tipoDocumento,
                });
                actualizarUsuarioGlobal({
                  tipoDocumento: id as TipoDocumento,
                });
              }}
            />
          </View>

          <View style={[styles.campo, { marginBottom: 0 }]}>
            <Text style={[styles.inputLabel, { color: c.textPrimary }]}>
              {t("reserva.datosPersonales.numeroDeDocumento", { defaultValue: "Número de documento *" })}
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: c.oscuro ? c.bgInput : "#FFFFFF", borderColor: c.border, color: c.textPrimary },
              ]}
              value={datosPersonales.numeroDocumento}
              onChangeText={(v) => {
                actualizarDatosPersonales({ numeroDocumento: v });
                actualizarUsuarioGlobal({ numeroDocumento: v });
              }}
              placeholder="123456789"
              placeholderTextColor={c.textMuted}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      {/* 2. Tarjeta Padre de Verificación Documental */}
      <View style={[styles.cardPadre, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <TarjetaVerificacionDocumental
          tipoDocumento={datosPersonales.tipoDocumento ?? undefined}
          docsVerificados={docsVerificados}
        />
      </View>

      {/* 3. Tarjeta Padre de Cupón y Políticas */}
      <View style={[styles.cardPadre, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <CouponSection vehiculo={vehiculo} />
        <TarjetaTerminosCondiciones />
      </View>

      <BarraTotalConfirmar total={total} onConfirmar={handleConfirmarReserva} />

      <ModalReservaRegistrada
        visible={modalReservaVisible}
        onPagarWompi={handlePagarWompi}
        onCerrar={handleCancelarModalReserva}
      />

      <BranchCashPaymentModal
        visible={modalInstruccionesEfectivoVisible}
        referencia={referenciaActual || ""}
        nombreSucursal={vehiculo.sucursal || ""}
        total={total}
        onIrAMisReservas={handleIrAMisReservas}
        onVolverAlInicio={handleVolverAlInicio}
      />

      <AlertModal
        visible={alertaFaltantesVisible}
        icono="alert-circle-outline"
        titulo={t("reserva.datosPersonales.alertaFaltantesTitulo")}
        mensaje={t("reserva.datosPersonales.alertaFaltantesMensaje")}
        botones={[]}
        onCerrar={() => setAlertaFaltantesVisible(false)}
      />

      <AlertModal
        visible={alertaEfectivoVisible}
        icono="checkmark-circle-outline"
        titulo={t("reserva.confirmacion.efectivoConfirmadaTitulo")}
        mensaje={t("reserva.confirmacion.efectivoConfirmadaMensaje", {
          horas: HORAS_LIMITE_PAGO_EFECTIVO,
        })}
        botones={[
          {
            texto: t("reserva.confirmacion.entendidoIrAMisReservas"),
            variante: "primario",
            onPress: () => {
              setAlertaEfectivoVisible(false);
              limpiarReserva();
              router.replace("/(tabs)/my-bookings");
            },
          },
        ]}
        onCerrar={() => setAlertaEfectivoVisible(false)}
      />

      <AlertModal
        visible={alertaErrorPagoVisible}
        icono="close-circle-outline"
        titulo={t("reserva.confirmacion.errorPagoTitulo")}
        mensaje={t("reserva.confirmacion.errorPagoMensaje")}
        botones={[]}
        onCerrar={() => setAlertaErrorPagoVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cardPadre: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardForm: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  cardHeaderFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  cardHeaderTitulo: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  cardSubtitulo: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 14,
  },
  campo: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
  },
  filaCelular: {
    flexDirection: "row",
    gap: 8,
  },
  prefijoBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 48,
  },
  prefijoText: {
    fontSize: 12,
    fontWeight: "600",
  },
  inputCelular: {
    flex: 1,
  },
});
