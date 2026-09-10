/**
 * notifications.dummy.ts
 * Fuente de datos dummy para la pantalla de Notificaciones.
 */

export interface CouponDummy {
  id: string;
  codigo: string;
  descuentoTexto: string;
  porcentaje?: number;
  descuentoPorcentaje?: number;
  valorFijo?: number;
  descuentoFijo?: number;
  regla?: string;
  reglas?: {
    soloPrimeraReserva?: boolean;
    minimoDias?: number;
    minimoValor?: number;
    vehiculoId?: number;
    categoriasValidas?: string[];
    metodosPagoValidos?: string[];
  };
  minimoValor?: number;
  tituloPremio: string;
  recompensaDetalle: string;
  categoria?: string;
  vehicleCategoryFilter?: string;
  agotandose?: boolean;
  condicionesDetalladas?: string;
  fechaOtorgado?: string;
  fechaExpiracion?: string;
  expiracion?: string;
}

export interface VehiculoPromoDummy {
  id: string;
  vehiculoId: number;
  titulo: string;
  descripcion: string;
  descuentoBadge?: string;
  fechaPublicacion: string;
  expiracion?: string;
}

export const CUPONES_DUMMY: CouponDummy[] = [
  {
    id: 'c1',
    codigo: 'BIENVENIDO10',
    descuentoTexto: '10% OFF',
    porcentaje: 10,
    descuentoPorcentaje: 10,
    regla: 'Todos los vehículos',
    tituloPremio: 'Cupón de Bienvenida Drivique',
    recompensaDetalle: 'Válido para cualquier categoría de vehículo en tu primera reserva.',
    categoria: 'Todos los vehículos',
    vehicleCategoryFilter: 'Todos',
    agotandose: false,
    condicionesDetalladas: 'Válido para cualquier categoría de vehículo en tu reserva. Audiencia: Todos los usuarios.',
    fechaOtorgado: '2026-01-01T00:00:00Z',
    expiracion: '2026-12-31T23:59:59Z',
    reglas: {
      categoriasValidas: [],
    },
  },
  {
    id: 'c2',
    codigo: 'SUV20',
    descuentoTexto: '20% OFF',
    porcentaje: 20,
    descuentoPorcentaje: 20,
    regla: 'Categoría: SUV',
    tituloPremio: 'Especial Aventura SUV',
    recompensaDetalle: 'Aplica únicamente para vehículos de la categoría SUV.',
    categoria: 'SUV',
    vehicleCategoryFilter: 'SUV',
    agotandose: false,
    condicionesDetalladas: 'Aplica únicamente para vehículos de la categoría SUV. Audiencia: Todos los usuarios.',
    fechaOtorgado: '2026-01-01T00:00:00Z',
    expiracion: '2026-12-31T23:59:59Z',
    reglas: {
      categoriasValidas: ['SUV'],
    },
  },
  {
    id: 'c3',
    codigo: 'COROLLA15',
    descuentoTexto: '15% OFF',
    porcentaje: 15,
    descuentoPorcentaje: 15,
    regla: 'Toyota Corolla 2024',
    tituloPremio: 'Toyota Corolla Exclusivo',
    recompensaDetalle: 'Descuento del 15% exclusivo para reservas del vehículo Toyota Corolla 2024.',
    categoria: 'Sedan',
    vehicleCategoryFilter: 'Sedan',
    agotandose: false,
    condicionesDetalladas: 'Descuento del 15% exclusivo para reservas del vehículo Toyota Corolla 2024. Audiencia: Todos los usuarios.',
    fechaOtorgado: '2026-01-01T00:00:00Z',
    expiracion: '2026-12-31T23:59:59Z',
    reglas: {
      vehiculoId: 1,
      categoriasValidas: ['Sedan'],
    },
  },
  {
    id: 'c4',
    codigo: 'MUSTANG25',
    descuentoTexto: '25% OFF',
    porcentaje: 25,
    descuentoPorcentaje: 25,
    regla: 'Ford Mustang GT 2023',
    tituloPremio: 'Ford Mustang GT Deportivo VIP',
    recompensaDetalle: 'Descuento del 25% exclusivo para reservas del vehículo Ford Mustang GT 2023.',
    categoria: 'Deportivo',
    vehicleCategoryFilter: 'Deportivo',
    agotandose: false,
    condicionesDetalladas: 'Descuento del 25% exclusivo para reservas del vehículo Ford Mustang GT 2023. Audiencia: Todos los usuarios.',
    fechaOtorgado: '2026-01-01T00:00:00Z',
    expiracion: '2026-12-31T23:59:59Z',
    reglas: {
      vehiculoId: 4,
      categoriasValidas: ['Deportivo'],
    },
  },
  {
    id: 'c5',
    codigo: 'DRIVIQUE50K',
    descuentoTexto: '-$50.000',
    valorFijo: 50000,
    descuentoFijo: 50000,
    regla: 'Todos los vehículos',
    tituloPremio: 'Bono Fijo de Alquiler',
    recompensaDetalle: 'Bono directo de $50.000 COP aplicable a reservas en cualquier categoría de vehículo.',
    categoria: 'Todos los vehículos',
    vehicleCategoryFilter: 'Todos',
    agotandose: false,
    condicionesDetalladas: 'Bono directo de $50.000 COP aplicable a reservas en cualquier categoría de vehículo. Audiencia: Todos los usuarios.',
    fechaOtorgado: '2026-01-01T00:00:00Z',
    expiracion: '2026-12-31T23:59:59Z',
    reglas: {
      descuentoFijo: 50000,
      categoriasValidas: [],
    },
  },
];

export const VEHICULO_PROMOS_DUMMY: VehiculoPromoDummy[] = [
  {
    id: 'vp-1',
    vehiculoId: 1,
    titulo: 'Toyota Corolla Exclusivo',
    descripcion: 'Aprovecha 15% de descuento exclusivo en tus reservas del Toyota Corolla 2024.',
    descuentoBadge: '15% OFF',
    fechaPublicacion: '2026-01-01T08:00:00Z',
    expiracion: '2026-12-31T23:59:59Z',
  },
  {
    id: 'vp-2',
    vehiculoId: 4,
    titulo: 'Ford Mustang GT Deportivo VIP',
    descripcion: 'Siente la adrenalina con 25% de descuento especial en el Ford Mustang GT.',
    descuentoBadge: '25% OFF',
    fechaPublicacion: '2026-01-01T06:00:00Z',
    expiracion: '2026-12-31T23:59:59Z',
  },
  {
    id: 'vp-3',
    vehiculoId: 2,
    titulo: 'Especial Aventura SUV',
    descripcion: 'Disfruta de tus viajes familiares con 20% de descuento en la categoría SUV.',
    descuentoBadge: '20% OFF',
    fechaPublicacion: '2026-01-01T12:00:00Z',
    expiracion: '2026-12-31T23:59:59Z',
  },
];
