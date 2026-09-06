// modules/reserva/constants/reserva.constants.ts
import nacionalidadesData from "@/mocks/nationalities.json";
import {
  COLORES,
  COLOR_MARCA,
} from "@/modules/catalog/constants/catalog.constants";
import { TipoDocumento } from "@/modules/profile/types/profile.types";

// Reutilizamos la paleta del catálogo, sin duplicar valores
export { COLORES, COLOR_MARCA };

// Placeholders de negocio — reemplazar cuando haya reglas reales de precios
export const PROTECCION_OBLIGATORIA_DIA = 29000;
export const PORCENTAJE_CARGOS_ADMINISTRATIVOS = 0.1;
export const RECARGO_LOGISTICO = 0;
export const PORCENTAJE_IVA = 0.19;

// Valor cobrado por cada kilómetro que supere el límite pactado en el
// plan de kilometraje limitado. Se usa tanto en la tarjeta de Planes
// como en el texto de Términos y Condiciones, para no repetir el
// número quemado en dos lugares distintos.
export const VALOR_KM_EXCEDENTE = 1500;

export const HORAS_DISPONIBLES = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

export function getMetodosPago(t: (key: string) => string) {
  return [
    {
      id: "wompi" as const,
      titulo: t("reserva.planes.metodosPago.wompi.titulo"),
      descripcion: t("reserva.planes.metodosPago.wompi.descripcion"),
    },
    {
      id: "efectivo" as const,
      titulo: t("reserva.planes.metodosPago.efectivo.titulo"),
      descripcion: t("reserva.planes.metodosPago.efectivo.descripcion"),
    },
  ];
}

// FUNCIÓN: formatHoraAmPm
// Convierte una hora en formato 24h (ej: "14:00") a texto legible con
// a. m. / p. m. (ej: "2:00 p. m."). El valor guardado sigue siendo 24h;
// esto solo cambia cómo se MUESTRA la hora al usuario.
export function formatHoraAmPm(hora24: string): string {
  const [hStr, m] = hora24.split(":");
  let h = parseInt(hStr, 10);
  const sufijo = h >= 12 ? "p. m." : "a. m.";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${sufijo}`;
}

// ===================== TAB "PLANES" =====================

// Texto informativo sobre cómo se maneja el kilometraje en el alquiler
// de carros por días en Colombia. Es la práctica habitual del sector,
// no una norma legal específica.
export function getInfoKilometrajeColombia(t: (key: string) => string): string {
  return t("reserva.planes.infoKilometrajeColombia");
}

export interface BeneficioProteccion {
  tipo: "check" | "warning" | "cross";
  texto: string;
}

// Beneficios mostrados en cada tarjeta de protección. Se relacionan por
// el campo "nombre" que ya viene en vehiculo.seguros. Si aparece un
// seguro con un nombre nuevo que no está aquí, simplemente no muestra
// la lista de beneficios (pero sí el precio y el botón de selección).
export function getBeneficiosProteccion(
  t: (key: string, opts?: any) => any
): Record<string, BeneficioProteccion[]> {
  const tiposObligatoria: BeneficioProteccion["tipo"][] = ["check", "check", "check", "warning", "cross"];
  const tiposTotal: BeneficioProteccion["tipo"][] = ["check", "check", "check", "check", "check", "cross"];
  const obligatoria = (t("reserva.planes.beneficiosProteccionObligatoria", {
    returnObjects: true,
  }) as string[]).map((texto, i) => ({ tipo: tiposObligatoria[i] ?? "check", texto }));
  const total = (t("reserva.planes.beneficiosProteccionTotal", {
    returnObjects: true,
  }) as string[]).map((texto, i) => ({ tipo: tiposTotal[i] ?? "check", texto }));

  return {
    "Protección Obligatoria": obligatoria,
    "Protección Total": total,
  };
}

// Beneficios/condiciones mostrados en cada tarjeta de tipo de
// kilometraje, mismo patrón que getBeneficiosProteccion. Se relacionan
// por la clave "limitado" / "ilimitado", que coincide con
// planes.tipoKilometraje en el store.
export function getBeneficiosKilometraje(
  t: (key: string, opts?: any) => any
): Record<"limitado" | "ilimitado", BeneficioProteccion[]> {
  const tiposLimitado: BeneficioProteccion["tipo"][] = ["check", "warning", "cross"];
  const tiposIlimitado: BeneficioProteccion["tipo"][] = ["check", "check", "cross"];
  const limitado = (t("reserva.planes.beneficiosKmLimitado", {
    returnObjects: true,
  }) as string[]).map((texto, i) => ({ tipo: tiposLimitado[i], texto }));
  const ilimitado = (t("reserva.planes.beneficiosKmIlimitado", {
    returnObjects: true,
  }) as string[]).map((texto, i) => ({ tipo: tiposIlimitado[i], texto }));

  return { limitado, ilimitado };
}

// Ícono por servicio adicional (coincide exactamente con los nombres
// usados en vehiculos.json). Si aparece un servicio nuevo que no está
// en este mapa, se usa el ícono por defecto.
export const ICONO_SERVICIO_DEFECTO = "add-circle-outline";
export const ICONOS_SERVICIOS: Record<string, string> = {
  GPS: "navigate-outline",
  "GPS Integrado": "navigate-outline",
  "Silla bebé": "body-outline",
  "Silla de bebé": "body-outline",
  "Conductor adicional": "person-add-outline",
  "Lavado de auto post-entrega": "sparkles-outline",
  "Devolución con tanque vacío": "color-fill-outline",
  "Entrega en otra ciudad": "map-outline",
  "WiFi portátil": "wifi-outline",
};

// ===================== TAB "DATOS PERSONALES" =====================

// ⚠️ CAMBIO: se unificó al tipo de Perfil (CC | TI | Doc. Extranjero |
// Pasaporte). El id ahora tipa contra TipoDocumento (importado de
// perfil.types.ts) en vez de ser un literal local — así el compilador
// avisa si algún día los enums se vuelven a desalinear.
export function getTiposDocumento(
  t: (key: string) => string
): { id: TipoDocumento; label: string }[] {
  return [
    { id: "CC", label: t("reserva.datosPersonales.tiposDocumento.CC") },
    { id: "TI", label: t("reserva.datosPersonales.tiposDocumento.TI") },
    { id: "Doc. Extranjero", label: t("reserva.datosPersonales.tiposDocumento.DocExtranjero") },
    { id: "Pasaporte", label: t("reserva.datosPersonales.tiposDocumento.Pasaporte") },
  ];
}

// Estructura de cada nacionalidad: nombre visible + código de
// marcación telefónica. Sale de mocks/nacionalidades.json — simula lo
// que después va a devolver el backend, así que cuando exista ese
// endpoint solo se reemplaza esta línea de import.
export interface NacionalidadOpcion {
  nombre: string;
  prefijo: string; // ej: "+57". Vacío ("") para "Otro" — no hay país fijo.
}

export const NACIONALIDADES: NacionalidadOpcion[] = nacionalidadesData;

// Busca el prefijo telefónico según el nombre de nacionalidad elegido
// en el formulario. Devuelve "" (vacío) si todavía no se ha elegido
// nacionalidad, o si es "Otro" — en ese caso no se asume ningún país,
// el prefijo se muestra vacío/placeholder hasta que el usuario elija.
export function getPrefijoPorNacionalidad(nacionalidad: string | null): string {
  if (!nacionalidad) return "";
  const encontrada = NACIONALIDADES.find((n) => n.nombre === nacionalidad);
  return encontrada?.prefijo ?? "";
}

// Tipos de archivo aceptados por el selector de documentos
export const TIPOS_ARCHIVO_DOCUMENTO = ["application/pdf", "image/*"];

// Tamaño máximo permitido por archivo (5 MB)
export const TAMANO_MAXIMO_ARCHIVO_BYTES = 5 * 1024 * 1024;

// ===================== TÉRMINOS Y CONDICIONES =====================

export interface PuntoPolitica {
  titulo: string;
  items: string[];
}

// Contenido completo del panel de "Políticas importantes" que se
// despliega en la tarjeta de Términos y Condiciones (tab Datos
// personales). Vive aquí, no dentro del componente, para seguir el
// mismo patrón que BENEFICIOS_PROTECCION / INFO_KILOMETRAJE_COLOMBIA:
// contenido de negocio separado de la UI que lo renderiza.
export function getResumenPoliticasImportantes(t: (key: string) => string): string {
  return t("reserva.terminos.resumenPoliticasImportantes");
}

export function getPuntosPolitica(
  t: (key: string, opts?: any) => any
): PuntoPolitica[] {
  const puntos = t("reserva.terminos.puntos", { returnObjects: true }) as PuntoPolitica[];
  // Los puntos 3 y 4 (índices 2 y 3) mencionan el valor de excedente por
  // kilómetro — se interpola acá porque viene de una constante numérica,
  // no de la traducción.
  const valorKm = VALOR_KM_EXCEDENTE.toLocaleString("es-CO");
  return puntos.map((punto) => ({
    ...punto,
    items: punto.items.map((item) => item.replace(/\{\{valorKm\}\}/g, `$${valorKm}`)),
  }));
}
