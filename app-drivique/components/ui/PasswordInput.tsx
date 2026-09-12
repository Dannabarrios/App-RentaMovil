import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTemaColores } from '@/modules/i18n/hooks/useLanguage';
import { passwordInputStyles as styles } from './PasswordInput.styles';

interface ColoresTema {
  textSecondary: string;
  border: string;
  bgInput: string;
  textPrimary: string;
}

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  colores?: ColoresTema;
}

export function PasswordInput({ label, error, style, placeholderTextColor, colores: cProp, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const cTema = useTemaColores();
  const c = cProp || cTema;

  const colorPlaceholder = placeholderTextColor || (cTema.oscuro ? '#94A3B8' : '#64748B');

  return (
    <View style={styles.contenedor}>
      {label ? <Text style={[styles.label, { color: c.textPrimary }]}>{label}</Text> : null}
      <View
        style={[
          styles.fila,
          {
            backgroundColor: cTema.oscuro ? c.bgInput : '#F9FAFB',
            borderColor: error ? '#EF4444' : c.border,
          },
          error ? styles.filaError : undefined,
        ]}
      >
        <TextInput
          style={[styles.input, { color: c.textPrimary }, style]}
          secureTextEntry={!visible}
          placeholderTextColor={colorPlaceholder}
          autoCorrect={false}
          autoCapitalize="none"
          {...props}
        />
        <TouchableOpacity
          onPress={() => setVisible((v) => !v)}
          style={styles.botonOjo}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={cTema.oscuro ? '#94A3B8' : '#64748B'}
          />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.textoError}>{error}</Text> : null}
    </View>
  );
}
