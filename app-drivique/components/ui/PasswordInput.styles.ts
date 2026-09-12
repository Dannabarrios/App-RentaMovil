import { StyleSheet } from 'react-native';

export const passwordInputStyles = StyleSheet.create({
  contenedor: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    height: 52,
  },
  filaError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#111827',
  },
  botonOjo: {
    paddingLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  textoError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});
