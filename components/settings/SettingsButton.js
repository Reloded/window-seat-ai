import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

export function SettingsButton({
  label,
  onPress,
  variant = 'default', // default, danger, primary
  loading = false,
  disabled = false,
}) {
  const buttonStyle = [
    styles.button,
    variant === 'danger' && styles.buttonDanger,
    variant === 'primary' && styles.buttonPrimary,
    disabled && styles.buttonDisabled,
  ];

  const textStyle = [
    styles.text,
    variant === 'danger' && styles.textDanger,
    variant === 'primary' && styles.textPrimary,
    disabled && styles.textDisabled,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#0a1628' : '#00d4ff'}
        />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 4,
  },
  buttonDanger: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  buttonPrimary: {
    backgroundColor: '#00d4ff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    color: '#00d4ff',
    fontSize: 16,
    fontWeight: '600',
  },
  textDanger: {
    color: '#ff453a',
  },
  textPrimary: {
    color: '#0a1628',
  },
  textDisabled: {
    opacity: 0.7,
  },
});
