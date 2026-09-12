import { StyleSheet } from 'react-native';

export const inputFieldStyles = StyleSheet.create({
  contenedor: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    height: 52,
  },
  pillWrapper: {
    borderRadius: 26,
  },
  iconContainer: {
    marginRight: 4,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#111827',
  },
  inputErrorWrapper: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  textoError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});
