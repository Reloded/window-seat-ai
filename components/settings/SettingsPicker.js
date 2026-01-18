import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { SettingsRow } from './SettingsRow';

export function SettingsPicker({
  label,
  description,
  value,
  onValueChange,
  options,
  isLast
}) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || value;

  const handleSelect = (optionValue) => {
    onValueChange(optionValue);
    setModalVisible(false);
  };

  return (
    <>
      <SettingsRow label={label} description={description} isLast={isLast}>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.pickerText}>{displayLabel}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </SettingsRow>

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    item.value === value && styles.optionItemSelected
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text style={[
                    styles.optionText,
                    item.value === value && styles.optionTextSelected
                  ]}>
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
  },
  chevron: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 20,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalContent: {
    backgroundColor: '#1a2a40',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '60%',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionItemSelected: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
  },
  optionText: {
    color: '#ffffff',
    fontSize: 16,
  },
  optionTextSelected: {
    color: '#00d4ff',
    fontWeight: '600',
  },
  checkmark: {
    color: '#00d4ff',
    fontSize: 16,
    fontWeight: '600',
  },
});
