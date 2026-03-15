import React, { useState } from 'react';
import { View, TouchableOpacity, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS } from './drawingConstants';

export default function ColorPicker({
  selectedColor,
  onSelectColor,
  opacity,
  onChangeOpacity,
  backgroundColor,
  onChangeBackground,
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [customHex, setCustomHex] = useState('');
  const [bgMode, setBgMode] = useState(false); // false = brush color, true = background color

  const handleColorPress = (color) => {
    if (bgMode) {
      onChangeBackground(color);
    } else {
      onSelectColor(color);
    }
  };

  const handleCustomSubmit = () => {
    let hex = customHex.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      handleColorPress(hex);
      setShowCustom(false);
      setCustomHex('');
    }
  };

  const activeColor = bgMode ? backgroundColor : selectedColor;

  const OPACITY_STEPS = [0.1, 0.25, 0.5, 0.75, 1.0];

  return (
    <View style={styles.container}>
      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, !bgMode && styles.modeBtnActive]}
          onPress={() => setBgMode(false)}
        >
          <Text style={[styles.modeText, !bgMode && styles.modeTextActive]}>Brush</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, bgMode && styles.modeBtnActive]}
          onPress={() => setBgMode(true)}
        >
          <Text style={[styles.modeText, bgMode && styles.modeTextActive]}>Background</Text>
        </TouchableOpacity>
      </View>

      {/* Color grid */}
      <View style={styles.colorGrid}>
        {COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorSwatch,
              { backgroundColor: color },
              activeColor === color && styles.colorSwatchSelected,
              color === '#FFFFFF' && styles.whiteSwatch,
            ]}
            onPress={() => handleColorPress(color)}
          />
        ))}
        <TouchableOpacity
          style={[styles.colorSwatch, styles.customSwatch]}
          onPress={() => setShowCustom(!showCustom)}
        >
          <Text style={styles.customText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Custom hex input */}
      {showCustom && (
        <View style={styles.customRow}>
          <Text style={styles.hashText}>#</Text>
          <TextInput
            style={styles.hexInput}
            value={customHex}
            onChangeText={setCustomHex}
            placeholder="FF00FF"
            placeholderTextColor="#666"
            maxLength={6}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.applyBtn} onPress={handleCustomSubmit}>
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Opacity (brush mode only) */}
      {!bgMode && (
        <View style={styles.opacityRow}>
          <Text style={styles.opacityLabel}>Opacity:</Text>
          {OPACITY_STEPS.map((val) => (
            <TouchableOpacity
              key={val}
              style={[
                styles.opacityBtn,
                Math.abs(opacity - val) < 0.01 && styles.opacityBtnActive,
              ]}
              onPress={() => onChangeOpacity(val)}
            >
              <Text style={[
                styles.opacityText,
                Math.abs(opacity - val) < 0.01 && styles.opacityTextActive,
              ]}>{Math.round(val * 100)}%</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E2A06E',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modeRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  modeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#555',
  },
  modeBtnActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  modeText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#FFD700',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: '#FFD700',
    borderWidth: 3,
  },
  whiteSwatch: {
    borderColor: '#666',
    borderWidth: 1,
  },
  customSwatch: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#666',
    borderStyle: 'dashed',
  },
  customText: {
    color: '#ccc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  hashText: {
    color: '#999',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hexInput: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 8,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#444',
  },
  applyBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  applyText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  opacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  opacityLabel: {
    color: '#999',
    fontSize: 12,
    marginRight: 4,
  },
  opacityBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  opacityBtnActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  opacityText: {
    color: '#999',
    fontSize: 11,
  },
  opacityTextActive: {
    color: '#FFD700',
    fontWeight: '600',
  },
});
