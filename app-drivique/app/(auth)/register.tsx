import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTemaColores } from '@/modules/i18n/hooks/useLanguage';
import { useRegistro } from '@/modules/auth/hooks/useAuth';
import { InputField } from '@/components/ui/InputField';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SocialAuthButtons } from '@/modules/auth/components/SocialAuthButtons';
import { PasswordRequirements } from '@/modules/auth/components/PasswordRequirements';
import { registroStyles as styles } from '@/modules/auth/styles/register.styles';
import { GRADIENTES } from '@/constants/gradients';

export default function RegistroScreen() {
  const { t } = useTranslation();
  const c = useTemaColores();
  const insets = useSafeAreaInsets();
  const {
    form,
    cargando,
    actualizarCampo,
    registrar,
    getError,
  } = useRegistro();

  const [modalTerminos, setModalTerminos] = useState(false);
  const [terminosLeidos, setTerminosLeidos] = useState(false);
  const [correoTocado, setCorreoTocado] = useState(false);
  const [modalBienvenida, setModalBienvenida] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setModalBienvenida(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const errorCorreo = getError('correo') ??
    (correoTocado && form.correo.length > 0 && !form.correo.includes('@')
      ? t('auth.registro.errorAt')
      : undefined);

  function handleRegistrar() {
    registrar(
      () => router.replace(`/(auth)/verify-email?correo=${encodeURIComponent(form.correo)}`),
      () => {}
    );
  }

  function handleScrollTerminos(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    if (isAtBottom && !terminosLeidos) {
      setTerminosLeidos(true);
    }
  }

  function handleAceptarTerminos() {
    actualizarCampo('aceptaTerminos', true);
    setModalTerminos(false);
  }

  return (
    <View style={[styles.flex, { backgroundColor: c.oscuro ? c.bg : "#F9FAFB" }]}>
      <View style={{ height: insets.top, backgroundColor: c.bgHeader }} />
      
      {/* ── TOP BAR (Como en login/catálogo) ── */}
      <View style={[styles.topBar, { backgroundColor: c.bgHeader, borderBottomColor: c.border }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleText}>Drivique</Text>
        </View>
        <TouchableOpacity
          style={styles.guestBtn}
          onPress={() => router.replace('/(tabs)/catalog')}
        >
          <Text style={styles.guestBtnTexto}>{t("auth.login.modoInvitado", "Modo Invitado")}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <ScrollView
          style={{ flex: 1 }}
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
              <Text style={[styles.marcaTagline, c.oscuro && { color: c.textSecondary }]}>
                {t("auth.login.tagline", "TU LIBERTAD SOBRE RUEDAS COMIENZA AQUÍ")}
              </Text>
            </LinearGradient>

            {/* CUERPO CON CARD FLOTANTE */}
            <View style={[styles.cuerpo, { backgroundColor: c.oscuro ? c.bg : "#F9FAFB" }]}>
              <View style={styles.cardWrapper}>
                <View style={[
                  styles.card, 
                  { backgroundColor: c.bgCard },
                  c.oscuro && { borderWidth: 1, borderColor: c.border }
                ]}>
                  <View style={styles.encabezado}>
                    <Text style={[styles.titulo, c.oscuro && { color: c.textPrimary }]}>
                      {t('auth.registro.titulo')}
                    </Text>
                    <Text style={[styles.subtitulo, c.oscuro && { color: c.textSecondary }]}>
                      {t('auth.registro.subtitulo')}
                    </Text>
                  </View>

                  <View style={styles.formulario}>
                    <InputField
                      label={t('auth.registro.correo')}
                      placeholder={t('auth.registro.correoPlaceholder', 'Escribe tu correo')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={form.correo}
                      onChangeText={val => actualizarCampo('correo', val)}
                      onBlur={() => setCorreoTocado(true)}
                      colores={c}
                      error={errorCorreo}
                    />
                    <PasswordInput
                      label={t('auth.registro.contrasena')}
                      placeholder={t('auth.registro.contrasenaPlaceholder', 'Escribe tu contraseña')}
                      value={form.contrasena}
                      onChangeText={val => actualizarCampo('contrasena', val)}
                      colores={c}
                      error={getError('contrasena')}
                    />
                    <PasswordRequirements password={form.contrasena} />
                    <PasswordInput
                      label={t('auth.registro.confirmarContrasena')}
                      placeholder={t('auth.registro.confirmarContrasenaPlaceholder', 'Confirma tu contraseña')}
                      value={form.confirmarContrasena}
                      onChangeText={val => actualizarCampo('confirmarContrasena', val)}
                      colores={c}
                      error={getError('confirmarContrasena')}
                    />

                    {/* Términos y condiciones */}
                    <View style={styles.filaTerminosBox}>
                      <TouchableOpacity
                        style={styles.checkboxWrapper}
                        onPress={() => {
                          if (!form.aceptaTerminos) {
                            setModalTerminos(true);
                            setTerminosLeidos(false); // Resetear al abrir
                          } else {
                            actualizarCampo('aceptaTerminos', false);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkbox, form.aceptaTerminos && styles.checkboxActivo]}>
                          {form.aceptaTerminos ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                        </View>
                        <Text style={[styles.textoTerminos, { color: c.textSecondary, flex: 1 }]}>
                          {t('auth.registro.terminosPart1', 'Acepto los ')}
                          <Text style={styles.enlaceTerminos} onPress={() => { setModalTerminos(true); setTerminosLeidos(false); }}>
                            {t('auth.registro.terminosLink1', 'términos y condiciones')}
                          </Text>
                          {t('auth.registro.terminosPart2', ' y el tratamiento de mis datos personales según la ')}
                          <Text style={styles.enlaceTerminos} onPress={() => { setModalTerminos(true); setTerminosLeidos(false); }}>
                            {t('auth.registro.terminosLink2', 'Ley 1581 de 2012.')}
                          </Text>
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {getError('aceptaTerminos') ? (
                      <Text style={styles.errorTerminos}>{getError('aceptaTerminos')}</Text>
                    ) : null}

                    {/* Acciones */}
                    <View style={styles.acciones}>
                      <PrimaryButton
                        titulo={t('auth.registro.btnCrear')}
                        onPress={handleRegistrar}
                        cargando={cargando}
                      />
                      <View style={{ marginTop: 6 }}>
                        <SocialAuthButtons
                          onGoogle={() => console.log('Google registro')}
                          onFacebook={() => console.log('Facebook registro')}
                        />
                      </View>
                    </View>

                    <View style={styles.loginRow}>
                      <Text style={[styles.loginTexto, { color: c.textSecondary }]}>¿Ya tiene una cuenta? </Text>
                      <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                        <Text style={[styles.loginLink, { color: c.primary }]}>Inicie sesión aquí</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modal: Términos y condiciones ──────────────────────── */}
      <Modal visible={modalTerminos} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContenedor, { backgroundColor: c.bgCard }]}>
            <View style={[styles.modalHandle, { backgroundColor: c.border }]} />
            <View style={styles.modalEncabezado}>
              <Text style={[styles.modalTitulo, { color: c.textPrimary }]}>{t('auth.registro.modalTitulo')}</Text>
              <TouchableOpacity
                style={styles.modalBotonCerrar}
                onPress={() => setModalTerminos(false)}
              >
                <Ionicons name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.modalScroll} 
              showsVerticalScrollIndicator={true}
              onScroll={handleScrollTerminos}
              scrollEventThrottle={16}
            >
              <Text style={styles.modalSeccionTitulo}>{t('auth.registro.tc1Titulo')}</Text>
              <Text style={styles.modalTexto}>{t('auth.registro.tc1Texto')}</Text>
              <Text style={styles.modalSeccionTitulo}>{t('auth.registro.tc2Titulo')}</Text>
              <Text style={styles.modalTexto}>{t('auth.registro.tc2Texto')}</Text>
              <Text style={styles.modalSeccionTitulo}>{t('auth.registro.tc3Titulo')}</Text>
              <Text style={styles.modalTexto}>{t('auth.registro.tc3Texto')}</Text>
              <Text style={styles.modalSeccionTitulo}>{t('auth.registro.tc4Titulo')}</Text>
              <Text style={styles.modalTexto}>{t('auth.registro.tc4Texto')}</Text>
              <Text style={styles.modalSeccionTitulo}>{t('auth.registro.tc5Titulo')}</Text>
              <Text style={styles.modalTexto}>{t('auth.registro.tc5Texto')}</Text>
              <Text style={styles.modalSeccionTitulo}>{t('auth.registro.tc6Titulo')}</Text>
              <Text style={styles.modalTexto}>{t('auth.registro.tc6Texto')}</Text>
              <Text style={styles.modalSeccionTitulo}>{t('auth.registro.tc7Titulo')}</Text>
              <Text style={styles.modalTexto}>{t('auth.registro.tc7Texto')}</Text>
              <Text style={styles.modalSeccionTitulo}>{t('auth.registro.tc8Titulo')}</Text>
              <Text style={styles.modalTexto}>{t('auth.registro.tc8Texto')}</Text>
              <Text style={styles.modalSeccionTitulo}>{t('auth.registro.tc9Titulo')}</Text>
              <Text style={styles.modalTexto}>{t('auth.registro.tc9Texto')}</Text>
              <Text style={styles.modalSeccionTitulo}>{t('auth.registro.tc10Titulo')}</Text>
              <Text style={styles.modalTexto}>{t('auth.registro.tc10Texto')}</Text>
              <Text style={styles.modalSeccionTitulo}>{t('auth.registro.tc11Titulo')}</Text>
              <Text style={styles.modalTexto}>{t('auth.registro.tc11Texto')}</Text>
              <Text style={styles.modalSeccionTitulo}>{t('auth.registro.tc12Titulo')}</Text>
              <Text style={styles.modalTexto}>{t('auth.registro.tc12Texto')}</Text>
              <Text style={styles.modalSeccionTitulo}>{t('auth.registro.tc13Titulo')}</Text>
              <Text style={styles.modalTexto}>{t('auth.registro.tc13Texto')}</Text>
              
              {t('auth.registro.tcFooter') !== 'auth.registro.tcFooter' && (
                <Text style={styles.modalFooterTexto}>{t('auth.registro.tcFooter')}</Text>
              )}
            </ScrollView>
            
            <View style={styles.modalBotonesRow}>
              {/* Botón Cerrar Secundario */}
              <TouchableOpacity
                onPress={() => setModalTerminos(false)}
                style={styles.modalBotonCerrarSecundario}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBotonCerrarSecundarioTexto}>
                  Cerrar
                </Text>
              </TouchableOpacity>

              {/* Botón Aceptar Principal */}
              <View style={styles.modalBotonAceptarWrap}>
                <TouchableOpacity
                  onPress={terminosLeidos ? handleAceptarTerminos : undefined}
                  activeOpacity={terminosLeidos ? 0.85 : 1}
                  style={{ width: '100%' }}
                >
                  <LinearGradient
                    colors={terminosLeidos ? GRADIENTES.boton.colors : ['#E5E7EB', '#D1D5DB']}
                    start={GRADIENTES.boton.start}
                    end={GRADIENTES.boton.end}
                    style={styles.modalBotonAceptar}
                  >
                    <Text style={[styles.modalBotonAceptarTexto, !terminosLeidos && { color: '#9CA3AF' }]}>
                      {t('auth.registro.modalAceptar', 'Acepto los términos')}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Bienvenida / Info ──────────────────────── */}
      <Modal visible={modalBienvenida} transparent animationType="fade" onRequestClose={() => setModalBienvenida(false)}>
        <TouchableOpacity 
          style={styles.modalBienvenidaOverlay} 
          activeOpacity={1} 
          onPress={() => setModalBienvenida(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalBienvenidaContenedor, { backgroundColor: c.bgCard }]}>
            <Text style={[styles.modalBienvenidaTitulo, { color: c.textPrimary }]}>
              {t('auth.registro.bienvenidaTitulo')}
            </Text>
            
            <View style={styles.modalBienvenidaLista}>
              <View style={[styles.modalBienvenidaItem, { borderColor: c.oscuro ? '#374151' : '#E5E7EB' }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color={c.primary} style={styles.modalBienvenidaItemIcono} />
                <Text style={[styles.modalBienvenidaItemTexto, { color: c.textPrimary }]}>{t('auth.registro.bienvenidaItem1')}</Text>
              </View>
              <View style={[styles.modalBienvenidaItem, { borderColor: c.oscuro ? '#374151' : '#E5E7EB' }]}>
                <Ionicons name="card-outline" size={20} color={c.primary} style={styles.modalBienvenidaItemIcono} />
                <Text style={[styles.modalBienvenidaItemTexto, { color: c.textPrimary }]}>{t('auth.registro.bienvenidaItem2')}</Text>
              </View>
              <View style={[styles.modalBienvenidaItem, { borderColor: c.oscuro ? '#374151' : '#E5E7EB' }]}>
                <Ionicons name="document-text-outline" size={20} color={c.primary} style={styles.modalBienvenidaItemIcono} />
                <Text style={[styles.modalBienvenidaItemTexto, { color: c.textPrimary }]}>{t('auth.registro.bienvenidaItem3')}</Text>
              </View>
              <View style={[styles.modalBienvenidaItem, { borderColor: c.oscuro ? '#374151' : '#E5E7EB' }]}>
                <Ionicons name="headset-outline" size={20} color={c.primary} style={styles.modalBienvenidaItemIcono} />
                <Text style={[styles.modalBienvenidaItemTexto, { color: c.textPrimary }]}>{t('auth.registro.bienvenidaItem4')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

