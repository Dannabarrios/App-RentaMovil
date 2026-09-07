import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { passwordInputStyles as styles } from './PasswordInput.styles';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export function PasswordInput({ label, error, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.contenedor}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.fila, error ? styles.filaError : undefined]}>
        <TextInput
          style={styles.input}
          secureTextEntry={!visible}
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
          autoCapitalize="none"
          {...props}
        />
        <TouchableOpacity
          onPress={() => setVisible(v => !v)}
          style={styles.botonOjo}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.textoError}>{error}</Text> : null}
    </View>
  );
}
