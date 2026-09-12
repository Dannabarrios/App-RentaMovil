import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { inputFieldStyles as styles } from './InputField.styles';

interface ColoresTema {
  textSecondary: string;
  border: string;
  bgInput: string;
  textPrimary: string;
}

interface Props extends TextInputProps {
  label: string;
  error?: string;
  /** Opcional — si no se pasa, usa los colores fijos de siempre (pensados
   *  para tema claro). Pásalo cuando el formulario deba respetar tema
   *  oscuro/claro (ver CompleteProfileForm.tsx). */
  colores?: ColoresTema;
  iconLeft?: React.ReactNode;
  pill?: boolean;
}

export function InputField({ label, error, colores: c, iconLeft, pill, ...props }: Props) {
  return (
    <View style={styles.contenedor}>
      <Text style={[styles.label, c && { color: c.textPrimary }]}>{label}</Text>
      <View style={[
        styles.inputWrapper,
        c && { borderColor: c.border, backgroundColor: c.bgInput },
        error ? styles.inputErrorWrapper : undefined,
        pill ? styles.pillWrapper : undefined,
      ]}>
        {iconLeft && <View style={styles.iconContainer}>{iconLeft}</View>}
        <TextInput
          style={[
            styles.input,
            c && { color: c.textPrimary },
            iconLeft ? { paddingLeft: 8 } : undefined,
          ]}
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
          {...props}
        />
      </View>
      {error ? <Text style={styles.textoError}>{error}</Text> : null}
    </View>
  );
}
