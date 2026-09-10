// modules/reserva/services/pdfService.ts
//
// Genera el PDF del contrato firmado a partir de los mismos datos que se
// muestran en FirmaContrato, usando expo-print (HTML -> PDF) porque React
// Native no tiene un renderer de PDF nativo. La firma dibujada se
// reconstruye como trazos SVG a partir de los puntos guardados por
// FirmaCanvas.
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { Vehiculo } from "@/modules/catalog/types/catalog.types";
import {
  DatosDocumentos,
  DatosFechasLugar,
  DatosPersonales,
  DatosPlanes,
} from "../types/reservation.types";
import { ContratoGuardado } from "./contractService";
import {
  getCiudadPorSucursal,
  getDireccionSucursal,
} from "@/modules/catalog/constants/catalog.constants";

interface Punto {
  x: number;
  y: number;
}

function trazosASvgPaths(firmaTrazosJson: string): string {
  try {
    const trazos: Punto[][] = JSON.parse(firmaTrazosJson);
    return trazos
      .filter((t) => t.length > 0)
      .map((trazo) => {
        const d = trazo
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(" ");
        return `<path d="${d}" stroke="#111827" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />`;
      })
      .join("");
  } catch {
    return "";
  }
}

function separarMarcaModelo(nombre = "") {
  const partes = nombre.trim().split(" ");
  return { marca: partes[0] || "", modelo: partes.slice(1).join(" ") || "" };
}

function esc(v: unknown): string {
  return String(v ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface GenerarPdfParams {
  contrato: ContratoGuardado;
  vehiculo: Vehiculo;
  datosPersonales: DatosPersonales;
  datosDocumentos: DatosDocumentos;
  fechasLugar: DatosFechasLugar;
  planes: DatosPlanes;
  total: number;
  referencia: string;
  formatPrecio: (n: number) => string;
  formatearFecha: (iso: string | null) => string;
  /** Etiqueta ya traducida del tipo de documento (Cédula/Tarjeta de identidad/etc.), no el código crudo. */
  tipoDocumentoTexto: string;
  /** Textos ya traducidos (t("reserva.contrato.xxx")) para no depender de i18next dentro del HTML. */
  textos: Record<string, string>;
  /** Si es true genera base64 (más lento); por defecto false para descarga nativa ultrarrápida. */
  conBase64?: boolean;
}

export interface ResultadoPdf {
  uri: string;
  base64: string;
}

export async function generarContratoPdf(params: GenerarPdfParams): Promise<ResultadoPdf> {
  const {
    contrato,
    vehiculo = {} as Vehiculo,
    datosPersonales = {} as DatosPersonales,
    datosDocumentos = {} as DatosDocumentos,
    fechasLugar = {} as DatosFechasLugar,
    planes = {} as DatosPlanes,
    total = 0,
    referencia = "",
    formatPrecio = (n: number) => `$${n}`,
    formatearFecha = (iso: string | null) => (iso ? String(iso) : "—"),
    tipoDocumentoTexto = "",
    textos: tx = {},
    conBase64 = false,
  } = params;

  const { marca, modelo } = separarMarcaModelo(vehiculo?.nombre || "");
  const esDomicilioRetiro = fechasLugar?.lugarRetiro === "domicilio";
  const esDomicilioDevolucion = fechasLugar?.lugarDevolucion === "domicilio";
  const sucursalRetiroNombre = esDomicilioRetiro ? vehiculo?.sucursal ?? "" : fechasLugar?.lugarRetiro ?? "";
  const ciudadSucursal = sucursalRetiroNombre ? getCiudadPorSucursal(sucursalRetiroNombre) ?? "" : "";
  const direccionSucursal = sucursalRetiroNombre ? getDireccionSucursal(sucursalRetiroNombre) ?? "" : "";

  const direccionCompleta = esDomicilioRetiro
    ? [fechasLugar?.direccionRetiro, fechasLugar?.barrioRetiro, ciudadSucursal].filter(Boolean).join(", ") + (fechasLugar?.referenciasRetiro ? ` (Ref: ${fechasLugar.referenciasRetiro})` : "")
    : esDomicilioDevolucion
    ? [fechasLugar?.direccionDevolucion, fechasLugar?.barrioDevolucion, ciudadSucursal].filter(Boolean).join(", ") + (fechasLugar?.referenciasDevolucion ? ` (Ref: ${fechasLugar.referenciasDevolucion})` : "")
    : "No aplica (Entrega en sucursal)";

  const nombreLicencia =
    datosDocumentos?.licenciaConduccion?.nombre ||
    "Licencia verificada en perfil";

  const svgFirma = trazosASvgPaths(contrato?.firmaTrazos || "");

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111827; padding: 28px; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .sub { font-size: 11px; color: #6b7280; margin: 2px 0; }
        .franja { height: 5px; background: linear-gradient(90deg,#1e3a8a,#2563eb,#93c5fd); border-radius: 4px; margin-bottom: 16px; }
        .badge { display:inline-block; background:#dbeafe; color:#1e3a8a; font-size:10px; font-weight:700; padding:4px 10px; border-radius:999px; text-transform:uppercase; margin-bottom:8px; }
        .meta { font-size: 11.5px; margin: 3px 0; }
        .meta b { font-weight: 700; }
        .intro { font-size: 12.5px; line-height: 1.6; margin: 16px 0; }
        h2 { font-size: 14px; margin: 22px 0 10px; break-after: avoid; page-break-after: avoid; }
        .grid { display: flex; flex-wrap: wrap; gap: 8px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:10px; }
        .campo { width: 47%; background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:9px 10px; }
        .campo-label { font-size: 9px; text-transform: uppercase; letter-spacing:.4px; font-weight:700; color:#6b7280; margin-bottom:4px; }
        .campo-valor { font-size: 12px; font-weight: 700; }
        .clausulas { background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:14px; font-size:11.8px; line-height:1.55; }
        .clausulas p { margin: 0 0 10px; }
        .clausulas ul { margin: 0 0 10px; padding-left: 18px; }
        .firmas { display:flex; gap:14px; margin-top: 14px; }
        .firma-card { flex:1; background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:14px; }
        .firma-titulo { font-size:12.5px; font-weight:700; margin-bottom:10px; }
        .firma-caja { height:140px; border:1px dashed #cbd5e1; border-radius:10px; background:#fff; }
        .sello { height:140px; border:2px dashed #93c5fd; border-radius:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; }
        .sello-texto { font-size:26px; font-weight:800; font-style:italic; color:#1e3a8a; }
        .sello-badge { font-size:10.5px; font-weight:700; color:#1e3a8a; }
        .footer { margin-top: 20px; padding-top: 12px; border-top:1px solid #e5e7eb; font-size:10px; color:#6b7280; line-height:1.5; }
        .grid, .firmas, .firma-card, .footer { break-inside: avoid; page-break-inside: avoid; }
      </style>
    </head>
    <body>
      <div class="franja"></div>
      <h1>${esc(tx?.title || "Contrato de reserva y alquiler")}</h1>
      <div class="sub">${esc(tx?.subtitle || "Drivique")}</div>
      <div class="sub">${esc(tx?.autoGenNote || "Documento digital")}</div>

      <div class="badge">${esc(tx?.badgeLabel || "DOCUMENTO DIGITAL")}</div>
      <div class="meta"><b>${esc(tx?.contractCode || "Código contrato")}:</b> ${esc(contrato?.codigo || "CTR-000")}</div>
      <div class="meta"><b>${esc(tx?.status || "Estado")}:</b> ${esc(tx?.statusSigned || "Firmado digitalmente")}</div>
      <div class="meta"><b>${esc(tx?.generationDate || "Fecha")}:</b> ${esc(formatearFecha(contrato?.fecha ? String(contrato.fecha).slice(0, 10) : null))}</div>
      <div class="meta"><b>${esc(tx?.reservationCode || "Reserva")}:</b> ${esc(referencia)}</div>

      <div class="intro">
        ${esc(
          (tx?.intro || "Entre {{nombre}}, identificado con {{tipoDoc}} No. {{numDoc}}, y DRIVIQUE SAS...")
            .replace("{{nombre}}", String(datosPersonales?.nombreCompleto || "—"))
            .replace("{{tipoDoc}}", String(tipoDocumentoTexto || "—"))
            .replace("{{numDoc}}", String(datosPersonales?.numeroDocumento || "—"))
        )}
      </div>

      <h2>${esc(tx?.userDataTitle || "Datos del usuario")}</h2>
      <div class="grid">
        <div class="campo"><div class="campo-label">${esc(tx?.fullName || "Nombre")}</div><div class="campo-valor">${esc(datosPersonales?.nombreCompleto)}</div></div>
        <div class="campo"><div class="campo-label">${esc(tx?.document || "Documento")}</div><div class="campo-valor">${esc(tipoDocumentoTexto)} ${esc(datosPersonales?.numeroDocumento)}</div></div>
        <div class="campo"><div class="campo-label">${esc(tx?.email || "Correo")}</div><div class="campo-valor">${esc(datosPersonales?.correo)}</div></div>
        <div class="campo"><div class="campo-label">${esc(tx?.phone || "Teléfono")}</div><div class="campo-valor">${esc(datosPersonales?.celular)}</div></div>
        <div class="campo"><div class="campo-label">${esc(tx?.address || "Dirección")}</div><div class="campo-valor">${esc(direccionCompleta)}</div></div>
        <div class="campo"><div class="campo-label">${esc(tx?.license || "Licencia")}</div><div class="campo-valor">${esc(nombreLicencia)}</div></div>
      </div>

      <h2>${esc(tx?.reservationTitle || "Datos de la reserva")}</h2>
      <div class="grid">
        <div class="campo"><div class="campo-label">${esc(tx?.vehicle || "Vehículo")}</div><div class="campo-valor">${esc(marca)} ${esc(modelo)}</div></div>
        <div class="campo"><div class="campo-label">${esc(tx?.plate || "Placa")}</div><div class="campo-valor">${esc(vehiculo?.placa || "ABC-123")}</div></div>
        <div class="campo"><div class="campo-label">${esc(tx?.branch || "Sucursal")}</div><div class="campo-valor">${esc(esDomicilioRetiro ? (tx?.domicileDelivery || "A domicilio") : fechasLugar?.lugarRetiro)}</div></div>
        <div class="campo"><div class="campo-label">${esc(tx?.branchCity || "Ciudad")}</div><div class="campo-valor">${esc(ciudadSucursal || "Bogotá")}</div></div>
        ${!esDomicilioRetiro ? `<div class="campo"><div class="campo-label">${esc(tx?.branchAddress || "Dirección")}</div><div class="campo-valor">${esc(direccionSucursal || "Sucursal Principal")}</div></div>` : ""}
        <div class="campo"><div class="campo-label">${esc(tx?.startDate || "Fecha inicio")}</div><div class="campo-valor">${esc(formatearFecha(fechasLugar?.fechaRetiro || null))}</div></div>
        <div class="campo"><div class="campo-label">${esc(tx?.endDate || "Fecha fin")}</div><div class="campo-valor">${esc(formatearFecha(fechasLugar?.fechaDevolucion || null))}</div></div>
        <div class="campo"><div class="campo-label">${esc(tx?.totalValue || "Total")}</div><div class="campo-valor">${esc(formatPrecio(total))}</div></div>
        <div class="campo"><div class="campo-label">${esc(tx?.protectionPlan || "Protección")}</div><div class="campo-valor">${esc(planes?.proteccion || "Básica")}</div></div>
      </div>

      <h2>${esc(tx?.signaturesTitle || "Firmas del contrato")}</h2>
      <div class="firmas">
        <div class="firma-card">
          <div class="firma-titulo">${esc(tx?.userSignature || "Firma del usuario")}</div>
          <div class="firma-caja">
            <svg viewBox="0 0 400 160" width="100%" height="140">${svgFirma}</svg>
          </div>
          <div class="meta" style="margin-top:10px;"><b>${esc(tx?.fullName || "Nombre")}:</b> ${esc(datosPersonales?.nombreCompleto)}</div>
          <div class="meta"><b>${esc(tx?.document || "Documento")}:</b> ${esc(tipoDocumentoTexto)} ${esc(datosPersonales?.numeroDocumento)}</div>
        </div>
        <div class="firma-card">
          <div class="firma-titulo">${esc(tx?.platformSignature || "Firma de la plataforma")}</div>
          <div class="sello">
            <div class="sello-texto">Drivique</div>
            <div class="sello-badge">✓ ${esc(tx?.digitallySigned || "Firmado digitalmente")}</div>
          </div>
          <div class="meta" style="margin-top:10px;"><b>${esc(tx?.responsible || "Responsable")}:</b> ${esc(tx?.platformResponsible || "Drivique SAS")}</div>
          <div class="meta"><b>${esc(tx?.role || "Cargo")}:</b> ${esc(tx?.platformRole || "Operador de Plataforma")}</div>
        </div>
      </div>

      <div class="footer">
        <div>${esc(tx?.footerNote1 || "Documento electrónico")}</div>
        <div>${esc(tx?.footerNote2 || "Drivique SAS")}</div>
        <div style="margin-top:8px;"><b>${esc(tx?.contractCode || "Contrato")}:</b> ${esc(contrato?.codigo || "CTR-000")} &nbsp;·&nbsp; <b>${esc(tx?.reservationCode || "Reserva")}:</b> ${esc(referencia)}</div>
      </div>
    </body>
  </html>`;

  if (Platform.OS === "web") {
    try {
      const modulo = await import("html2pdf.js");
      const dataUri: string = await (modulo.default() as any)
        .set({
          margin: 8,
          filename: `contrato-${referencia}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"], avoid: [".grid", ".firmas", ".firma-card", ".footer"] },
        })
        .from(html)
        .outputPdf("datauristring");
      const base64 = typeof dataUri === "string" && dataUri.includes(",") ? dataUri.split(",", 2)[1] : String(dataUri);
      return { uri: dataUri, base64 };
    } catch (e) {
      console.warn("[pdfService] Error generando PDF en web:", e);
    }
  }

  let uriGenerado = "";
  let base64Generado = "";

  try {
    const resultado = await Print.printToFileAsync(conBase64 ? { html, base64: true } : { html });
    if (resultado?.uri) {
      uriGenerado = resultado.uri;
      base64Generado = resultado.base64 || "";
    }
  } catch (printErr) {
    console.warn("[pdfService] Fallback printToFileAsync:", printErr);
    try {
      const resultadoSimple = await Print.printToFileAsync({ html });
      if (resultadoSimple?.uri) {
        uriGenerado = resultadoSimple.uri;
      }
    } catch (e2) {
      console.error("[pdfService] Error crítico printToFileAsync:", e2);
    }
  }

  if (!uriGenerado) {
    throw new Error("No fue posible generar el archivo PDF.");
  }

  return { uri: uriGenerado, base64: base64Generado };
}

export async function compartirContratoPdf(uri: string, nombre = "contrato-firmado.pdf") {
  if (!uri) return uri;
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const enlace = document.createElement("a");
    enlace.href = uri;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    return uri;
  }
  const disponible = await Sharing.isAvailableAsync();
  if (disponible) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: nombre,
      UTI: "com.adobe.pdf",
    });
  }
  return uri;
}

const CLAVES_CONTRATO = [
  "title", "subtitle", "autoGenNote", "badgeLabel", "contractCode", "status", "statusSigned",
  "generationDate", "reservationCode", "intro", "userDataTitle", "fullName", "document", "email",
  "phone", "address", "license", "notProvided", "reservationTitle", "vehicle", "plate", "color", "year",
  "branch", "branchCity", "branchAddress", "startDate", "endDate", "paymentMethod", "totalValue",
  "additionalServices", "protectionPlan", "domicileDelivery", "deliveryAddress", "deliveryNeighborhood",
  "deliveryReferences", "returnAtDomicile", "returnAtDomicileValue", "clausesTitle", "clause1Title",
  "clause1Text", "clause2Title", "clause2Text", "clause3Title", "clause3Item1", "clause3Item2",
  "clause3Item3", "clause3Item4", "clause4Title", "clause4Text", "clause5Title", "clause5Text",
  "clause6Title", "clause6Text", "signaturesTitle", "signCity", "signDate", "userSignature",
  "platformSignature", "digitallySigned", "responsible", "role", "platformResponsible", "platformRole",
  "footerNote1", "footerNote2", "paymentMethodCash", "paymentMethodWompi", "noneAdded",
] as const;

export function crearTextosContrato(t: (key: string, opts?: any) => string): Record<string, string> {
  return CLAVES_CONTRATO.reduce<Record<string, string>>((textos, clave) => {
    textos[clave] = t(`reserva.contrato.${clave}`, { defaultValue: clave }) || clave;
    return textos;
  }, {});
}

export async function leerPdfOriginalBase64(uri: string): Promise<string> {
  if (uri.startsWith("data:")) return uri.split(",", 2)[1] || "";
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result).split(",", 2)[1] || "");
      lector.onerror = () => reject(lector.error);
      lector.readAsDataURL(blob);
    });
  }
  return "";
}

export async function compartirPdfOriginal(base64: string, nombre = "contrato-firmado.pdf", uriDirecto?: string) {
  if (Platform.OS === "web") return compartirContratoPdf(`data:application/pdf;base64,${base64}`, nombre);
  if (uriDirecto) return compartirContratoPdf(uriDirecto, nombre);
  return compartirContratoPdf(`data:application/pdf;base64,${base64}`, nombre);
}

/** Exporta el contrato completo que se visualiza; nunca usa la plantilla resumen. */
export async function descargarContratoVisible(nombre: string) {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    throw new Error("Disponible únicamente en web");
  }
  const contrato = document.getElementById("contrato-legal-visible");
  if (!contrato) throw new Error("No se encontró el contrato completo visible");
  const modulo = await import("html2pdf.js");
  await (modulo.default() as any)
    .set({
      margin: 8,
      filename: nombre,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        ignoreElements: (element: Element) => element.id === "contrato-acciones-descarga",
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: {
        mode: ["css", "legacy"],
        avoid: ['[data-pdf-section="true"]'],
      },
    })
    .from(contrato)
    .save();
}
