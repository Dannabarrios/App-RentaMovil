// app/(auth)/login.tsx

import { AlertModal } from "@/components/ui/AlertModal";
import { InputField } from "@/components/ui/InputField";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { GRADIENTES } from "@/constants/gradients";
import { SocialAuthButtons } from "@/modules/auth/components/SocialAuthButtons";
import { useLogin } from "@/modules/auth/hooks/useAuth";
import { loginStyles as styles } from "@/modules/auth/styles/login.styles";
import { useAuthStore } from "@/store/authStore";
import { useUsuarioStore } from "@/store/userStore";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Tab = "login" | "bienvenida";

const ICONOS_ACCESOS: { icono: string }[] = [
  { icono: "calendar" },
  { icono: "card" },
  { icono: "document-text" },
];

export default function LoginScreen() {
  const { t } = useTranslation();
  const c = useTemaColores();
  const ACCESOS = [
    { icono: ICONOS_ACCESOS[0].icono, texto: t("auth.login.accesoMisReservas") },
    { icono: ICONOS_ACCESOS[1].icono, texto: t("auth.login.accesoMisPagos") },
    { icono: ICONOS_ACCESOS[2].icono, texto: t("auth.login.accesoMisContratos") },
  ];
  const BENEFICIOS = [
    t("auth.login.beneficio1"),
    t("auth.login.beneficio2"),
    t("auth.login.beneficio3"),
  ];
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("login");
  const { form, errores, cargando, bloqueado, actualizarCampo, iniciarSesion } =
    useLogin();
  const setUsuario = useAuthStore((s) => s.setUsuario);
  const actualizarUsuarioGlobal = useUsuarioStore((s) => s.actualizarUsuario);
  const errorGlobal = errores.find((e) => !e.campo)?.mensaje;
  const [loginExitoso, setLoginExitoso] = useState(false);

  // ── Toast para restablecimiento de contraseña ─────────────────
  const { success } = useLocalSearchParams<{ success?: string }>();
  const [toastVisible, setToastVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (success === "password_reset") {
      setToastVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setToastVisible(false));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [success, fadeAnim]);

  // ── Control de las alertas tipo modal ─────────────────────────
  const [alertaErrorVisible, setAlertaErrorVisible] = useState(false);
  const [alertaExitoVisible, setAlertaExitoVisible] = useState(false);

  useEffect(() => {
    if (errorGlobal && !loginExitoso) {
      setAlertaErrorVisible(true);
    }
  }, [errorGlobal, loginExitoso]);

  useEffect(() => {
    if (loginExitoso) {
      setAlertaExitoVisible(true);
    }
  }, [loginExitoso]);

  function handleLogin() {
    iniciarSesion((usuarioEncontrado) => {
      setUsuario(
        {
          id: usuarioEncontrado.id,
          correo: usuarioEncontrado.correo,
          nombres: usuarioEncontrado.nombres,
          apellidos: usuarioEncontrado.apellidos,
          rol: usuarioEncontrado.rol,
          activo: usuarioEncontrado.activo,
          permisosValidos: usuarioEncontrado.permisosValidos,
          sucursalId: usuarioEncontrado.sucursalId,
          sucursalNombre: usuarioEncontrado.sucursalNombre,
        },
        "token-demo",
      );
      actualizarUsuarioGlobal({
        id: usuarioEncontrado.id,
        correo: usuarioEncontrado.correo,
        nombres: usuarioEncontrado.nombres,
        apellidos: usuarioEncontrado.apellidos,
      });

      setLoginExitoso(true);

      setTimeout(() => {
        router.replace("/(tabs)/catalog");
      }, 1200);
    });
  }

  function handleInvitado() {
    router.replace("/(tabs)/catalog");
  }

  return (
    <View style={[styles.flex, { backgroundColor: c.oscuro ? c.bg : "#F9FAFB" }]}>
      <StatusBar
        barStyle={c.oscuro ? "light-content" : "dark-content"}
        backgroundColor={c.bgHeader}
        translucent={true}
      />

      {/* ── Toast de éxito (Restablecer contraseña) ── */}
      {toastVisible && (
        <Animated.View style={[
          styles.toastContainer, 
          { opacity: fadeAnim, top: insets.top + 10, backgroundColor: '#10B981' }
        ]}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.toastText}>{t("auth.login.toastContrasenaActualizada")}</Text>
        </Animated.View>
      )}

      <View style={{ height: insets.top, backgroundColor: c.bgHeader }} />
      
      {/* ── TOP BAR (Como en catálogo) ── */}
      <View style={[styles.topBar, { backgroundColor: c.bgHeader, borderBottomColor: c.border }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: c.oscuro ? "#60A5FA" : "#1E40AF" }]}>Drivique</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.guestBtn,
            {
              borderColor: c.oscuro ? "#3B82F6" : "#1E40AF",
              backgroundColor: c.oscuro ? c.bgCard : "transparent",
            },
          ]}
          onPress={handleInvitado}
        >
          <Text style={[styles.guestBtnTexto, { color: c.oscuro ? "#60A5FA" : "#1E40AF" }]}>{t("auth.login.modoInvitado")}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <ScrollView
          contentContainerStyle={styles.scrollContenedor}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <View>
            <LinearGradient
              colors={c.oscuro ? [c.bg, c.bg] : GRADIENTES.heroOscuro.colors}
              locations={c.oscuro ? [0, 1] : GRADIENTES.heroOscuro.locations}
              start={c.oscuro ? { x: 0, y: 0 } : GRADIENTES.heroOscuro.start}
              end={c.oscuro ? { x: 0, y: 1 } : GRADIENTES.heroOscuro.end}
              style={[
                styles.header,
                c.oscuro && { borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border }
              ]}
            >
              <Text style={[styles.marcaTagline, { color: c.oscuro ? c.textSecondary : "#93A5D1" }]}>
                {t("auth.login.tagline")}
              </Text>

              {/* SWITCH DE PESTAÑAS */}
              <View style={[styles.tabsWrapper, { backgroundColor: c.oscuro ? c.bgInput : "rgba(255,255,255,0.08)", borderColor: c.border, borderWidth: c.oscuro ? 1 : 0 }]}>
                <TouchableOpacity
                  style={[
                    styles.tabBtn,
                    tab === "login" && styles.tabBtnActivo,
                    tab === "login" && { backgroundColor: c.oscuro ? c.bgCard : "#FFFFFF" },
                  ]}
                  onPress={() => setTab("login")}
                >
                  <Text
                    style={[
                      styles.tabBtnTexto,
                      { color: c.oscuro ? c.textSecondary : "#B9C4E8" },
                      tab === "login" && styles.tabBtnTextoActivo,
                      tab === "login" && { color: c.oscuro ? c.textPrimary : "#1E3A8A" },
                    ]}
                  >
                    {t("auth.login.tabIniciarSesion")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tabBtn,
                    tab === "bienvenida" && styles.tabBtnActivo,
                    tab === "bienvenida" && { backgroundColor: c.oscuro ? c.bgCard : "#FFFFFF" },
                  ]}
                  onPress={() => setTab("bienvenida")}
                >
                  <Text
                    style={[
                      styles.tabBtnTexto,
                      { color: c.oscuro ? c.textSecondary : "#B9C4E8" },
                      tab === "bienvenida" && styles.tabBtnTextoActivo,
                      tab === "bienvenida" && { color: c.oscuro ? c.textPrimary : "#1E3A8A" },
                    ]}
                  >
                    {t("auth.login.tabBienvenida")}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* CUERPO CON CARD FLOTANTE */}
            <View style={[styles.cuerpo, { backgroundColor: c.oscuro ? c.bg : "#F9FAFB" }]}>
              {tab === "login" ? (
                <View style={styles.cardWrapper}>
                  {/* LOGO REMOVED AS PER USER REQUEST */}

                  <View style={[
                    styles.card, 
                    { backgroundColor: c.bgCard },
                    c.oscuro && { borderWidth: 1, borderColor: c.border }
                  ]}>
                    <View style={styles.encabezado}>
                      <Text style={[styles.titulo, { color: c.textPrimary }]}>{t("auth.login.titulo")}</Text>
                      <Text style={[styles.subtitulo, { color: c.textSecondary }]}>
                        {t("auth.login.ingresaCredenciales")}
                      </Text>
                    </View>

                    <View style={styles.formulario}>
                      <InputField
                        label={`${t("auth.login.correo")} *`}
                        placeholder={t("auth.login.placeholderCorreo")}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={form.correo}
                        onChangeText={(val) => actualizarCampo("correo", val)}
                        colores={c}
                        error={
                          errores.find((e) => e.campo === "correo")?.mensaje
                        }
                      />
                      <PasswordInput
                        label={`${t("auth.login.contrasena")} *`}
                        placeholder={t("auth.login.contrasena")}
                        value={form.contrasena}
                        onChangeText={(val) =>
                          actualizarCampo("contrasena", val)
                        }
                        error={
                          errores.find((e) => e.campo === "contrasena")?.mensaje
                        }
                      />
                      <TouchableOpacity
                        onPress={() => router.push("/(auth)/forgot-password")}
                        style={styles.enlaceOlvide}
                      >
                        <Text style={[styles.textoEnlace, { color: c.oscuro ? "#60A5FA" : "#1D4ED8" }]}>
                          {t("auth.login.olvidaste")}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.acciones}>
                      <PrimaryButton
                        titulo={
                          bloqueado
                            ? t("auth.login.bloqueado")
                            : t("auth.login.iniciarSesion")
                        }
                        onPress={handleLogin}
                        cargando={cargando}
                        deshabilitado={bloqueado || cargando}
                      />

                      {bloqueado ? (
                        <Text style={styles.hintBloqueado}>
                          {t("auth.login.hintBloqueado")}
                        </Text>
                      ) : null}

                      <SocialAuthButtons
                        onGoogle={() => {}}
                        onFacebook={() => {}}
                      />
                    </View>

                    <View style={styles.registroRow}>
                      <Text style={[styles.registroTexto, { color: c.textSecondary }]}>
                        {t("auth.login.noTienesCuenta")}
                      </Text>
                      <TouchableOpacity
                        onPress={() => router.push("/(auth)/register")}
                      >
                        <Text style={[styles.registroLink, { color: c.oscuro ? "#60A5FA" : "#1D4ED8" }]}>
                          {t("auth.login.registrateAqui")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.cardWrapper}>
                  <View style={[
                    styles.card, 
                    styles.cardBienvenida, 
                    { backgroundColor: c.bgCard },
                    c.oscuro && { borderWidth: 1, borderColor: c.border }
                  ]}>
                    <View style={styles.encabezado}>
                      <Text style={[styles.subtituloBienvenida, { color: c.textSecondary }]}>
                        {t("auth.login.gestionaDesde")}
                      </Text>
                    </View>

                    <View style={styles.accesosRow}>
                      {ACCESOS.map((a) => (
                          <TouchableOpacity
                            key={a.texto}
                            style={[styles.accesoBtnBienvenida, { backgroundColor: c.bgCard, borderColor: c.border }]}
                            onPress={() => setTab("login")}
                          >
                            <Ionicons
                              name={a.icono as any}
                              size={24}
                              color={c.primary}
                            />
                            <Text style={[styles.accesoBtnTextoBienvenida, { color: c.oscuro ? c.textPrimary : c.primary }]}>{a.texto}</Text>
                          </TouchableOpacity>
                      ))}
                    </View>

                    <View style={[styles.dividerBienvenida, { backgroundColor: c.border }]} />

                    <View style={styles.beneficiosColBienvenida}>
                      {BENEFICIOS.map((b) => (
                        <View key={b} style={styles.beneficioRow}>
                          <Ionicons name="checkmark-sharp" size={18} color={c.oscuro ? "#60A5FA" : "#2563EB"} />
                          <Text style={[styles.beneficioTextoBienvenida, { color: c.textPrimary }]}>
                            {b}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* FOOTER */}
          <View style={[styles.footer, { backgroundColor: c.oscuro ? c.bg : "#F9FAFB" }]}>
            <Text style={[styles.footerTexto, { color: c.textSecondary }]}>{t("auth.login.footerDerechos")}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ height: insets.bottom, backgroundColor: c.oscuro ? c.bg : "#F9FAFB" }} />

      {/* ── ALERTA DE ERROR (mismo diseño y color que catálogo) ── */}
      <AlertModal
        visible={alertaErrorVisible}
        icono="alert-circle-outline"
        titulo={t("auth.login.errorTitulo")}
        mensaje={errorGlobal ?? t("auth.login.errorMensajeDefault")}
        botones={[
          {
            texto: t("catalogo.alertas.entendido"),
            variante: "primario",
            onPress: () => setAlertaErrorVisible(false),
          },
        ]}
        onCerrar={() => setAlertaErrorVisible(false)}
      />

      {/* ── ALERTA DE ÉXITO (mismo diseño y color que catálogo) ── */}
      <AlertModal
        visible={alertaExitoVisible}
        icono="checkmark-circle-outline"
        titulo={t("auth.login.exitoTitulo")}
        mensaje={t("auth.login.exitoMsg")}
        botones={[]}
        onCerrar={() => setAlertaExitoVisible(false)}
      />
    </View>
  );
}
