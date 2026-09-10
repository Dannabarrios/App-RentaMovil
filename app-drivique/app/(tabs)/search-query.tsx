// app/(tabs)/search-query.tsx

import BuscadorCatalogo from "@/modules/catalog/components/CatalogSearch";
import { useCatalogo } from "@/modules/catalog/hooks/useCatalog";
import { useAuthStore } from "@/store/authStore";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BusquedaScreen() {
  const usuario = useAuthStore((state) => state.usuario);
  const invitado = !usuario;
  const c = useTemaColores();

  // useFocusEffect asegura que la redirección ocurra inmediatamente el usuario pise la pestaña
  useFocusEffect(
    useCallback(() => {
      if (invitado) {
        // Redirige directamente al catálogo de manera limpia sin dejar historial intermedio
        router.replace("/catalog");
      }
    }, [invitado]),
  );

  // Estados mínimos requeridos para evitar errores de renderizado en el buscador
  const [textBusqueda, setTextBusqueda] = useState("");
  const [modalFormVisible, setModalFormVisible] = useState(false);
  const { busquedaForm, setForm, handleBuscar, errorBusqueda, limpiarBusqueda } = useCatalogo();

  // SI ES INVITADO: Retorna vacío inmediatamente para que no se renderice ni el Buscador ni sus modales
  if (invitado) {
    return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={c.oscuro ? "light-content" : "dark-content"} backgroundColor={c.bgHeader} />

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: c.bgHeader, borderBottomColor: c.border }]}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerUsuario}>
          <Ionicons name="person-circle-outline" size={28} color={c.primary} />
          <Text style={[styles.headerUsuarioNombre, { color: c.primary }]} numberOfLines={1}>
            {usuario?.nombres ?? "Usuario"}
          </Text>
        </View>
      </View>

      {/* HERO */}
      <View style={[styles.hero, { backgroundColor: c.bg }]}>
        <Text style={[styles.heroEyebrow, { color: c.primary }]}>BIENVENIDO</Text>
        <Text style={[styles.heroTitle, { color: c.textPrimary }]}>¿A dónde quieres{"\n"}ir hoy?</Text>
        <Text style={[styles.heroSub, { color: c.textSecondary }]}>
          Encuentra el vehículo perfecto para tu viaje
        </Text>
      </View>

      {/* BUSCADOR */}
      <View style={[styles.buscadorWrap, { borderColor: c.border }]}>
        <BuscadorCatalogo
          form={busquedaForm}
          setForm={setForm}
          textBusqueda={textBusqueda}
          setTextBusqueda={setTextBusqueda}
          onBuscar={handleBuscar}
          onLimpiarBusqueda={limpiarBusqueda}
          errorBusqueda={errorBusqueda}
          disabled={false}
          modalFormVisible={modalFormVisible}
          setModalFormVisible={setModalFormVisible}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  logo: {
    width: 110,
    height: 32,
  },
  headerUsuario: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerUsuarioNombre: {
    fontSize: 13,
    fontWeight: "700",
    maxWidth: 120,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 28,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
    marginBottom: 10,
  },
  heroSub: {
    fontSize: 14,
    fontWeight: "500",
  },
  buscadorWrap: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
});
