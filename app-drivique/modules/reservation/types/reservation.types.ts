// modules/reserva/types/reserva.types.ts
import { TipoDocumento } from "@/modules/profile/types/profile.types";
export type { TipoDocumento };

export type MetodoPago = "wompi" | "efectivo";

export interface DatosFechasLugar {
  metodoPago: MetodoPago | null;
  lugarRetiro: string;
  lugarDevolucion: string;
  fechaRetiro: string | null;
  fechaDevolucion: string | null;
  horaRetiro: string;
  horaDevolucion: string;

  barrioRetiro: string;
  direccionRetiro: string;
  referenciasRetiro: string;
  barrioDevolucion: string;
  direccionDevolucion: string;
  referenciasDevolucion: string;
  descuentoPromocion?: number;
}

export interface DesgloseTarifa {
  diarias: number;
  proteccionObligatoria: number;
  cargosAdministrativos: number;
  recargoLogistico: number;
  total: number;
  diasReserva: number;
}

export type PasoReserva = "fechas" | "planes" | "datos";

export type TipoKilometraje = "limitado" | "ilimitado";

export interface DatosPlanes {
  proteccion: string | null;
  tipoKilometraje: TipoKilometraje | null;
  serviciosSeleccionados: string[];
}

export interface DatosPersonales {
  nombreCompleto: string;
  nacionalidad: string;
  correo: string;
  celular: string;
  tipoDocumento: TipoDocumento | null;
  numeroDocumento: string;
  terminosAceptados: boolean;
}

export interface ArchivoDocumento {
  uri?: string;
  nombre: string;
  tipoMime?: string;
  tamanoBytes?: number;
}

export type LlaveDocumento =
  | "cedulaFrente"
  | "cedulaReverso"
  | "licenciaConduccion";

export type DatosDocumentos = Record<LlaveDocumento, ArchivoDocumento | null>;

export interface Cupon {
  codigo: string;
  descuentoPorcentaje?: number;
  descuentoFijo?: number;
  descripcion?: string;
  reglas?: {
    minimoDias?: number;
    soloPrimeraReserva?: boolean;
    categoriasValidas?: string[]; // e.g. "SUV", "Sedan"
  };
}
