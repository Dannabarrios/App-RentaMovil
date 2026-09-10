import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { AlertModal } from "@/components/ui/AlertModal";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import { useNotificationStore } from "@/store/notificationStore";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({ name, focused, c }: { name: IoniconName; focused: boolean; c: ReturnType<typeof useTemaColores> }) {
  return (
    <View style={styles.iconWrap}>
      <Ionicons
        name={focused ? name : (`${name}-outline` as IoniconName)}
        size={22}
        color={focused ? (c.oscuro ? "#60A5FA" : "#2f4ea2") : c.textMuted}
      />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const [alertVisible, setAlertVisible] = useState(false);
  const c = useTemaColores();
  const { t } = useTranslation();
  const unreadCount = useNotificationStore((s) => s.notificaciones.filter((n) => !n.leido).length);

  const tabBarHeight =
    Platform.OS === "android" ? 58 + insets.bottom : 60 + insets.bottom;

  const activeColor = c.oscuro ? "#60A5FA" : "#2f4ea2";

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: c.textMuted,
          tabBarItemStyle: {
            backgroundColor: "transparent",
          },
          tabBarButton: (props) => (
            <Pressable
              {...props}
              android_ripple={{ color: "transparent" }}
              style={props.style}
            />
          ),
          // En modo invitado no hay tabs reales a las que navegar (Mis
          // reservas y Perfil están bloqueadas detrás de login, y mostrar
          // la barra completa hace creer que hay una sesión iniciada).
          // Se oculta del todo; el catálogo queda como única pantalla
          // accesible, con sus propios botones de Ingresar/Registrarme.
          tabBarStyle: usuario
            ? {
                backgroundColor: c.bgCard,
                borderTopColor: c.border,
                borderTopWidth: 1,
                height: tabBarHeight,
                paddingBottom:
                  Platform.OS === "android" ? insets.bottom + 4 : insets.bottom + 8,
                paddingTop: 6,
                elevation: 12,
                shadowColor: c.oscuro ? "#000" : "#000",
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: c.oscuro ? 0.3 : 0.06,
                shadowRadius: 8,
              }
            : { display: "none" },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="catalog"
          options={{
            title: t("tabs.inicio"),
            tabBarIcon: ({ focused }) => <TabIcon name="car" focused={focused} c={c} />,
          }}
        />

        {/* Antes "Reservar" — ahora "Mis reservas": historial de reservas
            ya hechas. Siempre visible en la barra; si el invitado la toca,
            se intercepta la navegación y se muestra el AlertModal en vez
            de dejarlo entrar. */}
        <Tabs.Screen
          name="my-bookings"
          options={{
            title: t("tabs.misReservas"),
            tabBarIcon: ({ focused }) => (
              <TabIcon name="receipt" focused={focused} c={c} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              if (!usuario) {
                e.preventDefault();
                setAlertVisible(true);
              }
            },
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: t("tabs.perfil"),
            tabBarIcon: ({ focused }) => (
              <TabIcon name="person" focused={focused} c={c} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: t("tabs.mas"),
            tabBarIcon: ({ focused }) => (
              <TabIcon name="menu" focused={focused} c={c} />
            ),
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          }}
        />

        <Tabs.Screen name="reserve" options={{ href: null }} />
        <Tabs.Screen name="support" options={{ href: null }} />
        <Tabs.Screen name="favorites" options={{ href: null }} />

        {/* Pantallas sin tab */}
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="search-query" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />

      </Tabs>

      <AlertModal
        visible={alertVisible}
        icono="lock-closed-outline"
        titulo={t("tabs.alertaMisReservasTitulo")}
        mensaje={t("tabs.alertaMisReservasMensaje")}
        botones={[
          {
            texto: t("catalogo.alertas.cancelar"),
            variante: "secundario",
            onPress: () => setAlertVisible(false),
          },
          {
            texto: t("catalogo.alertas.iniciarSesion"),
            variante: "primario",
            onPress: () => {
              setAlertVisible(false);
              router.push("/(auth)/login");
            },
          },
        ]}
        onCerrar={() => setAlertVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});