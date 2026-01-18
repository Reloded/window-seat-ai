import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export function SettingsInput({
  label,
  description,
  value,
  onValueChange,
  placeholder,
  secureTextEntry = true,
  isLast
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [showValue, setShowValue] = useState(false);

  const handleSave = () => {
    onValueChange(localValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalValue(value);
    setIsEditing(false);
  };

  const getMaskedValue = () => {
    if (!value) return 'Not set';
    if (showValue) return value;
    return '••••••••••••' + value.slice(-4);
  };

  return (
    <View style={[styles.container, !isLast && styles.border]}>
      <View style={styles.header}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {description && (
            <Text style={styles.description}>{description}</Text>
          )}
        </View>
        {!isEditing && value && secureTextEntry && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowValue(!showValue)}
          >
            <Text style={styles.toggleText}>{showValue ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.input}
            value={localValue}
            onChangeText={setLocalValue}
            placeholder={placeholder}
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={secureTextEntry && !showValue}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.valueContainer}
          onPress={() => {
            setLocalValue(value);
            setIsEditing(true);
          }}
        >
          <Text style={[styles.value, !value && styles.valuePlaceholder]}>
            {getMaskedValue()}
          </Text>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  toggleButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toggleText: {
    color: '#00d4ff',
    fontSize: 14,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  valuePlaceholder: {
    fontStyle: 'italic',
  },
  editText: {
    color: '#00d4ff',
    fontSize: 14,
  },
  editContainer: {
    marginTop: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#00d4ff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  saveText: {
    color: '#0a1628',
    fontSize: 14,
    fontWeight: '600',
  },
});
