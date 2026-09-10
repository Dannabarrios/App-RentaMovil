// modules/reserva/services/contratoService.ts
//
// Servicio temporal para simular la generación y firma del contrato de
// reserva y alquiler — mismo patrón que reservaPersistService (AsyncStorage
// en vez de localStorage). Cuando exista backend, esto se reemplaza por
// llamadas reales a la API.
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "drivique_contratos";

export interface ContratoGuardado {
  codigo: string;
  referenciaReserva: string;
  /**
   * A diferencia de la web (que guarda un PNG en base64 desde <canvas>),
   * acá guardamos los trazos vectoriales de la firma como JSON — React
   * Native no tiene un <canvas> nativo con toDataURL(). El resultado es
   * el mismo (una firma hecha a mano y persistida junto al contrato),
   * solo cambia el formato de almacenamiento interno.
   */
  firmaTrazos: string;
  /** Archivo PDF original que el usuario adjuntó como contrato firmado. */
  archivoOriginalUri?: string;
  archivoOriginalNombre?: string;
  /** Contenido exacto del PDF adjuntado, persistido para futuras descargas. */
  archivoOriginalBase64?: string;
  /** PDF legal completo generado para esta reserva. Nunca es el PDF de la firma. */
  contratoPdfBase64?: string;
  contratoPdfNombre?: string;
  ciudad: string;
  fecha: string;
  estado: "FIRMADO";
  firmadoEn: string;
}

function generarCodigoContrato(): string {
  return (
    "CTR-" +
    Date.now() +
    "-" +
    Math.random().toString(36).substring(2, 7).toUpperCase()
  );
}

async function leerTodos(): Promise<Record<string, ContratoGuardado>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("[contratoService] Error leyendo contratos guardados", error);
    return {};
  }
}

async function guardarTodos(data: Record<string, ContratoGuardado>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const contratoService = {
  /**
   * Devuelve el contrato ya firmado para una reserva (por su referencia),
   * o null si esa reserva todavía no tiene contrato firmado.
   */
  obtenerPorReserva: async (
    referenciaReserva: string | null | undefined
  ): Promise<ContratoGuardado | null> => {
    if (!referenciaReserva) return null;
    const todos = await leerTodos();
    const clean = referenciaReserva.trim();
    const base = clean.includes("_") ? clean.split("_")[0] : clean;
    return todos[clean] || todos[base] || null;
  },

  /**
   * Crea (si no existe) el código de contrato para una reserva, sin
   * marcarlo todavía como firmado. Útil para mostrar el código en pantalla
   * antes de que el usuario firme.
   */
  obtenerOCrearCodigo: async (
    referenciaReserva: string | null | undefined
  ): Promise<string> => {
    if (!referenciaReserva) return generarCodigoContrato();
    const todos = await leerTodos();
    if (todos[referenciaReserva]?.codigo) return todos[referenciaReserva].codigo;
    return generarCodigoContrato();
  },

  /**
   * Guarda la firma del usuario y deja el contrato en estado FIRMADO,
   * asociado a la referencia de la reserva.
   */
  guardarFirma: async (
    referenciaReserva: string,
    datos: {
      codigo?: string;
      firmaTrazos: string;
      archivoOriginalUri?: string;
      archivoOriginalNombre?: string;
      archivoOriginalBase64?: string;
      ciudad?: string;
      fecha?: string;
    }
  ): Promise<ContratoGuardado | null> => {
    if (!referenciaReserva) return null;
    const todos = await leerTodos();

    const contrato: ContratoGuardado = {
      codigo: datos.codigo || generarCodigoContrato(),
      referenciaReserva,
      firmaTrazos: datos.firmaTrazos,
      archivoOriginalUri: datos.archivoOriginalUri,
      archivoOriginalNombre: datos.archivoOriginalNombre,
      archivoOriginalBase64: datos.archivoOriginalBase64,
      ciudad: datos.ciudad || "",
      fecha: datos.fecha || new Date().toISOString(),
      estado: "FIRMADO",
      firmadoEn: new Date().toISOString(),
    };

    todos[referenciaReserva] = contrato;
    await guardarTodos(todos);
    return contrato;
  },

  guardarPdfContrato: async (
    referenciaReserva: string,
    base64: string,
    nombre: string
  ): Promise<ContratoGuardado | null> => {
    const todos = await leerTodos();
    const contrato = todos[referenciaReserva];
    if (!contrato) return null;
    const actualizado = { ...contrato, contratoPdfBase64: base64, contratoPdfNombre: nombre };
    todos[referenciaReserva] = actualizado;
    await guardarTodos(todos);
    return actualizado;
  },
};
