// modules/reserva/services/documentosService.ts
//
// Servicio temporal para simular la persistencia de documentos (cédula/
// tarjeta de identidad/documento de extranjería/pasaporte, y licencia) ya
// verificados de un usuario, para no volver a pedirlos en reservas
// futuras — mismo patrón que documentosService.js en la web, con
// AsyncStorage en vez de localStorage.
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "drivique_documentos_usuario";

export interface MetaArchivo {
  nombre: string;
  tamanoKb: number;
}

export interface RegistroDocumentos {
  identificacion: MetaArchivo | null;
  licencia: MetaArchivo | null;
  actualizadoEn: string;
}

function metaDeArchivo(archivo: { nombre: string; tamanoBytes?: number } | null): MetaArchivo | null {
  if (!archivo) return null;
  return {
    nombre: archivo.nombre,
    tamanoKb: Math.round((archivo.tamanoBytes || 0) / 1024),
  };
}

async function leerTodos(): Promise<Record<string, RegistroDocumentos>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("[documentosService] Error leyendo documentos guardados", error);
    return {};
  }
}

export const documentosService = {
  /** true si el usuario ya tiene documento de identidad y licencia registrados. */
  tieneDocumentos: async (idUsuario: string | null | undefined): Promise<boolean> => {
    if (!idUsuario) return false;
    const todos = await leerTodos();
    const registro = todos[idUsuario];
    return !!(registro?.identificacion && registro?.licencia);
  },

  obtenerDocumentos: async (idUsuario: string | null | undefined): Promise<RegistroDocumentos | null> => {
    if (!idUsuario) return null;
    const todos = await leerTodos();
    return todos[idUsuario] || null;
  },

  /**
   * Guarda/actualiza la metadata de los documentos del usuario. Solo
   * sobreescribe los campos que vengan con archivo nuevo; si no subió un
   * archivo nuevo (porque ya tenía documentos verificados), se conserva
   * el registro existente para ese documento.
   */
  guardarDocumentos: async (
    idUsuario: string | null | undefined,
    datos: {
      identificacion?: { nombre: string; tamanoBytes?: number } | null;
      licencia?: { nombre: string; tamanoBytes?: number } | null;
    }
  ): Promise<RegistroDocumentos | null> => {
    if (!idUsuario) return null;
    const todos = await leerTodos();
    const actual = todos[idUsuario] || { identificacion: null, licencia: null, actualizadoEn: "" };

    const registro: RegistroDocumentos = {
      identificacion: datos.identificacion ? metaDeArchivo(datos.identificacion) : actual.identificacion,
      licencia: datos.licencia ? metaDeArchivo(datos.licencia) : actual.licencia,
      actualizadoEn: new Date().toISOString(),
    };

    todos[idUsuario] = registro;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    return registro;
  },
};
