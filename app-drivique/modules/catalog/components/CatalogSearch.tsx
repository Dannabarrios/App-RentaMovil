import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from "react-native-calendars";
import { GRADIENTES } from "@/constants/gradients";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { CIUDADES, SUCURSALES_DATA } from "../constants/catalog.constants";
import { BusquedaForm } from "../types/catalog.types";

type PickerField = "ciudad" | "sucursal" | null;

function formatFechaDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function getMarkedDates(inicio: string, fin: string, oscuro: boolean) {
  const mainColor = oscuro ? "#3B82F6" : "#2f4ea2";
  const midColor = oscuro ? "#1E3A8A" : "#BFDBFE";
  const midTextColor = oscuro ? "#DBEAFE" : "#1e3a8a";

  if (!inicio) return {};

  if (!fin) {
    return {
      [inicio]: {
        startingDay: true,
        endingDay: true,
        color: mainColor,
        textColor: "#fff",
      },
    };
  }

  const marked: Record<string, any> = {};
  let cursor = new Date(inicio + "T00:00:00");
  const fechaFinDate = new Date(fin + "T00:00:00");

  while (cursor <= fechaFinDate) {
    const dateStr = cursor.toISOString().split("T")[0];
    const esInicio = dateStr === inicio;
    const esFin = dateStr === fin;
    marked[dateStr] = {
      color: esInicio || esFin ? mainColor : midColor,
      textColor: esInicio || esFin ? "#fff" : midTextColor,
      startingDay: esInicio,
      endingDay: esFin,
    };
    cursor.setDate(cursor.getDate() + 1);
  }

  return marked;
}

interface Props {
  form: BusquedaForm;
  setForm: (campo: keyof BusquedaForm, valor: string | boolean) => void;
  onBuscar: () => void;
  onLimpiarBusqueda: () => void;
  textBusqueda: string;
  setTextBusqueda: (texto: string) => void;
  errorBusqueda?: string;
  disabled?: boolean;
  modalFormVisible: boolean;
  setModalFormVisible: (visible: boolean) => void;
  onPressRestringida?: () => void;
}

export default function BuscadorCatalogo({
  form,
  setForm,
  onBuscar,
  onLimpiarBusqueda,
  textBusqueda,
  setTextBusqueda,
  errorBusqueda,
  disabled = false,
  modalFormVisible,
  setModalFormVisible,
  onPressRestringida,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState<PickerField>(null);
  const c = useTemaColores();
  const { t } = useTranslation();

  const ciudadSeleccionada = form.lugarRecogida;
  const sucursalSeleccionada = form.lugarDevolucion;

  const sucursalesDeLaCiudad = ciudadSeleccionada
    ? SUCURSALES_DATA.filter((s) => s.ciudad === ciudadSeleccionada).map(
        (s) => s.nombre,
      )
    : [];

  const currentSelected =
    pickerOpen === "ciudad" ? ciudadSeleccionada : sucursalSeleccionada;

  const tieneBusquedaActiva = !!(
    form.lugarRecogida ||
    form.lugarDevolucion ||
    form.fechaInicio ||
    form.fechaFin
  );

  const limpiarFormulario = () => {
    onLimpiarBusqueda();
  };

  const selectPunto = (valor: string) => {
    if (pickerOpen === "ciudad") {
      setForm("lugarRecogida", valor);
      setForm("lugarDevolucion", "");
    } else {
      setForm("lugarDevolucion", valor);
    }
    setPickerOpen(null);
  };

  const onDayPress = (day: DateData) => {
    if (disabled) return;
    const dateStr = day.dateString;

    if (!form.fechaInicio || (form.fechaInicio && form.fechaFin)) {
      setForm("fechaInicio", dateStr);
      setForm("fechaFin", "");
      return;
    }

    if (dateStr < form.fechaInicio) {
      setForm("fechaInicio", dateStr);
      setForm("fechaFin", "");
    } else {
      setForm("fechaFin", dateStr);
    }
  };

  const fechaBtnLabel = tieneBusquedaActiva
    ? [
        form.lugarRecogida,
        form.lugarDevolucion,
        formatFechaDisplay(form.fechaInicio),
        formatFechaDisplay(form.fechaFin),
      ]
        .filter(Boolean)
        .join(" · ")
    : disabled
      ? t("catalogo.buscador.iniciaSesionConsultar")
      : t("catalogo.buscador.consultarDisponibilidad");

  const handlePressFechas = () => {
    if (disabled) {
      onPressRestringida?.();
    } else {
      setModalFormVisible(true);
    }
  };

  const abrirPickerSucursal = () => {
    if (!ciudadSeleccionada) return;
    setPickerOpen("sucursal");
  };

  const hoyISO = new Date().toISOString().split("T")[0];

  const primaryAccent = c.oscuro ? "#60A5FA" : "#2f4ea2";

  return (
    <View style={[styles.containerGeneral, { backgroundColor: c.bgHeader }]}>
      <View style={styles.searchRow}>
        <View style={[styles.barraInput, { backgroundColor: c.bgInput, borderColor: c.border }]}>
          <Ionicons
            name="search-outline"
            size={18}
            color={c.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.textInput, { color: c.textPrimary }]}
            placeholder={t("catalogo.buscador.placeholder")}
            placeholderTextColor={c.textMuted}
            value={textBusqueda}
            onChangeText={setTextBusqueda}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.calendarIconBtn,
            { backgroundColor: c.bgInput, borderColor: c.border },
            tieneBusquedaActiva && { borderColor: primaryAccent, backgroundColor: c.primaryBg },
          ]}
          activeOpacity={0.7}
          onPress={handlePressFechas}
        >
          <Ionicons
            name={tieneBusquedaActiva ? "calendar" : "calendar-outline"}
            size={20}
            color={tieneBusquedaActiva ? primaryAccent : c.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalFormVisible}
        animationType="slide"
        onRequestClose={() => setModalFormVisible(false)}
      >
        <SafeAreaView style={[styles.modalFormContainer, { backgroundColor: c.bg }]}>
          <View style={[styles.modalFormHeader, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => setModalFormVisible(false)}>
              <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalFormTitle, { color: c.textPrimary }]}>{t("catalogo.buscador.tituloModal")}</Text>
            {tieneBusquedaActiva ? (
              <TouchableOpacity onPress={limpiarFormulario}>
                <Text style={[styles.txtLimpiarModal, { color: primaryAccent }]}>{t("catalogo.buscador.limpiar")}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 45 }} />
            )}
          </View>

          <View style={styles.modalFormBody}>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: c.textSecondary }]}>{t("catalogo.buscador.ciudad")}</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: c.bgInput, borderColor: c.border }]}
                  onPress={() => setPickerOpen("ciudad")}
                >
                  <Ionicons name="location-outline" size={14} color={primaryAccent} />
                  <Text
                    style={[
                      styles.selectorText,
                      { color: c.textPrimary },
                      !ciudadSeleccionada && { color: c.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {ciudadSeleccionada || t("catalogo.buscador.seleccionaCiudad")}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color={c.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: c.textSecondary }]}>{t("catalogo.buscador.sucursal")}</Text>
                <TouchableOpacity
                  style={[
                    styles.selector,
                    { backgroundColor: c.bgInput, borderColor: c.border },
                    !ciudadSeleccionada && { backgroundColor: c.oscuro ? "#1F2937" : "#F3F4F6", opacity: 0.6 },
                  ]}
                  onPress={abrirPickerSucursal}
                  disabled={!ciudadSeleccionada}
                >
                  <Ionicons
                    name="business-outline"
                    size={14}
                    color={ciudadSeleccionada ? primaryAccent : c.textMuted}
                  />
                  <Text
                    style={[
                      styles.selectorText,
                      { color: c.textPrimary },
                      !sucursalSeleccionada && { color: c.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {!ciudadSeleccionada
                      ? t("catalogo.buscador.seleccionaCiudadPrimero")
                      : sucursalSeleccionada || t("catalogo.buscador.seleccionaSucursal")}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color={c.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: c.textSecondary }]}>{t("catalogo.buscador.fechaRecogida")}</Text>
                <View style={[styles.dateBtn, { backgroundColor: c.bgInput, borderColor: c.border }]}>
                  <Ionicons name="calendar-outline" size={14} color={primaryAccent} />
                  <Text
                    style={[
                      styles.dateBtnText,
                      { color: c.textPrimary },
                      !form.fechaInicio && { color: c.textMuted },
                    ]}
                  >
                    {form.fechaInicio
                      ? formatFechaDisplay(form.fechaInicio)
                      : t("catalogo.buscador.formatoFecha")}
                  </Text>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: c.textSecondary }]}>{t("catalogo.buscador.fechaDevolucion")}</Text>
                <View style={[styles.dateBtn, { backgroundColor: c.bgInput, borderColor: c.border }]}>
                  <Ionicons name="calendar-outline" size={14} color={primaryAccent} />
                  <Text
                    style={[
                      styles.dateBtnText,
                      { color: c.textPrimary },
                      !form.fechaFin && { color: c.textMuted },
                    ]}
                  >
                    {form.fechaFin
                      ? formatFechaDisplay(form.fechaFin)
                      : t("catalogo.buscador.formatoFecha")}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.calendarioContainer, { borderColor: c.border, backgroundColor: c.bgCard }]}>
              <Calendar
                key={c.oscuro ? "dark-cal" : "light-cal"}
                minDate={hoyISO}
                onDayPress={onDayPress}
                markingType="period"
                markedDates={getMarkedDates(form.fechaInicio, form.fechaFin, c.oscuro)}
                firstDay={1}
                enableSwipeMonths
                theme={{
                  backgroundColor: c.bgCard,
                  calendarBackground: c.bgCard,
                  todayTextColor: primaryAccent,
                  todayBackgroundColor: c.primaryBg,
                  arrowColor: primaryAccent,
                  monthTextColor: c.textPrimary,
                  textMonthFontWeight: "700",
                  textMonthFontSize: 15,
                  textSectionTitleColor: c.textSecondary,
                  textDayHeaderFontWeight: "600",
                  textDayHeaderFontSize: 11,
                  dayTextColor: c.textPrimary,
                  textDisabledColor: c.textMuted,
                  textDayFontSize: 13,
                  textDayFontWeight: "500",
                }}
              />
            </View>

            <TouchableOpacity
              style={styles.buscarBtnGrandeWrap}
              onPress={() => {
                setModalFormVisible(false);
                onBuscar();
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={GRADIENTES.boton.colors}
                start={GRADIENTES.boton.start}
                end={GRADIENTES.boton.end}
                style={styles.buscarBtnGrande}
              >
                <Ionicons name="search" size={18} color="#fff" />
                <Text style={styles.buscarBtnGrandeTexto}>{t("catalogo.buscador.buscar")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <Modal visible={!!pickerOpen} animationType="fade" transparent>
          <View style={styles.modalOverlayInterno}>
            <View style={[styles.modalInternoContenedor, { backgroundColor: c.bgCard }]}>
              <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
                <Text style={[styles.modalTitle, { color: c.textPrimary }]}>
                  {pickerOpen === "ciudad"
                    ? t("catalogo.buscador.modalCiudadTitulo")
                    : t("catalogo.buscador.modalSucursalTitulo")}
                </Text>
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: c.bgInput }]}
                  onPress={() => setPickerOpen(null)}
                >
                  <Ionicons name="close" size={20} color={c.textPrimary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={pickerOpen === "ciudad" ? CIUDADES : sucursalesDeLaCiudad}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.puntoItem,
                      { borderBottomColor: c.borderLight },
                      currentSelected === item && { backgroundColor: c.primaryBg },
                    ]}
                    onPress={() => selectPunto(item)}
                  >
                    <Ionicons
                      name={
                        pickerOpen === "ciudad"
                          ? "location-outline"
                          : "business-outline"
                      }
                      size={16}
                      color={currentSelected === item ? primaryAccent : c.textMuted}
                    />
                    <Text
                      style={[
                        styles.puntoText,
                        { color: c.textPrimary },
                        currentSelected === item && { color: primaryAccent, fontWeight: "700" },
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  containerGeneral: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barraInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 44,
    paddingHorizontal: 12,
  },
  calendarIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  searchIcon: { marginRight: 8 },
  textInput: { flex: 1, fontSize: 14, color: "#1F2937", height: "100%" },
  fechasBarraBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 44,
    paddingHorizontal: 12,
  },
  fechasBarraBtnDisabled: { backgroundColor: "#F3F4F6" },
  fechasBarraBtnActiva: { borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" },
  fechasBarraBtnText: { flex: 1, fontSize: 13.5, color: "#9CA3AF", fontWeight: "500" },
  fechasBarraBtnTextActivo: { color: "#2f4ea2", fontWeight: "600" },
  placeholder: { color: "#9CA3AF" },
  modalFormContainer: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  modalFormHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalFormTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  txtLimpiarModal: { fontSize: 14, color: "#2f4ea2", fontWeight: "600" },
  modalFormBody: { padding: 20, gap: 16 },
  row: { flexDirection: "row", gap: 12 },
  field: { flex: 1 },
  label: { fontSize: 9, fontWeight: "700", color: "#6B7280", letterSpacing: 0.8, marginBottom: 6 },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#F9FAFB",
  },
  selectorDisabled: { backgroundColor: "#F3F4F6", opacity: 0.6 },
  selectorText: { fontSize: 13, color: "#374151", flex: 1 },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#F9FAFB",
  },
  dateBtnText: { flex: 1, fontSize: 13, color: "#374151" },
  calendarioContainer: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  buscarBtnGrandeWrap: {
    borderRadius: 12,
    marginTop: 4,
    overflow: "hidden",
  },
  buscarBtnGrande: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    height: 48,
  },
  buscarBtnGrandeTexto: { color: "#fff", fontSize: 14, fontWeight: "700" },
  modalOverlayInterno: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalInternoContenedor: {
    backgroundColor: "#fff",
    borderRadius: 16,
    maxHeight: "70%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  puntoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  puntoItemActivo: { backgroundColor: "#EEF2FF" },
  puntoText: { flex: 1, fontSize: 13.5, color: "#374151" },
  puntoTextActivo: { color: "#2f4ea2", fontWeight: "700" },
});