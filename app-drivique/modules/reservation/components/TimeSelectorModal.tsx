import React, { useMemo } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLOR_MARCA, formatHoraAmPm } from "../constants/reservation.constants";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";

function generarHoras(): string[] {
  const horas: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      horas.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return horas;
}

const HORAS = generarHoras();

interface Props {
  visible: boolean;
  horaSeleccionada: string;
  fecha?: string | null;
  minHora?: string | null;
  onSeleccionar: (hora: string) => void;
  onCerrar: () => void;
}

export default function SelectorHoraModal({
  visible,
  horaSeleccionada,
  fecha,
  minHora,
  onSeleccionar,
  onCerrar,
}: Props) {
  const c = useTemaColores();
  const { t } = useTranslation();

  const listaHoras = useMemo(() => {
    let minLimiteMinutos = -1;
    if (minHora && typeof minHora === "string" && minHora.includes(":")) {
      const [mh, mm] = minHora.split(":").map(Number);
      if (!isNaN(mh) && !isNaN(mm)) {
        minLimiteMinutos = mh * 60 + mm;
      }
    }

    return HORAS.map((horaStr) => {
      const [h, m] = horaStr.split(":").map(Number);
      const totalMin = h * 60 + m;

      let bloqueada = false;
      let motivo = "";

      // Si es devolución el mismo día, debe ser posterior a la hora de retiro
      if (minLimiteMinutos >= 0 && totalMin <= minLimiteMinutos) {
        bloqueada = true;
        motivo = t("reserva.fechasLugar.horaAnteriorTag", { defaultValue: "No disponible" });
      }

      return {
        hora: horaStr,
        bloqueada,
        motivo,
      };
    });
  }, [minHora, t]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <TouchableWithoutFeedback onPress={onCerrar}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: c.bgCard }]}>
              <View style={[styles.header, { borderBottomColor: c.border }]}>
                <Text style={[styles.headerTitulo, { color: c.textPrimary }]}>{t("reserva.fechasLugar.seleccionaHora")}</Text>
                <TouchableOpacity onPress={onCerrar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.cerrarTexto}>{t("reserva.resumen.cerrar")}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.lista} showsVerticalScrollIndicator={false}>
                {listaHoras.map(({ hora, bloqueada, motivo }) => {
                  const activa = hora === horaSeleccionada && !bloqueada;
                  return (
                    <TouchableOpacity
                      key={hora}
                      disabled={bloqueada}
                      style={[
                        styles.item,
                        activa && { backgroundColor: c.primaryBg },
                        bloqueada && styles.itemBloqueado,
                      ]}
                      onPress={() => {
                        if (bloqueada) return;
                        onSeleccionar(hora);
                        onCerrar();
                      }}
                      activeOpacity={bloqueada ? 1 : 0.7}
                    >
                      <View style={styles.itemFila}>
                        <Text
                          style={[
                            styles.itemTexto,
                            { color: bloqueada ? c.textMuted : c.textSecondary },
                            activa && styles.itemTextoActivo,
                            bloqueada && styles.itemTextoBloqueado,
                          ]}
                        >
                          {formatHoraAmPm(hora)}
                        </Text>
                        {bloqueada && (
                          <View style={styles.badgeBloqueado}>
                            <Ionicons name="lock-closed-outline" size={11} color={c.textMuted} style={{ marginRight: 3 }} />
                            <Text style={[styles.badgeBloqueadoTexto, { color: c.textMuted }]}>{motivo}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  card: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "65%",
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitulo: { fontSize: 14, fontWeight: "800" },
  cerrarTexto: { fontSize: 13, fontWeight: "700", color: COLOR_MARCA },
  lista: { paddingHorizontal: 8, paddingTop: 4 },
  item: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginVertical: 1 },
  itemBloqueado: { opacity: 0.45 },
  itemFila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTexto: { fontSize: 13, fontWeight: "600" },
  itemTextoActivo: { fontWeight: "800", color: COLOR_MARCA },
  itemTextoBloqueado: { textDecorationLine: "line-through" },
  badgeBloqueado: { flexDirection: "row", alignItems: "center" },
  badgeBloqueadoTexto: { fontSize: 11, fontWeight: "500" },
});
