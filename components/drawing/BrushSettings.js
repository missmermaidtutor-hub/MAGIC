import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BRUSH_SIZES } from './drawingConstants';

export default function BrushSettings({ brushSize, onChangeBrushSize }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Brush Size</Text>
      <View style={styles.row}>
        {BRUSH_SIZES.map((preset) => (
          <TouchableOpacity
            key={preset.value}
            style={[
              styles.sizeBtn,
              brushSize === preset.value && styles.sizeBtnActive,
            ]}
            onPress={() => onChangeBrushSize(preset.value)}
          >
            <View
              style={[
                styles.sizePreview,
                {
                  width: Math.min(preset.value * 1.5, 32),
                  height: Math.min(preset.value * 1.5, 32),
                  borderRadius: Math.min(preset.value * 0.75, 16),
                },
              ]}
            />
            <Text style={[
              styles.sizeLabel,
              brushSize === preset.value && styles.sizeLabelActive,
            ]}>{preset.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E2A06E',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  label: {
    color: '#999',
    fontSize: 12,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  sizeBtn: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 50,
  },
  sizeBtnActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  sizePreview: {
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  sizeLabel: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
  },
  sizeLabelActive: {
    color: '#FFD700',
  },
});
