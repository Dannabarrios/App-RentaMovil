import { InputField } from "@/components/ui/InputField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { OtpInput } from "@/components/ui/OtpInput";
import { PasswordRequirements } from "@/modules/auth/components/PasswordRequirements";
import { useOlvideContrasena } from "@/modules/auth/hooks/useAuth";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTemaColores } from "@/modules/i18n/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import {
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { olvideStyles as styles } from "@/modules/auth/styles/forgot-password.styles";

const SEGUNDOS_ESPERA = 300;

export default function OlvideContrasenaScreen() {
  const { t } = useTranslation();
  const c = useTemaColores();
  const { form, errores, cargando, fase, actualizarCampo, enviarEnlace, validarCodigo, cambiarContrasena } =
    useOlvideContrasena();

  const [contador, setContador] = useState(0);
  const [puedeReenviar, setPuedeReenviar] = useState(false);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (fase === 2) {
      iniciarContador();
    }
    return limpiarContador;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  function iniciarContador() {
    setContador(SEGUNDOS_ESPERA);
    setPuedeReenviar(false);
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    intervaloRef.current = setInterval(() => {
      setContador((prev) => {
        if (prev <= 1) {
          limpiarContador();
          setPuedeReenviar(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function limpiarContador() {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  }

  function handleReenviar() {
    // Aquí podrías disparar enviarEnlace nuevamente si es necesario, 
    // pero como mínimo reiniciamos el contador:
    iniciarContador();
  }

  // Formato mm:ss para el contador
  const min = Math.floor(contador / 60);
  const sec = contador % 60;
  const tiempoFormateado = `${min}:${sec < 10 ? '0' : ''}${sec}`;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: c.oscuro ? c.bg : "#F9FAFB" }]}
      behavior="padding"
    >
      <ScrollView
        contentContainerStyle={styles.contenedor}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {fase === 1 && (
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(auth)/login");
              }
            }}
            style={[
              styles.botonVolver, 
              c.oscuro && { backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }
            ]}
          >
            <Feather name="arrow-left" size={18} color={c.textPrimary} />
            <Text style={[styles.textoVolver, { color: c.textPrimary }]}>{t("auth.olvide.volver")}</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.tarjeta, { backgroundColor: c.bgCard }]}>
          <View style={styles.logoWrapper}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
            />
          </View>
          
          {fase === 1 && (
            <Text style={[styles.titulo, { color: c.textPrimary }]}>{t("auth.olvide.titulo")}</Text>
          )}
          {fase === 2 && (
            <Text style={[styles.titulo, { color: c.textPrimary }]}>{t("auth.olvide.codigoTitulo")}</Text>
          )}
          {fase === 3 && (
            <Text style={[styles.titulo, { color: c.textPrimary }]}>{t("auth.olvide.nuevaContraTitulo")}</Text>
          )}

          {fase === 1 && (
            <Text style={[styles.subtitulo, { color: c.textSecondary }]}>{t("auth.olvide.subtitulo")}</Text>
          )}
          {fase === 2 && (
            <Text style={[styles.subtitulo, { color: c.textSecondary }]}>{t("auth.olvide.codigoSubtitulo")} <Text style={{fontWeight: '700', color: c.textPrimary}}>{form.correo}</Text></Text>
          )}
          {fase === 3 && (
            <Text style={[styles.subtitulo, { color: c.textSecondary }]}>{t("auth.olvide.nuevaContraSubtitulo")}</Text>
          )}

          <View style={styles.formulario}>
            {fase === 1 && (
              <>
                <InputField
                  label={t("auth.olvide.correo")}
                  placeholder="ejemplo@correo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.correo}
                  onChangeText={(val) => actualizarCampo('correo', val)}
                  colores={c}
                  error={errores.find((e) => e.campo === "correo")?.mensaje}
                />
                <PrimaryButton
                  titulo={t("auth.olvide.btnEnviar")}
                  onPress={enviarEnlace}
                  cargando={cargando}
                  redondeado
                />
              </>
            )}

            {fase === 2 && (
              <>
                  <OtpInput
                  value={form.codigo || ""}
                  onChange={(val) => actualizarCampo('codigo', val)}
                  error={!!errores.find((e) => e.campo === "codigo")}
                  colores={{
                    border: c.border,
                    bgInput: c.bgInput,
                    textPrimary: c.textPrimary,
                    primary: c.primary
                  }}
                />
                {errores.find((e) => e.campo === "codigo") && (
                  <Text style={[styles.textoContador, { color: '#EF4444' }]}>
                    {errores.find((e) => e.campo === "codigo")?.mensaje}
                  </Text>
                )}
                
                <PrimaryButton
                  titulo={t("auth.olvide.btnContinuar")}
                  onPress={validarCodigo}
                  cargando={cargando}
                  redondeado
                  estiloExtra={{ marginTop: 24 }}
                />

                <View style={styles.contenedorReenvio}>
                  <Text style={[styles.textoReenvio, { color: c.textSecondary }]}>{t("auth.olvide.noRecibiste")}</Text>
                  {puedeReenviar ? (
                    <TouchableOpacity style={styles.botonReenvio} onPress={handleReenviar}>
                      <Text style={[styles.textoBotonReenvio, { color: c.primary }]}>{t("auth.olvide.reenviar")}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.textoContador, { color: c.textSecondary }]}>
                      {t("auth.olvide.reenviarEn", { tiempo: tiempoFormateado })}
                    </Text>
                  )}
                </View>
              </>
            )}

            {fase === 3 && (
              <>
                <PasswordInput
                  label={t("auth.olvide.nuevaContra")}
                  placeholder="********"
                  value={form.nuevaContrasena || ''}
                  onChangeText={(val) => actualizarCampo('nuevaContrasena', val)}
                  error={errores.find((e) => e.campo === "nuevaContrasena")?.mensaje}
                />
                <PasswordRequirements password={form.nuevaContrasena || ''} />
                <PasswordInput
                  label={t("auth.olvide.confirmarContra")}
                  placeholder="********"
                  value={form.confirmarContrasena || ''}
                  onChangeText={(val) => actualizarCampo('confirmarContrasena', val)}
                  error={errores.find((e) => e.campo === "confirmarContrasena")?.mensaje}
                />
                <PrimaryButton
                  titulo={t("auth.olvide.btnRestablecer")}
                  onPress={() => cambiarContrasena(() => {
                    router.replace({ pathname: "/(auth)/login", params: { success: "password_reset" } });
                  })}
                  cargando={cargando}
                  redondeado
                  estiloExtra={{ marginTop: 12 }}
                />
              </>
            )}
          </View>
        </View>

        {fase === 1 && (
          <View style={styles.contenedorRegistro}>
            <Text style={[styles.textoRegistroGris, { color: c.textSecondary }]}>{t("auth.olvide.noTienes")}</Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={[styles.textoRegistroAzul, { color: c.primary }]}>{t("auth.olvide.registrateAqui")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
