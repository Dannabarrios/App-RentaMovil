// modules/reserva/components/AlertaPagoEfectivo.tsx
//
// Alerta tipo "sweet alert" que se muestra cuando el usuario elige
// "Pago en efectivo" como método de pago. Al pagar en efectivo el
// único punto de retiro/devolución posible es la sucursal donde está
// el vehículo, así que le mostramos de una vez la ciudad y dirección
// exactas a las que debe dirigirse.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AlertModal } from "@/components/ui/AlertModal";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";

interface Props {
  visible: boolean;
  nombreSucursal: string;
  ciudad: string | null;
  direccion: string | null;
  onCerrar: () => void;
}

export function AlertaPagoEfectivo({ visible, nombreSucursal, ciudad, direccion, onCerrar }: Props) {
  const c = useTemaColores();
  const { t } = useTranslation();
  return (
    <AlertModal
      visible={visible}
      icono="information-circle-outline"
      titulo={t("reserva.confirmacion.pagoEfectivoTitulo")}
      mensaje={t("reserva.confirmacion.pagoEfectivoMensaje")}
      onCerrar={onCerrar}
      botones={[{ texto: t("reserva.resumen.cerrar"), onPress: onCerrar, variante: "primario" }]}
      contenido={
        <View style={[s.caja, { backgroundColor: c.primaryBg }]}>
          <Text style={[s.nombreSucursal, { color: c.textPrimary }]}>{nombreSucursal}</Text>
          <Text style={[s.fila, { color: c.textSecondary }]}>
            <Text style={[s.etiqueta, { color: c.textSecondary }]}>{t("reserva.confirmacion.ciudad")}: </Text>
            {ciudad ?? t("reserva.confirmacion.sinDefinir")}
          </Text>
          <Text style={[s.fila, { color: c.textSecondary }]}>
            <Text style={[s.etiqueta, { color: c.textSecondary }]}>{t("reserva.confirmacion.direccion")}: </Text>
            {direccion ?? t("reserva.confirmacion.sinDefinir")}
          </Text>
        </View>
      }
    />
  );
}

const s = StyleSheet.create({
  caja: {
    width: "100%",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  nombreSucursal: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  fila: {
    fontSize: 13,
    lineHeight: 19,
  },
  etiqueta: {
    fontWeight: "700",
  },
});
