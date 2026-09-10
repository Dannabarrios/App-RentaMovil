// modules/reserva/components/FirmaContrato.tsx
//
// Réplica del contrato de reserva y alquiler que existe en la web
// (src/modules/contracts/components/FirmaContrato.jsx): mismos datos, las
// mismas 6 cláusulas, el mismo código de contrato autogenerado y la misma
// firma táctil del usuario. La firma de la plataforma se muestra como un
// sello de texto en vez de una imagen (acá no existe el PNG de la firma).
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { GRADIENTES } from "@/constants/gradients";
import { Vehiculo } from "@/modules/catalog/types/catalog.types";
import {
  getCiudadPorSucursal,
  getDireccionSucursal,
} from "@/modules/catalog/constants/catalog.constants";
import {
  DatosDocumentos,
  DatosFechasLugar,
  DatosPersonales,
  DatosPlanes,
} from "../types/reservation.types";
import { fmt } from "./BookingSummaryModal.pieces";
import { contratoService, ContratoGuardado } from "../services/contractService";
import FirmaCanvas, { FirmaCanvasHandle } from "./SignatureCanvas";
import { crearTextosContrato, generarContratoPdf } from "../services/pdfService";

interface Punto {
  x: number;
  y: number;
}

const LOCALES_FECHA: Record<string, string> = {
  es: "es-CO",
  en: "en-US",
  fr: "fr-FR",
  pt: "pt-PT",
  br: "pt-BR",
};

/** "Toyota Corolla 2024" -> { marca: "Toyota", modelo: "Corolla 2024" } */
function separarMarcaModelo(nombre = "") {
  const partes = nombre.trim().split(" ");
  return { marca: partes[0] || "", modelo: partes.slice(1).join(" ") || "" };
}

interface Props {
  vehiculo: Vehiculo;
  datosPersonales: DatosPersonales;
  datosDocumentos: DatosDocumentos;
  fechasLugar: DatosFechasLugar;
  planes: DatosPlanes;
  total: number;
  referencia: string;
  onFirmado: (contrato: ContratoGuardado | null) => void;
  soloLectura?: boolean;
  contratoFirmado?: ContratoGuardado | null;
  onDescargar?: () => void;
  descargando?: boolean;
}

export default function FirmaContrato({
  vehiculo,
  datosPersonales,
  datosDocumentos,
  fechasLugar,
  planes,
  total,
  referencia,
  onFirmado,
  soloLectura = false,
  contratoFirmado = null,
  onDescargar,
  descargando = false,
}: Props) {
  const { t, i18n } = useTranslation();
  const c = useTemaColores();
  const firmaRef = React.useRef<FirmaCanvasHandle>(null);
  const [firmaVacia, setFirmaVacia] = useState(true);
  const [errorFirma, setErrorFirma] = useState("");
  const [firmando, setFirmando] = useState(false);
  const [codigoContrato, setCodigoContrato] = useState("");

  React.useEffect(() => {
    contratoService.obtenerOCrearCodigo(referencia).then(setCodigoContrato);
  }, [referencia]);

  const localeFecha = LOCALES_FECHA[i18n.language] || "es-CO";
  const { marca, modelo } = separarMarcaModelo(vehiculo?.nombre);

  const esDomicilioRetiro = fechasLugar.lugarRetiro === "domicilio";
  const esDomicilioDevolucion = fechasLugar.lugarDevolucion === "domicilio";

  const sucursalRetiroNombre = esDomicilioRetiro
    ? vehiculo?.sucursal ?? ""
    : fechasLugar.lugarRetiro;
  const ciudadSucursal = sucursalRetiroNombre
    ? getCiudadPorSucursal(sucursalRetiroNombre) ?? ""
    : "";
  const direccionSucursal = sucursalRetiroNombre
    ? getDireccionSucursal(sucursalRetiroNombre) ?? ""
    : "";

  const fechaGeneracion = new Date().toLocaleDateString(localeFecha, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const formatearFecha = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(localeFecha, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const direccionCompleta = esDomicilioRetiro
    ? [fechasLugar.direccionRetiro, fechasLugar.barrioRetiro, ciudadSucursal].filter(Boolean).join(", ") + (fechasLugar.referenciasRetiro ? ` (Ref: ${fechasLugar.referenciasRetiro})` : "")
    : esDomicilioDevolucion
    ? [fechasLugar.direccionDevolucion, fechasLugar.barrioDevolucion, ciudadSucursal].filter(Boolean).join(", ") + (fechasLugar.referenciasDevolucion ? ` (Ref: ${fechasLugar.referenciasDevolucion})` : "")
    : "No aplica (Entrega en sucursal)";

  const licenciaTexto =
    datosDocumentos?.licenciaConduccion?.nombre ||
    "Licencia verificada en perfil";

  const serviciosTexto = useMemo(() => {
    const nombres = (vehiculo?.servicios || [])
      .filter((s) => planes.serviciosSeleccionados.includes(s.nombre))
      .map((s) => t(`reserva.planes.nombreServicio.${s.nombre}`, { defaultValue: s.nombre }));
    return nombres.length ? nombres.join(", ") : t("reserva.contrato.noneAdded");
  }, [vehiculo, planes.serviciosSeleccionados, t]);

  const metodoPagoTexto =
    fechasLugar.metodoPago === "efectivo"
      ? t("reserva.contrato.paymentMethodCash")
      : t("reserva.contrato.paymentMethodWompi");

  const proteccionTexto = planes.proteccion
    ? t(`reserva.planes.nombreSeguro.${planes.proteccion}`, { defaultValue: planes.proteccion })
    : "—";

  const tipoDocumentoTexto = datosPersonales.tipoDocumento
    ? t(
        `reserva.datosPersonales.tiposDocumento.${datosPersonales.tipoDocumento === "Doc. Extranjero" ? "DocExtranjero" : datosPersonales.tipoDocumento}`,
        { defaultValue: datosPersonales.tipoDocumento }
      )
    : "";

  const handleFirmar = async () => {
    if (firmaRef.current?.estaVacio()) {
      setErrorFirma(t("reserva.contrato.signatureRequired") || "La firma es obligatoria.");
      return;
    }
    setErrorFirma("");
    setFirmando(true);

    try {
      const firmaTrazos = firmaRef.current?.obtenerFirmaData() || "[]";
      const contrato = await contratoService.guardarFirma(referencia, {
        codigo: codigoContrato,
        firmaTrazos: firmaTrazos,
        archivoOriginalUri: "firma_tactil.json",
        archivoOriginalNombre: "firma_tactil.json",
        archivoOriginalBase64: "",
        ciudad: ciudadSucursal,
        fecha: new Date().toISOString(),
      });
      if (!contrato) throw new Error("No fue posible guardar el contrato firmado");

      const pdfResultado = await generarContratoPdf({
        contrato,
        vehiculo,
        datosPersonales,
        datosDocumentos,
        fechasLugar,
        planes,
        total,
        referencia,
        formatPrecio: fmt,
        formatearFecha,
        tipoDocumentoTexto,
        textos: crearTextosContrato((key) => t(key)),
      });

      let contratoCompleto = contrato;
      if (pdfResultado?.base64) {
        const guardado = await contratoService.guardarPdfContrato(
          referencia,
          pdfResultado.base64,
          `contrato-${referencia}.pdf`
        );
        if (guardado) contratoCompleto = guardado;
      }
      onFirmado?.(contratoCompleto);
    } catch (error) {
      console.error("[FirmaContrato] Error al guardar la firma", error);
      Alert.alert(
        t("reserva.contrato.errorFirmaTitulo", { defaultValue: "Error al firmar" }),
        t("reserva.contrato.errorFirmaMensaje", { defaultValue: "No fue posible guardar el contrato firmado. Por favor inténtalo de nuevo." })
      );
    } finally {
      setFirmando(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <View
        nativeID={soloLectura ? "contrato-legal-visible" : undefined}
        style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
      >
        <LinearGradient
          colors={["#1e3a8a", "#2563eb", "#93c5fd"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.franjaSuperior}
        />

        <View style={styles.encabezado}>
          <View style={styles.encabezadoFila}>
            <View style={[styles.logoWrap, { borderColor: c.border, backgroundColor: c.bgCard }]}>
              <Image source={require("@/assets/images/logo.png")} style={styles.logo} />
            </View>
            <View style={styles.encabezadoTextos}>
              <Text style={[styles.tituloContrato, { color: c.textPrimary }]}>
                {t("reserva.contrato.title")}
              </Text>
              <Text style={[styles.subtituloContrato, { color: c.textSecondary }]}>
                {t("reserva.contrato.subtitle")}
              </Text>
              <Text style={[styles.subtituloContrato, { color: c.textSecondary }]}>
                {t("reserva.contrato.autoGenNote")}
              </Text>
            </View>
          </View>

          <View style={[styles.badgeCard, { backgroundColor: c.bgInput, borderColor: c.border }]}>
            <View style={styles.badgeLabel}>
              <Text style={styles.badgeLabelTexto}>{t("reserva.contrato.badgeLabel")}</Text>
            </View>
            <MetaLinea label={t("reserva.contrato.contractCode")} valor={codigoContrato} c={c} />
            <MetaLinea
              label={t("reserva.contrato.status")}
              valor={t(soloLectura ? "reserva.contrato.statusSigned" : "reserva.contrato.statusPending")}
              c={c}
            />
            <MetaLinea label={t("reserva.contrato.generationDate")} valor={fechaGeneracion} c={c} />
            <MetaLinea label={t("reserva.contrato.reservationCode")} valor={referencia} c={c} />
          </View>
        </View>

        <View style={styles.contenido}>
          <Text style={[styles.intro, { color: c.textPrimary }]}>
            {t("reserva.contrato.intro", {
              nombre: datosPersonales.nombreCompleto,
              tipoDoc: tipoDocumentoTexto,
              numDoc: datosPersonales.numeroDocumento,
            })}
          </Text>

          {/* Datos del usuario */}
          <Seccion titulo={t("reserva.contrato.userDataTitle")} c={c}>
            <View style={[styles.grid, { backgroundColor: c.bgInput, borderColor: c.border }]}>
              <Campo label={t("reserva.contrato.fullName")} valor={datosPersonales.nombreCompleto} c={c} />
              <Campo
                label={t("reserva.contrato.document")}
                valor={`${tipoDocumentoTexto} ${datosPersonales.numeroDocumento || ""}`.trim()}
                c={c}
              />
              <Campo label={t("reserva.contrato.email")} valor={datosPersonales.correo} c={c} />
              <Campo label={t("reserva.contrato.phone")} valor={datosPersonales.celular} c={c} />
              <Campo label={t("reserva.contrato.address")} valor={direccionCompleta} c={c} />
              <Campo
                label={t("reserva.contrato.license")}
                valor={licenciaTexto}
                c={c}
              />
            </View>
          </Seccion>

          {/* Datos de la reserva */}
          <Seccion titulo={t("reserva.contrato.reservationTitle")} c={c}>
            <View style={[styles.grid, { backgroundColor: c.bgInput, borderColor: c.border }]}>
              <Campo label={t("reserva.contrato.vehicle")} valor={`${marca} ${modelo}`.trim()} c={c} />
              <Campo label={t("reserva.contrato.plate")} valor={vehiculo?.placa} c={c} />
              <Campo label={t("reserva.contrato.color")} valor={vehiculo?.color} c={c} />
              <Campo label={t("reserva.contrato.year")} valor={vehiculo?.año ? String(vehiculo.año) : undefined} c={c} />
              <Campo
                label={t("reserva.contrato.branch")}
                valor={esDomicilioRetiro ? t("reserva.contrato.domicileDelivery") : fechasLugar.lugarRetiro}
                c={c}
              />
              <Campo
                label={t("reserva.contrato.branchCity")}
                valor={ciudadSucursal}
                c={c}
              />
              {!esDomicilioRetiro && (
                <Campo label={t("reserva.contrato.branchAddress")} valor={direccionSucursal} c={c} />
              )}
              <Campo label={t("reserva.contrato.startDate")} valor={formatearFecha(fechasLugar.fechaRetiro)} c={c} />
              <Campo label={t("reserva.contrato.endDate")} valor={formatearFecha(fechasLugar.fechaDevolucion)} c={c} />
              <Campo label={t("reserva.contrato.paymentMethod")} valor={metodoPagoTexto} c={c} />
              <Campo label={t("reserva.contrato.totalValue")} valor={fmt(total)} c={c} />
              <Campo label={t("reserva.contrato.additionalServices")} valor={serviciosTexto} c={c} />
              <Campo label={t("reserva.contrato.protectionPlan")} valor={proteccionTexto} c={c} />
              {esDomicilioRetiro && (
                <>
                  <Campo label={t("reserva.contrato.deliveryAddress")} valor={fechasLugar.direccionRetiro} c={c} />
                  <Campo label={t("reserva.contrato.deliveryNeighborhood")} valor={fechasLugar.barrioRetiro} c={c} />
                  <Campo label={t("reserva.contrato.deliveryReferences")} valor={fechasLugar.referenciasRetiro} c={c} />
                </>
              )}
              {esDomicilioDevolucion && (
                <Campo label={t("reserva.contrato.returnAtDomicile")} valor={t("reserva.contrato.returnAtDomicileValue")} c={c} />
              )}
            </View>
          </Seccion>

          {/* Cláusulas */}
          <Seccion titulo={t("reserva.contrato.clausesTitle")} c={c}>
            <View style={[styles.clausulasCaja, { backgroundColor: c.bgInput, borderColor: c.border }]}>
              <Clausula c={c}>
                <Text style={styles.clausulaNegrita}>{t("reserva.contrato.clause1Title")} </Text>
                {t("reserva.contrato.clause1Text", {
                  marca,
                  modelo,
                  placa: vehiculo?.placa,
                  inicio: formatearFecha(fechasLugar.fechaRetiro),
                  fin: formatearFecha(fechasLugar.fechaDevolucion),
                })}
              </Clausula>
              <Clausula c={c}>
                <Text style={styles.clausulaNegrita}>{t("reserva.contrato.clause2Title")} </Text>
                {t("reserva.contrato.clause2Text")}
              </Clausula>
              <Text style={[styles.clausulaTexto, { color: c.textPrimary, marginBottom: 4 }]}>
                <Text style={styles.clausulaNegrita}>{t("reserva.contrato.clause3Title")}</Text>
              </Text>
              <View style={styles.listaClausulas}>
                <Text style={[styles.itemLista, { color: c.textPrimary }]}>• {t("reserva.contrato.clause3Item1")}</Text>
                <Text style={[styles.itemLista, { color: c.textPrimary }]}>• {t("reserva.contrato.clause3Item2")}</Text>
                <Text style={[styles.itemLista, { color: c.textPrimary }]}>• {t("reserva.contrato.clause3Item3")}</Text>
                <Text style={[styles.itemLista, { color: c.textPrimary }]}>• {t("reserva.contrato.clause3Item4")}</Text>
              </View>
              <Clausula c={c}>
                <Text style={styles.clausulaNegrita}>{t("reserva.contrato.clause4Title")} </Text>
                {t("reserva.contrato.clause4Text")}
              </Clausula>
              <Clausula c={c}>
                <Text style={styles.clausulaNegrita}>{t("reserva.contrato.clause5Title")} </Text>
                {t("reserva.contrato.clause5Text")}
              </Clausula>
              <Clausula c={c} ultima>
                <Text style={styles.clausulaNegrita}>{t("reserva.contrato.clause6Title")} </Text>
                {t("reserva.contrato.clause6Text")}
              </Clausula>
            </View>
          </Seccion>

          {/* Firmas */}
          <Seccion titulo={t("reserva.contrato.signaturesTitle")} c={c}>
            <View style={styles.filaDosColumnas}>
              <Campo label={t("reserva.contrato.signCity")} valor={ciudadSucursal} c={c} ancho="48%" />
              <Campo label={t("reserva.contrato.signDate")} valor={fechaGeneracion} c={c} ancho="48%" />
            </View>

            <View style={styles.firmasFila}>
              <View style={[styles.firmaTarjeta, { backgroundColor: c.bgInput, borderColor: c.border }]}>
                {soloLectura ? (
                  <View>
                    <Text style={[styles.firmaTitulo, { color: c.textPrimary }]}>
                      {t("reserva.contrato.userSignature")}
                    </Text>
                    <View style={[styles.firmaLienzoEstatico, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                      {(() => {
                        try {
                          const trazos: Punto[][] = contratoFirmado?.firmaTrazos ? JSON.parse(contratoFirmado.firmaTrazos) : [];
                          if (trazos.length === 0) throw new Error("Vacio");
                          return trazos.map((trazo, i) => (
                            <React.Fragment key={i}>
                              {trazo.map((p, j) => (
                                <React.Fragment key={j}>
                                  <View
                                    style={{
                                      position: "absolute",
                                      left: p.x - 1.25,
                                      top: p.y - 1.25,
                                      width: 2.5,
                                      height: 2.5,
                                      borderRadius: 1.25,
                                      backgroundColor: c.textPrimary,
                                    }}
                                  />
                                  {j > 0 && (() => {
                                    const p1 = trazo[j - 1];
                                    const p2 = p;
                                    const dx = p2.x - p1.x;
                                    const dy = p2.y - p1.y;
                                    const largo = Math.sqrt(dx * dx + dy * dy) + 2.5;
                                    const angulo = (Math.atan2(dy, dx) * 180) / Math.PI;
                                    const midX = (p1.x + p2.x) / 2;
                                    const midY = (p1.y + p2.y) / 2;

                                    return (
                                      <View
                                        style={{
                                          position: "absolute",
                                          left: midX - largo / 2,
                                          top: midY - 1.25,
                                          width: largo,
                                          height: 2.5,
                                          borderRadius: 1.25,
                                          backgroundColor: c.textPrimary,
                                          transform: [{ rotate: `${angulo}deg` }],
                                        }}
                                      />
                                    );
                                  })()}
                                </React.Fragment>
                              ))}
                            </React.Fragment>
                          ));
                        } catch {
                          return (
                            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 6 }}>
                              <Ionicons name="document-attach-outline" size={30} color={c.textSecondary} />
                              <Text style={[styles.firmaDato, { color: c.textSecondary, fontSize: 11 }]}>
                                {t("reserva.contrato.digitallySigned")}
                              </Text>
                            </View>
                          );
                        }
                      })()}
                    </View>
                  </View>
                ) : (
                  <View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <Text style={[styles.firmaTitulo, { color: c.textPrimary, marginBottom: 0 }]}>
                        {t("reserva.contrato.userSignature")}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          firmaRef.current?.limpiar();
                          setErrorFirma("");
                        }}
                        style={styles.limpiarBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.limpiarBtnTexto, { color: c.primary }]}>
                          {t("reserva.contrato.clearSignature", { defaultValue: "Limpiar" })}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <FirmaCanvas ref={firmaRef} onCambiar={(vacia) => {
                      setFirmaVacia(vacia);
                      if (!vacia) setErrorFirma("");
                    }} />

                    {errorFirma ? (
                      <Text style={[styles.errorFirma, { color: c.error }]}>{errorFirma}</Text>
                    ) : (
                      <Text style={[styles.firmaAyuda, { color: c.textSecondary }]}>
                        {t("reserva.contrato.drawSignatureHelp", { defaultValue: "Dibuje su firma con el dedo en el recuadro." })}
                      </Text>
                    )}
                  </View>
                )}
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.firmaDato, { color: c.textPrimary }]}>
                    <Text style={styles.clausulaNegrita}>{t("reserva.contrato.fullName")}:</Text>{" "}
                    {datosPersonales.nombreCompleto}
                  </Text>
                  <Text style={[styles.firmaDato, { color: c.textPrimary }]}>
                    <Text style={styles.clausulaNegrita}>{t("reserva.contrato.document")}:</Text>{" "}
                    {`${tipoDocumentoTexto} ${datosPersonales.numeroDocumento || ""}`.trim()}
                  </Text>
                </View>
              </View>

              <View style={[styles.firmaTarjeta, { backgroundColor: c.bgInput, borderColor: c.border }]}>
                <Text style={[styles.firmaTitulo, { color: c.textPrimary }]}>
                  {t("reserva.contrato.platformSignature")}
                </Text>
                <View style={[styles.selloPlataforma, { backgroundColor: c.bgCard }]}>
                  <Text style={styles.selloTexto}>Drivique</Text>
                  <View style={styles.selloBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#1e3a8a" />
                    <Text style={styles.selloBadgeTexto}>{t("reserva.contrato.digitallySigned")}</Text>
                  </View>
                </View>
                <Text style={[styles.firmaDato, { color: c.textPrimary }]}>
                  <Text style={styles.clausulaNegrita}>{t("reserva.contrato.responsible")}:</Text>{" "}
                  {t("reserva.contrato.platformResponsible")}
                </Text>
                <Text style={[styles.firmaDato, { color: c.textPrimary }]}>
                  <Text style={styles.clausulaNegrita}>{t("reserva.contrato.role")}:</Text>{" "}
                  {t("reserva.contrato.platformRole")}
                </Text>
              </View>
            </View>
          </Seccion>

          {!soloLectura && (
            <View nativeID="contrato-acciones-descarga">
              <TouchableOpacity
                style={styles.firmarBtnWrap}
                onPress={handleFirmar}
                disabled={firmando}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={firmando ? ["#94a3b8", "#94a3b8"] : GRADIENTES.boton.colors}
                  start={GRADIENTES.boton.start}
                  end={GRADIENTES.boton.end}
                  style={styles.firmarBtn}
                >
                  <Ionicons
                    name={firmando ? "hourglass-outline" : "create-outline"}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.firmarBtnTexto}>
                    {firmando ? t("reserva.contrato.signing") : t("reserva.contrato.signAndContinue")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.footer, { borderTopColor: c.border }]}>
            <Text style={[styles.footerTexto, { color: c.textMuted }]}>{t("reserva.contrato.footerNote1")}</Text>
            <Text style={[styles.footerTexto, { color: c.textMuted }]}>{t("reserva.contrato.footerNote2")}</Text>
            <Text style={[styles.footerTexto, { color: c.textMuted, marginTop: 8 }]}>
              <Text style={styles.clausulaNegrita}>{t("reserva.contrato.contractCode")}:</Text> {codigoContrato}
            </Text>
            <Text style={[styles.footerTexto, { color: c.textMuted }]}>
              <Text style={styles.clausulaNegrita}>{t("reserva.contrato.reservationCode")}:</Text> {referencia}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function MetaLinea({ label, valor, c }: { label: string; valor: string; c: ReturnType<typeof useTemaColores> }) {
  return (
    <Text style={[styles.metaLinea, { color: c.textPrimary }]}>
      <Text style={styles.clausulaNegrita}>{label}:</Text> {valor}
    </Text>
  );
}

function Seccion({
  titulo,
  c,
  children,
}: {
  titulo: string;
  c: ReturnType<typeof useTemaColores>;
  children: React.ReactNode;
}) {
  return (
    <View
      style={styles.seccion}
      {...(Platform.OS === "web" ? ({ "data-pdf-section": "true" } as object) : {})}
    >
      <Text style={[styles.seccionTitulo, { color: c.textPrimary }]}>{titulo}</Text>
      {children}
    </View>
  );
}

function Campo({
  label,
  valor,
  c,
  ancho,
}: {
  label: string;
  valor?: string | null;
  c: ReturnType<typeof useTemaColores>;
  ancho?: string;
}) {
  return (
    <View style={[styles.campo, { backgroundColor: c.bgCard, borderColor: c.border }, ancho ? { width: ancho as any } : null]}>
      <Text style={[styles.campoLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.campoValor, { color: c.textPrimary }]} numberOfLines={3}>
        {valor || "—"}
      </Text>
    </View>
  );
}

function Clausula({
  c,
  children,
  ultima,
}: {
  c: ReturnType<typeof useTemaColores>;
  children: React.ReactNode;
  ultima?: boolean;
}) {
  return (
    <Text style={[styles.clausulaTexto, { color: c.textPrimary }, !ultima && { marginBottom: 12 }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 8, paddingVertical: 16, paddingBottom: 40, width: "100%", maxWidth: 1040, alignSelf: "center" },
  card: { width: "100%", borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  franjaSuperior: { height: 6 },
  encabezado: { padding: 16, gap: 16 },
  encabezadoFila: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: { width: 40, height: 40, resizeMode: "contain" },
  encabezadoTextos: { flex: 1 },
  tituloContrato: { fontSize: 19, fontWeight: "800", marginBottom: 4 },
  subtituloContrato: { fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  badgeCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  badgeLabel: {
    alignSelf: "flex-start",
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  badgeLabelTexto: { color: "#1e3a8a", fontSize: 10.5, fontWeight: "800", textTransform: "uppercase" },
  metaLinea: { fontSize: 12.5, marginVertical: 3, lineHeight: 18 },
  contenido: { paddingHorizontal: 14, paddingBottom: 24 },
  intro: { fontSize: 13.5, lineHeight: 21, marginBottom: 8 },
  seccion: { marginTop: 22 },
  seccionTitulo: { fontSize: 15.5, fontWeight: "800", marginBottom: 12 },
  grid: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  campo: {
    flex: 1,
    minWidth: 160,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 60,
  },
  campoLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: "800", marginBottom: 6 },
  campoValor: { fontSize: 13, fontWeight: "700" },
  clausulasCaja: { borderRadius: 16, borderWidth: 1, padding: 16 },
  clausulaTexto: { fontSize: 12.8, lineHeight: 19 },
  clausulaNegrita: { fontWeight: "800" },
  listaClausulas: { marginBottom: 12, gap: 6 },
  itemLista: { fontSize: 12.8, lineHeight: 18 },
  filaDosColumnas: { flexDirection: "row", gap: 10, marginBottom: 14 },
  firmasFila: { gap: 14 },
  firmaTarjeta: { borderRadius: 18, borderWidth: 1, padding: 16 },
  firmaTitulo: { fontSize: 14, fontWeight: "800", marginBottom: 12 },
  limpiarBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  limpiarBtnTexto: { fontSize: 11.5, fontWeight: "700", textDecorationLine: "underline" },
  errorFirma: { color: "#ef4444", fontSize: 11.5, fontWeight: "700", marginTop: 6 },
  firmaLienzoEstatico: {
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#93c5fd",
    borderStyle: "dashed",
    overflow: "hidden",
    position: "relative",
    marginBottom: 12,
  },
  firmaAyuda: {
    fontSize: 10.5,
    fontStyle: "italic",
    marginTop: 6,
  },
  firmaDato: { fontSize: 12.5, marginVertical: 2 },
  selloPlataforma: {
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#93c5fd",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  selloTexto: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1e3a8a",
    fontStyle: "italic",
  },
  selloBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  selloBadgeTexto: { fontSize: 11.5, fontWeight: "800", color: "#1e3a8a" },
  firmarBtnWrap: { marginTop: 26, borderRadius: 16 },
  firmarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  firmarBtnTexto: { color: "#fff", fontSize: 14.5, fontWeight: "800" },
  footer: { marginTop: 22, paddingTop: 14, borderTopWidth: 1 },
  footerTexto: { fontSize: 11, lineHeight: 16 },
});
