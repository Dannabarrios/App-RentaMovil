// modules/reservation/services/resenaService.ts
//
// Servicio para gestionar la calificación y comentario que el
// usuario deja sobre el vehículo al finalizar su reserva.
// Persiste en AsyncStorage e incluye fotos, vehículo y autor.
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "drivique_resenas";

export interface ResenaGuardada {
  referenciaReserva: string;
  usuarioId: string;
  usuarioNombre?: string;
  vehiculoId?: number | string;
  vehiculoNombre?: string;
  calificacion: number; // 1 a 5
  comentario: string;
  fotos?: string[]; // Máximo 3 URIs de fotos
  fecha: string;
  fechaIso?: string;
}

async function leerTodas(): Promise<Record<string, ResenaGuardada>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("[resenaService] Error leyendo reseñas guardadas", error);
    return {};
  }
}

async function guardarTodas(data: Record<string, ResenaGuardada>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const resenaService = {
  obtenerPorReserva: async (
    referenciaReserva: string | null | undefined,
    usuarioId: string
  ): Promise<ResenaGuardada | null> => {
    if (!referenciaReserva) return null;
    const todas = await leerTodas();
    const claveUsuario = `${usuarioId}:${referenciaReserva}`;
    if (todas[claveUsuario]) return todas[claveUsuario];

    // Migra una reseña creada con la estructura anterior si existe
    const anterior = todas[referenciaReserva];
    if (!anterior) return null;
    const migrada = { ...anterior, usuarioId };
    todas[claveUsuario] = migrada;
    delete todas[referenciaReserva];
    await guardarTodas(todas);
    return migrada;
  },

  obtenerPorVehiculo: async (
    vehiculoId: number | string | undefined,
    vehiculoNombre?: string
  ): Promise<ResenaGuardada[]> => {
    if (!vehiculoId && !vehiculoNombre) return [];
    const todas = await leerTodas();
    const lista = Object.values(todas);

    return lista.filter((r) => {
      if (vehiculoId && r.vehiculoId !== undefined) {
        return String(r.vehiculoId) === String(vehiculoId);
      }
      if (vehiculoNombre && r.vehiculoNombre) {
        return r.vehiculoNombre.toLowerCase().trim() === vehiculoNombre.toLowerCase().trim();
      }
      return false;
    });
  },

  guardar: async (
    referenciaReserva: string,
    usuarioId: string,
    datos: {
      calificacion: number;
      comentario: string;
      fotos?: string[];
      vehiculoId?: number | string;
      vehiculoNombre?: string;
      usuarioNombre?: string;
    }
  ): Promise<ResenaGuardada> => {
    const todas = await leerTodas();
    const ahora = new Date();
    const resena: ResenaGuardada = {
      referenciaReserva,
      usuarioId,
      usuarioNombre: datos.usuarioNombre || "Cliente",
      vehiculoId: datos.vehiculoId,
      vehiculoNombre: datos.vehiculoNombre,
      calificacion: datos.calificacion,
      comentario: datos.comentario,
      fotos: datos.fotos || [],
      fecha: ahora.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }),
      fechaIso: ahora.toISOString(),
    };
    todas[`${usuarioId}:${referenciaReserva}`] = resena;
    await guardarTodas(todas);
    return resena;
  },
};
