import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useCompletarPerfil } from "@/modules/profile/hooks/useProfile";
import { Nacionalidad, TipoDocumento } from "@/modules/profile/types/profile.types";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { InputField } from "@/components/ui/InputField";
import { inputFieldStyles } from "@/components/ui/InputField.styles";
import { DateField } from "@/components/ui/DateField";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { getPrefijoPorNacionalidad } from "@/modules/reservation/constants/reservation.constants";

const TIPOS_DOCUMENTO: TipoDocumento[] = ["CC", "TI", "Doc. Extranjero", "Pasaporte"];

const NACIONALIDADES: { valor: Nacionalidad; bandera: string }[] = [
  { valor: "Colombia",  bandera: "🇨🇴" },
  { valor: "USA",       bandera: "🇺🇸" },
  { valor: "Francia",   bandera: "🇫🇷" },
  { valor: "Portugal",  bandera: "🇵🇹" },
  { valor: "Brasil",    bandera: "🇧🇷" },
];

interface Props {
  onGuardado: () => void;
}

export function FormCompletarPerfil({ onGuardado }: Props) {
  const { t } = useTranslation();
  const c = useTemaColores();
  const { form, errores, cargando, actualizarCampo, guardar } = useCompletarPerfil();
  const [showTipoDoc, setShowTipoDoc] = useState(false);
  const [showNacionalidad, setShowNacionalidad] = useState(false);
  const prefijoTelefono = getPrefijoPorNacionalidad(form.nacionalidad || null);
  const hayPrefijo = prefijoTelefono !== "";

  const handleGuardar = () => {
    guardar(
      () => {
        Alert.alert(
          t("perfil.cambiosGuardados"),
          t("perfil.cambiosGuardadosMsg"),
          [{ text: t("perfil.ok"), onPress: onGuardado }]
        );
      },
      () => {
        Alert.alert(t("perfil.errorTitulo"), t("perfil.errorMsg"), [
          { text: t("perfil.errorBtn") },
        ]);
      }
    );
  };

  const colores = {
    textSecondary: c.textSecondary,
    border: c.border,
    bgInput: c.bgInput,
    textPrimary: c.textPrimary,
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Intro */}
      <View style={s.intro}>
        <View style={[s.introIconWrap, { backgroundColor: c.primaryBg }]}>
          <Ionicons name="person-circle-outline" size={30} color="#1D4ED8" />
        </View>
        <Text style={[s.introTitulo, { color: c.textPrimary }]}>{t("perfil.completarPerfil")}</Text>
        <Text style={[s.introSub, { color: c.textSecondary }]}>{t("perfil.completarPerfilSub")}</Text>
      </View>

      <SectionLabel icono="person-outline" texto={t("perfil.datosPersonales")} primaryBg={c.primaryBg} />

      <InputField
        label={t("perfil.nombres")}
        placeholder="Ej: Laura Vanessa"
        autoCapitalize="words"
        value={form.nombres}
        onChangeText={v => actualizarCampo("nombres", v)}
        error={errores.nombres}
        colores={colores}
      />
      <InputField
        label={t("perfil.apellidos")}
        placeholder="Ej: Pérez Perdomo"
        autoCapitalize="words"
        value={form.apellidos}
        onChangeText={v => actualizarCampo("apellidos", v)}
        error={errores.apellidos}
        colores={colores}
      />

      {/* Nacionalidad (primero, para poder derivar el prefijo del teléfono) */}
      <Text style={[s.label, { color: c.textSecondary }]}>{t("perfil.nacionalidad")}</Text>
      <TouchableOpacity
        style={[s.selector, { borderColor: errores.nacionalidad ? "#EF4444" : c.border, backgroundColor: c.bgInput }]}
        onPress={() => setShowNacionalidad(v => !v)}
        activeOpacity={0.7}
      >
        <Text style={[s.selectorText, { color: form.nacionalidad ? c.textPrimary : "#9CA3AF" }]}>
          {form.nacionalidad
            ? `${NACIONALIDADES.find(n => n.valor === form.nacionalidad)?.bandera} ${form.nacionalidad}`
            : t("perfil.seleccionar")}
        </Text>
        <Ionicons name={showNacionalidad ? "chevron-up" : "chevron-down"} size={16} color={c.textSecondary} />
      </TouchableOpacity>
      {showNacionalidad && (
        <View style={[s.dropdown, { borderColor: c.border, backgroundColor: c.bgCard }]}>
          {NACIONALIDADES.map(({ valor, bandera }) => (
            <TouchableOpacity
              key={valor}
              style={[s.dropdownItem, form.nacionalidad === valor && { backgroundColor: c.primaryBg }]}
              onPress={() => { actualizarCampo("nacionalidad", valor); setShowNacionalidad(false); }}
              activeOpacity={0.7}
            >
              <Text style={[s.dropdownText, { color: form.nacionalidad === valor ? "#1D4ED8" : c.textPrimary }]}>
                {bandera} {valor}
              </Text>
              {form.nacionalidad === valor && (
                <Ionicons name="checkmark-circle" size={18} color="#1D4ED8" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
      {errores.nacionalidad && <Text style={s.error}>{errores.nacionalidad}</Text>}

      <SectionLabel icono="call-outline" texto={t("perfil.seccionContacto")} primaryBg={c.primaryBg} />

      {/* Teléfono: el prefijo del país se completa solo según la nacionalidad elegida arriba */}
      <Text style={[s.label, { color: c.textSecondary }]}>{t("perfil.telefono")}</Text>
      <View style={s.filaCelular}>
        <View
          style={[
            s.prefijoBox,
            { backgroundColor: c.primaryBg, borderColor: c.border },
            !hayPrefijo && { backgroundColor: c.oscuro ? "#1F2937" : "#F3F4F6" },
          ]}
        >
          <Text style={[s.prefijoText, { color: "#1D4ED8" }, !hayPrefijo && { color: c.textMuted }]}>
            {hayPrefijo ? prefijoTelefono : ""}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            style={[
              inputFieldStyles.input,
              { borderColor: c.border, backgroundColor: c.bgInput, color: c.textPrimary },
              errores.telefono ? inputFieldStyles.inputErrorWrapper : undefined,
              !hayPrefijo ? { backgroundColor: c.oscuro ? "#1F2937" : "#F3F4F6", color: c.textMuted } : undefined,
            ]}
            placeholder="1234567890"
            placeholderTextColor="#9CA3AF"
            autoCorrect={false}
            keyboardType="phone-pad"
            value={form.telefono}
            onChangeText={v => actualizarCampo("telefono", v.replace(/\D/g, ""))}
            editable={hayPrefijo}
          />
          {errores.telefono && <Text style={s.error}>{errores.telefono}</Text>}
        </View>
      </View>

      <SectionLabel icono="card-outline" texto={t("perfil.seccionDocumento")} primaryBg={c.primaryBg} />

      <DateField
        label={t("perfil.fechaNac")}
        value={form.fechaNacimiento}
        onChange={(valor) => actualizarCampo("fechaNacimiento", valor)}
        error={errores.fechaNacimiento}
        placeholder={t("perfil.seleccionar")}
        maximumDate={new Date()}
        colores={c}
      />

      {/* Tipo de documento */}
      <Text style={[s.label, { color: c.textSecondary }]}>{t("perfil.tipoDocumento")}</Text>
      <TouchableOpacity
        style={[s.selector, { borderColor: errores.tipoDocumento ? "#EF4444" : c.border, backgroundColor: c.bgInput }]}
        onPress={() => setShowTipoDoc(v => !v)}
        activeOpacity={0.7}
      >
        <Text style={[s.selectorText, { color: form.tipoDocumento ? c.textPrimary : "#9CA3AF" }]}>
          {form.tipoDocumento
            ? t(`reserva.datosPersonales.tiposDocumento.${form.tipoDocumento === "Doc. Extranjero" ? "DocExtranjero" : form.tipoDocumento}`, { defaultValue: form.tipoDocumento })
            : t("perfil.seleccionar")}
        </Text>
        <Ionicons name={showTipoDoc ? "chevron-up" : "chevron-down"} size={16} color={c.textSecondary} />
      </TouchableOpacity>
      {showTipoDoc && (
        <View style={[s.dropdown, { borderColor: c.border, backgroundColor: c.bgCard }]}>
          {TIPOS_DOCUMENTO.map(tipo => (
            <TouchableOpacity
              key={tipo}
              style={[s.dropdownItem, form.tipoDocumento === tipo && { backgroundColor: c.primaryBg }]}
              onPress={() => { actualizarCampo("tipoDocumento", tipo); setShowTipoDoc(false); }}
              activeOpacity={0.7}
            >
              <Text style={[s.dropdownText, { color: form.tipoDocumento === tipo ? "#1D4ED8" : c.textPrimary }]}>
                {t(`reserva.datosPersonales.tiposDocumento.${tipo === "Doc. Extranjero" ? "DocExtranjero" : tipo}`, { defaultValue: tipo })}
              </Text>
              {form.tipoDocumento === tipo && (
                <Ionicons name="checkmark-circle" size={18} color="#1D4ED8" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
      {errores.tipoDocumento && <Text style={s.error}>{errores.tipoDocumento}</Text>}

      <InputField
        label={t("perfil.numeroDocumento")}
        placeholder="Entre 6 y 10 dígitos"
        keyboardType="numeric"
        value={form.numeroDocumento}
        onChangeText={v => actualizarCampo("numeroDocumento", v)}
        error={errores.numeroDocumento}
        colores={colores}
      />

      <View style={{ marginTop: 24 }}>
        <PrimaryButton titulo={t("perfil.guardarDatos")} onPress={handleGuardar} cargando={cargando} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  intro: {
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  introIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  introTitulo: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: "center",
  },
  introSub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  selector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 4,
  },
  selectorText: {
    fontSize: 14,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 4,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: "500",
  },
  error: {
    fontSize: 12,
    color: "#EF4444",
    marginBottom: 8,
    marginTop: 2,
  },
  filaCelular: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginBottom: 4,
  },
  prefijoBox: {
    height: 48,
    minWidth: 52,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  prefijoText: { fontSize: 13, fontWeight: "700" },
  botonConfirmarFecha: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  botonConfirmarFechaTexto: {
    fontSize: 13,
    fontWeight: "700",
  },
});
