import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * ErrorBanner - Displays errors prominently with dismiss option
 *
 * @param {Object} props
 * @param {string} props.message - Error message to display
 * @param {string} [props.type] - Error type: 'error' (red), 'warning' (yellow), 'info' (blue)
 * @param {function} props.onDismiss - Callback when user dismisses the error
 * @param {Object} [props.style] - Additional styles
 */
export function ErrorBanner({ message, type = 'error', onDismiss, style }) {
  if (!message) return null;

  const typeStyles = {
    error: {
      background: 'rgba(220, 53, 69, 0.15)',
      border: '#dc3545',
      icon: '!',
    },
    warning: {
      background: 'rgba(255, 193, 7, 0.15)',
      border: '#ffc107',
      icon: '!',
    },
    info: {
      background: 'rgba(0, 212, 255, 0.15)',
      border: '#00d4ff',
      icon: 'i',
    },
  };

  const colors = typeStyles[type] || typeStyles.error;

  const typeLabels = {
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, borderLeftColor: colors.border },
        style,
      ]}
      accessibilityRole="alert"
      accessibilityLabel={`${typeLabels[type] || 'Alert'}: ${message}`}
      accessibilityLiveRegion="assertive"
    >
      <View
        style={[styles.iconContainer, { backgroundColor: colors.border }]}
        accessibilityElementsHidden
      >
        <Text style={styles.icon}>{colors.icon}</Text>
      </View>
      <Text style={styles.message} accessibilityElementsHidden>{message}</Text>
      {onDismiss && (
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={onDismiss}
          accessibilityLabel="Dismiss alert"
          accessibilityRole="button"
        >
          <Text style={styles.dismissText} accessibilityElementsHidden>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 10,
  },
  iconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  icon: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  message: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
  dismissText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ErrorBanner;
