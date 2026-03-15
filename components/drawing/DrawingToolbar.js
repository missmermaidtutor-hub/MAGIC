import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { TOOLS } from './drawingConstants';

const TOOL_ITEMS = [
  { key: TOOLS.PEN, label: 'Pen', icon: '✏️' },
  { key: TOOLS.MARKER, label: 'Marker', icon: '🖊️' },
  { key: TOOLS.HIGHLIGHTER, label: 'Highlight', icon: '🖍️' },
  { key: TOOLS.ERASER, label: 'Eraser', icon: '🧹' },
];

const ACTION_ITEMS = [
  { key: 'undo', label: 'Undo', icon: '↩️' },
  { key: 'redo', label: 'Redo', icon: '↪️' },
  { key: 'shapes', label: 'Shapes', icon: '⬡' },
  { key: 'text', label: 'Text', icon: 'Aa' },
  { key: 'clear', label: 'Clear', icon: '🗑️' },
];

export default function DrawingToolbar({
  activeTool,
  onSelectTool,
  onUndo,
  onRedo,
  onClear,
  onToggleShapes,
  onToggleText,
  canUndo,
  canRedo,
  shapesActive,
  showBrushSettings,
  onToggleBrushSettings,
  showColorPicker,
  onToggleColorPicker,
  brushColor,
}) {
  const handleAction = (key) => {
    switch (key) {
      case 'undo':
        onUndo();
        break;
      case 'redo':
        onRedo();
        break;
      case 'clear':
        Alert.alert('Clear Canvas', 'Erase everything?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear', style: 'destructive', onPress: onClear },
        ]);
        break;
      case 'shapes':
        onToggleShapes();
        break;
      case 'text':
        onToggleText();
        break;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Size button */}
        <TouchableOpacity
          style={[styles.toolBtn, showBrushSettings && styles.toolBtnActive]}
          onPress={onToggleBrushSettings}
        >
          <Text style={styles.toolIcon}>📏</Text>
          <Text style={[styles.toolLabel, showBrushSettings && styles.toolLabelActive]}>Size</Text>
        </TouchableOpacity>

        {/* Color button */}
        <TouchableOpacity
          style={[styles.toolBtn, showColorPicker && styles.toolBtnActive]}
          onPress={onToggleColorPicker}
        >
          <View style={[styles.colorPreview, { backgroundColor: brushColor }]} />
          <Text style={[styles.toolLabel, showColorPicker && styles.toolLabelActive]}>Color</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Drawing tools */}
        {TOOL_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.toolBtn,
              activeTool === item.key && styles.toolBtnActive,
            ]}
            onPress={() => onSelectTool(item.key)}
          >
            <Text style={styles.toolIcon}>{item.icon}</Text>
            <Text style={[
              styles.toolLabel,
              activeTool === item.key && styles.toolLabelActive,
            ]}>{item.label}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        {/* Action buttons */}
        {ACTION_ITEMS.map((item) => {
          const disabled =
            (item.key === 'undo' && !canUndo) ||
            (item.key === 'redo' && !canRedo);
          const isActive = item.key === 'shapes' && shapesActive;

          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.toolBtn,
                isActive && styles.toolBtnActive,
                disabled && styles.toolBtnDisabled,
              ]}
              onPress={() => handleAction(item.key)}
              disabled={disabled}
            >
              <Text style={[styles.toolIcon, disabled && styles.iconDisabled]}>
                {item.icon}
              </Text>
              <Text style={[
                styles.toolLabel,
                isActive && styles.toolLabelActive,
                disabled && styles.labelDisabled,
              ]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E2A06E',
    borderBottomWidth: 1,
    borderBottomColor: '#c8875a',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  toolBtn: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    minWidth: 44,
  },
  toolBtnActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  toolBtnDisabled: {
    opacity: 0.3,
  },
  toolIcon: {
    fontSize: 18,
  },
  iconDisabled: {
    opacity: 0.4,
  },
  toolLabel: {
    fontSize: 9,
    color: '#444',
    marginTop: 1,
  },
  toolLabelActive: {
    color: '#FFD700',
    fontWeight: '600',
  },
  labelDisabled: {
    color: '#555',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#c8875a',
    marginHorizontal: 4,
  },
  colorPreview: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
});
