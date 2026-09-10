import { create } from "zustand";
import { Cupon } from "@/modules/reservation/types/reservation.types";

export interface Notificacion {
  id: string;
  tipo: "general" | "promocion";
  titulo: string;
  mensaje: string;
  /** ISO 8601 */
  fecha: string;
  leido: boolean;
  /** ISO 8601 — si existe, la notificacion desaparece automaticamente despues de esta fecha */
  expiracion?: string;
  /** Icono de Ionicons a mostrar (opcional, por defecto se infiere del tipo/titulo) */
  icono?: string;
  /** Detalles del cupón (solo para tipo "promocion") */
  cupon?: Cupon;
}

interface NotificationState {
  notificaciones: Notificacion[];
  marcarComoLeida: (id: string) => void;
  marcarTodasComoLeidas: () => void;
  agregarNotificacion: (notif: Omit<Notificacion, "id" | "leido" | "fecha">) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notificaciones: [
    // ── GENERALES ──────────────────────────────────────────────────────
    {
      id: "g1",
      tipo: "general",
      titulo: "Reserva confirmada",
      mensaje:
        "Tu reserva del Toyota Prado ha sido confirmada con éxito. Recuerda que el retiro es en sucursal Neiva el día acordado.",
      fecha: "2026-08-11T14:30:00Z",
      leido: false,
      icono: "checkmark-circle-outline",
    },
    {
      id: "g2",
      tipo: "general",
      titulo: "Pago validado",
      mensaje:
        "El pago digital a través de Wompi fue validado de forma satisfactoria. Guarda tu comprobante.",
      fecha: "2026-08-11T14:35:00Z",
      leido: false,
      icono: "card-outline",
    },
    {
      id: "g3",
      tipo: "general",
      titulo: "Documentos verificados",
      mensaje:
        "Tu licencia de conducción y documento de identidad fueron aprobados por nuestro equipo. Ya puedes continuar con tu reserva.",
      fecha: "2026-08-10T09:20:00Z",
      leido: false,
      icono: "document-text-outline",
    },
    {
      id: "g4",
      tipo: "general",
      titulo: "Reserva próxima a vencer",
      mensaje:
        "Tu reserva del Chevrolet Spark vence mañana a las 10:00 AM. Si no la confirmas, se liberará el vehículo.",
      fecha: "2026-08-09T18:00:00Z",
      leido: false,
      icono: "time-outline",
      expiracion: "2026-08-12T10:00:00Z",
    },
    {
      id: "g5",
      tipo: "general",
      titulo: "Soporte respondió tu caso",
      mensaje:
        "El equipo de soporte respondió tu solicitud #4821. Ingresa a la sección de soporte para ver la respuesta.",
      fecha: "2026-08-09T11:45:00Z",
      leido: true,
      icono: "chatbubble-ellipses-outline",
    },
    {
      id: "g6",
      tipo: "general",
      titulo: "Alquiler finalizado",
      mensaje:
        "Tu alquiler del Ford Explorer finalizó correctamente. ¡Gracias por confiar en Drivique! No olvides dejar tu calificación.",
      fecha: "2026-08-08T16:00:00Z",
      leido: true,
      icono: "car-outline",
    },
    {
      id: "g7",
      tipo: "general",
      titulo: "Nueva política de cancelación",
      mensaje:
        "Actualizamos nuestra política de cancelación. Ahora tienes hasta 24 horas antes del inicio para cancelar sin costo.",
      fecha: "2026-08-07T10:00:00Z",
      leido: true,
      icono: "information-circle-outline",
    },
    // ── PROMOCIONES ───────────────────────────────────────────────────
    {
      id: "p1",
      tipo: "promocion",
      titulo: "Cupón de Bienvenida Drivique",
      mensaje: "Usa el cupón BIENVENIDO10 para obtener 10% de descuento en tu alquiler. Válido para cualquier categoría.",
      fecha: "2026-01-01T08:00:00Z",
      leido: false,
      icono: "ticket-outline",
      expiracion: "2026-12-31T23:59:59Z",
      cupon: {
        codigo: "BIENVENIDO10",
        descuentoPorcentaje: 10,
        descripcion: "10% de descuento en tu reserva.",
        reglas: {
          categoriasValidas: []
        }
      }
    },
    {
      id: "p2",
      tipo: "promocion",
      titulo: "Especial Aventura SUV",
      mensaje: "Aprovecha 20% de descuento con el código SUV20 en toda la categoría SUV.",
      fecha: "2026-01-01T10:00:00Z",
      leido: false,
      icono: "calendar-outline",
      expiracion: "2026-12-31T23:59:59Z",
      cupon: {
        codigo: "SUV20",
        descuentoPorcentaje: 20,
        descripcion: "20% OFF en vehículos categoría SUV.",
        reglas: {
          categoriasValidas: ["SUV"]
        }
      }
    },
    {
      id: "p3",
      tipo: "promocion",
      titulo: "Toyota Corolla Exclusivo",
      mensaje: "Descuento del 15% exclusivo para reservas del vehículo Toyota Corolla 2024 con el código COROLLA15.",
      fecha: "2026-01-01T07:30:00Z",
      leido: true,
      icono: "star-outline",
      expiracion: "2026-12-31T23:59:59Z",
      cupon: {
        codigo: "COROLLA15",
        descuentoPorcentaje: 15,
        descripcion: "15% de descuento en Toyota Corolla 2024.",
        reglas: {
          categoriasValidas: ["Sedan"]
        }
      }
    },
    {
      id: "p4",
      tipo: "promocion",
      titulo: "Ford Mustang GT Deportivo VIP",
      mensaje: "Descuento del 25% exclusivo para reservas del Ford Mustang GT 2023 con el cupón MUSTANG25.",
      fecha: "2026-01-01T09:00:00Z",
      leido: true,
      icono: "speedometer-outline",
      expiracion: "2026-12-31T23:59:59Z",
      cupon: {
        codigo: "MUSTANG25",
        descuentoPorcentaje: 25,
        descripcion: "25% de descuento en Ford Mustang GT.",
        reglas: {
          categoriasValidas: ["Deportivo"]
        }
      }
    },
    {
      id: "p5",
      tipo: "promocion",
      titulo: "Bono Fijo de Alquiler",
      mensaje: "Bono directo de $50.000 COP aplicable a reservas con el cupón DRIVIQUE50K.",
      fecha: "2026-01-01T11:00:00Z",
      leido: true,
      icono: "gift-outline",
      expiracion: "2026-12-31T23:59:59Z",
      cupon: {
        codigo: "DRIVIQUE50K",
        descuentoFijo: 50000,
        descripcion: "$50.000 COP de bono en tu reserva.",
        reglas: {
          categoriasValidas: []
        }
      }
    },
  ],
  marcarComoLeida: (id) =>
    set((state) => ({
      notificaciones: state.notificaciones.map((n) =>
        n.id === id ? { ...n, leido: true } : n
      ),
    })),
  marcarTodasComoLeidas: () =>
    set((state) => ({
      notificaciones: state.notificaciones.map((n) => ({ ...n, leido: true })),
    })),
  agregarNotificacion: (notif) =>
    set((state) => ({
      notificaciones: [
        {
          ...notif,
          id: Math.random().toString(),
          leido: false,
          fecha: new Date().toISOString(),
        },
        ...state.notificaciones,
      ],
    })),
}));

