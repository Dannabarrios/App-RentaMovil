// modules/catalog/hooks/useVehiculosReservados.ts
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import {
  reservaPersistService,
  calcularGrupoReserva,
} from "@/modules/reservation/services/reservationPersistService";

export function useVehiculosReservados() {
  const [idsReservados, setIdsReservados] = useState<Set<number | string>>(new Set());
  const [cargando, setCargando] = useState(false);

  const cargarReservas = useCallback(async () => {
    try {
      setCargando(true);
      const reservas = await reservaPersistService.getReservas();
      const reservados = new Set<number | string>();

      for (const r of reservas) {
        const grupo = calcularGrupoReserva(r);
        // Si la reserva está activa (pendiente, confirmada o en curso), el vehículo no está disponible
        if (
          r.estado !== "CANCELADA" &&
          r.estado !== "CANCELADA_POR_TIEMPO" &&
          grupo !== "finalizada" &&
          grupo !== "cancelada"
        ) {
          reservados.add(Number(r.vehiculoId));
          reservados.add(String(r.vehiculoId));
        }
      }
      setIdsReservados(reservados);
    } catch (err) {
      console.error("[useVehiculosReservados] Error cargando reservas activas:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarReservas();
    }, [cargarReservas])
  );

  const esVehiculoReservado = useCallback(
    (vehiculoId: number | string) => {
      return idsReservados.has(Number(vehiculoId)) || idsReservados.has(String(vehiculoId));
    },
    [idsReservados]
  );

  return { idsReservados, esVehiculoReservado, recargar: cargarReservas, cargando };
}
