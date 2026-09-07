// modules/reserva/components/TarjetaVerificacionDocumental.tsx
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import { COLOR_MARCA, TAMANO_MAXIMO_ARCHIVO_BYTES } from "../constants/reservation.constants";
import { useReservaStore } from "@/store/reservationStore";
import CampoSubidaDocumento from "./DocumentUploadField";

interface Props {
  /** Tipo de documento elegido en el formulario de datos personales (CC, TI, Doc. Extranjero, Pasaporte). */
  tipoDocumento?: string;
  /** true si el usuario ya tiene documentos verificados de una reserva anterior. */
  docsVerificados?: boolean;
}

export default function TarjetaVerificacionDocumental({ tipoDocumento, docsVerificados = false }: Props) {
  const documentos = useReservaStore((s) => s.documentos);
  const actualizarDocumento = useReservaStore((s) => s.actualizarDocumento);
  const c = useTemaColores();
  const { t } = useTranslation();

  const nombreDocumento = tipoDocumento
    ? t(
        `reserva.datosPersonales.tiposDocumento.${tipoDocumento === "Doc. Extranjero" ? "DocExtranjero" : tipoDocumento}`,
        { defaultValue: tipoDocumento }
      )
    : t("reserva.documentos.documentoGenerico", { defaultValue: "Documento de Identidad" });

  const etiquetaDocumentoId = nombreDocumento;

  const ayudaDocumento = React.useMemo(() => {
    if (tipoDocumento === "Pasaporte") {
      return t("reserva.documentos.pasaporteAyuda", {
        defaultValue: "Sube tu pasaporte vigente en formato PDF (página de datos y foto, máx 5MB)",
      });
    }
    return t("reserva.documentos.documentoGenericoAyuda", {
      doc: nombreDocumento,
      defaultValue: `Sube tu ${nombreDocumento.toLowerCase()} en un solo archivo PDF (ambos lados incluidos si aplica, máx 5MB)`,
    });
  }, [tipoDocumento, nombreDocumento, t]);

  const [errorCedula, setErrorCedula] = useState("");
  const [errorLicencia, setErrorLicencia] = useState("");
  const [cargandoCedula, setCargandoCedula] = useState(false);
  const [cargandoLicencia, setCargandoLicencia] = useState(false);

  const primaryAccent = c.oscuro ? "#60A5FA" : COLOR_MARCA;

  const seleccionarArchivo = async (
    llave: "cedulaFrente" | "licenciaConduccion",
    setCargando: (v: boolean) => void,
    setError: (v: string) => void
  ) => {
    setError("");
    const resultado = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (resultado.canceled) return;

    const archivo = resultado.assets[0];
    if (archivo.size && archivo.size > TAMANO_MAXIMO_ARCHIVO_BYTES) {
      setError(t("reserva.documentos.archivoDemasiadoGrande"));
      return;
    }

    setCargando(true);
    // Simula el tiempo de "subida" — cuando exista backend real, aquí va el upload.
    setTimeout(() => {
      actualizarDocumento(llave, {
        uri: archivo.uri,
        nombre: archivo.name,
        tamanoBytes: archivo.size ?? 0,
        tipoMime: archivo.mimeType ?? "application/pdf",
      });
      setCargando(false);
    }, 800);
  };

  return (
    <View style={[styles.cardForm, { backgroundColor: c.oscuro ? c.bgCard : "#FFFFFF", borderColor: c.border }]}>
      <View style={styles.cardHeaderFila}>
        <Ionicons name="card" size={14} color={primaryAccent} />
        <Text style={[styles.cardHeaderTitulo, { color: primaryAccent }]}>
          {docsVerificados ? t("reserva.documentos.seccionLabelVerificados") : t("reserva.documentos.seccionLabel")}
        </Text>
      </View>

      <Text style={[styles.cardSubtitulo, { color: c.textMuted }]}>
        {docsVerificados
          ? t("reserva.documentos.subtituloVerificados", {
              defaultValue:
                "Ya verificamos tus documentos en una reserva anterior. Si quieres, puedes reemplazarlos subiendo nuevos archivos PDF.",
            })
          : t("reserva.documentos.subtitulo", {
              defaultValue:
                "Sube los documentos requeridos para verificar tu identidad y habilitar la reserva del vehículo.",
            })}
      </Text>

      {docsVerificados && (
        <View
          style={[
            styles.avisoVerificado,
            {
              backgroundColor: c.oscuro ? "#17255433" : "#EFF6FF",
              borderColor: c.oscuro ? "#1D4ED8" : "#BFDBFE",
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={16} color={primaryAccent} style={styles.notaIcono} />
          <Text style={[styles.avisoVerificadoTexto, { color: primaryAccent }]}>
            <Text style={{ fontWeight: "700" }}>Documentos ya registrados: </Text>
            {t("reserva.documentos.yaVerificadosAvisoCuerpo", {
              defaultValue:
                "Ya has subido tu cédula y licencia de conducción anteriormente. No es obligatorio volver a cargarlos, pero si lo deseas puedes reemplazarlos subiendo nuevos archivos PDF.",
            })}
          </Text>
        </View>
      )}

      {/* Cédula/documento arriba, licencia abajo — apiladas */}
      <View style={styles.columnaSubtarjetas}>
        <CampoSubidaDocumento
          etiqueta={etiquetaDocumentoId}
          ayuda={ayudaDocumento}
          archivo={documentos.cedulaFrente}
          cargando={cargandoCedula}
          error={errorCedula}
          requerido={!docsVerificados}
          onSeleccionar={() => seleccionarArchivo("cedulaFrente", setCargandoCedula, setErrorCedula)}
          onQuitar={() => actualizarDocumento("cedulaFrente", null)}
        />
        <CampoSubidaDocumento
          etiqueta={t("reserva.documentos.licenciaEtiqueta")}
          ayuda={t("reserva.documentos.licenciaAyuda")}
          archivo={documentos.licenciaConduccion}
          cargando={cargandoLicencia}
          error={errorLicencia}
          requerido={!docsVerificados}
          onSeleccionar={() => seleccionarArchivo("licenciaConduccion", setCargandoLicencia, setErrorLicencia)}
          onQuitar={() => actualizarDocumento("licenciaConduccion", null)}
        />
      </View>

      {/* Banner de nota explicativa */}
      <View
        style={[
          styles.nota,
          {
            backgroundColor: c.primaryBg,
            borderColor: c.oscuro ? "#334155" : "#BFDBFE",
          },
        ]}
      >
        <Ionicons name="radio-button-on" size={14} color={primaryAccent} style={styles.notaIcono} />
        <Text style={[styles.notaTexto, { color: primaryAccent }]}>
          {t("reserva.documentos.nota")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  cardSubtitulo: {
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 14,
  },
  columnaSubtarjetas: {
    gap: 12,
    marginBottom: 14,
  },
  avisoVerificado: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  avisoVerificadoTexto: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "600",
  },
  nota: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  notaIcono: {},
  notaTexto: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
  },
});