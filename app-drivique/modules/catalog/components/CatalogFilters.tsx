import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import {
  CATEGORIAS,
  CIUDADES_FILTRO,
  COMBUSTIBLES,
  SUCURSALES,
  TRANSMISIONES,
} from "../constants/catalog.constants";
import { FiltrosCatalogoState } from "../types/catalog.types";

interface Props {
  visible: boolean;
  onClose: () => void;
  filtros: FiltrosCatalogoState;
  setFiltro: (campo: keyof FiltrosCatalogoState, valor: string) => void;
  limpiar: () => void;
  usuario: boolean;
  soloFavoritos: boolean;
  onToggleSoloFavoritos: () => void;
  totalFavoritos: number;
}

function Chip({
  label,
  activo,
  onPress,
  c,
}: {
  label: string;
  activo: boolean;
  onPress: () => void;
  c: ReturnType<typeof useTemaColores>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: c.bgInput },
        activo && { backgroundColor: c.oscuro ? "#3B82F6" : "#2f4ea2" },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: c.textSecondary },
          activo && { color: "#FFFFFF" },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Seccion({
  label,
  children,
  c,
}: {
  label: string;
  children: React.ReactNode;
  c: ReturnType<typeof useTemaColores>;
}) {
  return (
    <View style={[styles.seccion, { borderBottomColor: c.border }]}>
      <Text style={[styles.seccionLabel, { color: c.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

type DropdownAbierto = "ciudad" | "sucursal" | null;

export default function FiltrosCatalogo({
  visible,
  onClose,
  filtros,
  setFiltro,
  limpiar,
  usuario,
  soloFavoritos,
  onToggleSoloFavoritos,
  totalFavoritos,
}: Props) {
  const [dropdownAbierto, setDropdownAbierto] = useState<DropdownAbierto>(null);
  const c = useTemaColores();
  const { t } = useTranslation();

  const primaryAccent = c.oscuro ? "#60A5FA" : "#2f4ea2";

  const catLabels: Record<string, string> = {
    Todos: t("catalogo.filtrosModal.todasCategorias"),
    Sedan: t("catalogo.categoriaValores.Sedan"),
    SUV: t("catalogo.categoriaValores.SUV"),
    Económico: t("catalogo.categoriaValores.Económico"),
    Deportivo: t("catalogo.categoriaValores.Deportivo"),
  };

  const transLabels: Record<string, string> = {
    Todas: t("catalogo.transmisionValores.Todas"),
    Automática: t("catalogo.transmisionValores.Automática"),
    Manual: t("catalogo.transmisionValores.Manual"),
  };

  const fuelLabels: Record<string, string> = {
    Todos: t("catalogo.combustibleValores.Todos"),
    Gasolina: t("catalogo.combustibleValores.Gasolina"),
    Diesel: t("catalogo.combustibleValores.Diesel"),
    Híbrido: t("catalogo.combustibleValores.Híbrido"),
    Eléctrico: t("catalogo.combustibleValores.Eléctrico"),
  };

  const toggleDropdown = (campo: "ciudad" | "sucursal") => {
    setDropdownAbierto((prev) => (prev === campo ? null : campo));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Text style={[styles.headerTitle, { color: c.textPrimary }]}>{t("catalogo.filtrosModal.titulo")}</Text>
          <TouchableOpacity onPress={limpiar}>
            <Text style={[styles.limpiarBtn, { color: primaryAccent }]}>{t("catalogo.limpiarFiltros")}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {usuario && (
            <Seccion label={t("catalogo.filtrosModal.misFavoritos").toUpperCase()} c={c}>
              <TouchableOpacity
                style={[
                  styles.favoritoBtn,
                  { backgroundColor: c.primaryBg, borderColor: c.border },
                  soloFavoritos && { backgroundColor: c.oscuro ? "#3B82F6" : "#2f4ea2", borderColor: c.oscuro ? "#3B82F6" : "#2f4ea2" },
                ]}
                onPress={onToggleSoloFavoritos}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="heart"
                  size={15}
                  color={soloFavoritos ? "#fff" : "#ef4444"}
                />
                <Text
                  style={[
                    styles.favoritoBtnText,
                    { color: primaryAccent },
                    soloFavoritos && { color: "#fff" },
                  ]}
                >
                  {t("catalogo.filtrosModal.misFavoritos")}
                </Text>
                {totalFavoritos > 0 && (
                  <View
                    style={[styles.badge, { backgroundColor: primaryAccent }, soloFavoritos && { backgroundColor: "rgba(255,255,255,0.3)" }]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        soloFavoritos && { color: "#fff" },
                      ]}
                    >
                      {totalFavoritos}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Seccion>
          )}

          <Seccion label={t("catalogo.filtrosModal.categoria")} c={c}>
            <View style={styles.chipsRow}>
              {CATEGORIAS.map((cat) => (
                <Chip
                  key={cat}
                  label={catLabels[cat] ?? cat}
                  activo={filtros.categoria === cat}
                  onPress={() => setFiltro("categoria", cat)}
                  c={c}
                />
              ))}
            </View>
          </Seccion>

          <Seccion label={t("catalogo.filtrosModal.ciudad")} c={c}>
            <TouchableOpacity
              style={[styles.selectorBtn, { backgroundColor: c.bgInput, borderColor: c.border }]}
              onPress={() => toggleDropdown("ciudad")}
            >
              <Text style={[styles.selectorText, { color: c.textPrimary }]}>{filtros.ciudad}</Text>
              <Text style={[styles.selectorArrow, { color: c.textSecondary }]}>
                {dropdownAbierto === "ciudad" ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>
            {dropdownAbierto === "ciudad" && (
              <View style={[styles.dropdownList, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {CIUDADES_FILTRO.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.dropdownItem,
                        { borderBottomColor: c.borderLight },
                        filtros.ciudad === item && { backgroundColor: c.primaryBg },
                      ]}
                      onPress={() => {
                        setFiltro("ciudad", item);
                        setDropdownAbierto(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          { color: c.textPrimary },
                          filtros.ciudad === item && { color: primaryAccent, fontWeight: "700" },
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </Seccion>

          <Seccion label={t("catalogo.filtrosModal.sucursal")} c={c}>
            <TouchableOpacity
              style={[styles.selectorBtn, { backgroundColor: c.bgInput, borderColor: c.border }]}
              onPress={() => toggleDropdown("sucursal")}
            >
              <Text style={[styles.selectorText, { color: c.textPrimary }]} numberOfLines={1}>
                {filtros.sucursal}
              </Text>
              <Text style={[styles.selectorArrow, { color: c.textSecondary }]}>
                {dropdownAbierto === "sucursal" ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>
            {dropdownAbierto === "sucursal" && (
              <View style={[styles.dropdownList, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {SUCURSALES.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.dropdownItem,
                        { borderBottomColor: c.borderLight },
                        filtros.sucursal === s && { backgroundColor: c.primaryBg },
                      ]}
                      onPress={() => {
                        setFiltro("sucursal", s);
                        setDropdownAbierto(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          { color: c.textPrimary },
                          filtros.sucursal === s && { color: primaryAccent, fontWeight: "700" },
                        ]}
                        numberOfLines={1}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </Seccion>

          <Seccion label={t("catalogo.filtrosModal.precioPorDia")} c={c}>
            <View style={styles.precioRow}>
              <TextInput
                style={[styles.precioInput, { backgroundColor: c.bgInput, borderColor: c.border, color: c.textPrimary }]}
                placeholder={t("catalogo.filtrosModal.min")}
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                value={filtros.precioMin}
                onChangeText={(v) =>
                  setFiltro("precioMin", v.replace(/[^0-9]/g, ""))
                }
              />
              <TextInput
                style={[styles.precioInput, { backgroundColor: c.bgInput, borderColor: c.border, color: c.textPrimary }]}
                placeholder={t("catalogo.filtrosModal.max")}
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                value={filtros.precioMax}
                onChangeText={(v) =>
                  setFiltro("precioMax", v.replace(/[^0-9]/g, ""))
                }
              />
            </View>
          </Seccion>

          <Seccion label={t("catalogo.filtrosModal.transmisionLbl")} c={c}>
            <View style={styles.chipsRow}>
              {TRANSMISIONES.map((tr) => (
                <Chip
                  key={tr}
                  label={transLabels[tr] ?? tr}
                  activo={filtros.transmision === tr}
                  onPress={() => setFiltro("transmision", tr)}
                  c={c}
                />
              ))}
            </View>
          </Seccion>

          <Seccion label={t("catalogo.filtrosModal.combustibleLbl")} c={c}>
            <View style={styles.chipsRow}>
              {COMBUSTIBLES.map((comb) => (
                <Chip
                  key={comb}
                  label={fuelLabels[comb] ?? comb}
                  activo={filtros.combustible === comb}
                  onPress={() => setFiltro("combustible", comb)}
                  c={c}
                />
              ))}
            </View>
          </Seccion>
        </ScrollView>

        <View style={[styles.footerBtn, { borderTopColor: c.border, backgroundColor: c.bgCard }]}>
          <TouchableOpacity style={[styles.aplicarBtn, { backgroundColor: c.oscuro ? "#3B82F6" : "#2f4ea2" }]} onPress={onClose}>
            <Text style={styles.aplicarBtnText}>{t("catalogo.filtrosModal.aplicarFiltros")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  limpiarBtn: { fontSize: 13, fontWeight: "700", color: "#2f4ea2" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 8 },
  seccion: {
    marginBottom: 22,
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  seccionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    marginBottom: 4,
  },
  chipActivo: { backgroundColor: "#2f4ea2" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  chipTextoActivo: { color: "#fff" },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#F9FAFB",
  },
  selectorText: { fontSize: 13, color: "#374151", flex: 1 },
  selectorArrow: { fontSize: 11, color: "#6B7280", marginLeft: 8 },
  dropdownList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  dropdownScroll: { maxHeight: 220 },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemActivo: { backgroundColor: "#EEF2FF" },
  dropdownItemText: { fontSize: 13, color: "#374151" },
  dropdownItemTextActivo: { color: "#2f4ea2", fontWeight: "700" },
  precioRow: { flexDirection: "row", gap: 10 },
  precioInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#374151",
    backgroundColor: "#F9FAFB",
  },
  footerBtn: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  aplicarBtn: {
    backgroundColor: "#2f4ea2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  aplicarBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  favoritoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  favoritoBtnActivo: {
    backgroundColor: "#2f4ea2",
    borderColor: "#2f4ea2",
  },
  favoritoBtnText: { fontSize: 13, fontWeight: "700", color: "#2f4ea2" },
  favoritoBtnTextActivo: { color: "#fff" },
  badge: {
    backgroundColor: "#2f4ea2",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  badgeActivo: { backgroundColor: "rgba(255,255,255,0.3)" },
  badgeText: { fontSize: 11, fontWeight: "800", color: "#fff" },
  badgeTextActivo: { color: "#fff" },
});