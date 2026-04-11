import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { showDestructiveConfirm } from '../../utils/alertUtils';
import { TOOLS } from './drawingConstants';

const TOOL_ITEMS = [
  { key: TOOLS.PEN, label: 'Pen', icon: '✏️' },
  { key: TOOLS.MARKER, label: 'Marker', icon: '🖊️' },
  { key: TOOLS.HIGHLIGHTER, label: 'Highlight', icon: '🖍️' },
  { key: TOOLS.ERASER, label: 'Eraser', icon: '🧹' },
];

const ACTION_ITEMS = [
  { key: 'shapes', label: 'Shapes', icon: '⬡' },
  { key: TOOLS.MOVE, label: 'Move', icon: '✥' },
  { key: 'undo', label: 'Undo', icon: '↩️' },
  { key: 'redo', label: 'Redo', icon: '↪️' },
  { key: 'duplicate', label: 'Copy', icon: '⧉' },
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
  onDuplicate,
  canUndo,
  canRedo,
  canDuplicate,
  shapesActive,
}) {
  const handleAction = (key) => {
    switch (key) {
      case 'undo': onUndo(); break;
      case 'redo': onRedo(); break;
      case 'clear': showDestructiveConfirm('Clear Canvas', 'Erase everything?', onClear, 'Clear'); break;
      case 'shapes': onToggleShapes(); break;
      case TOOLS.MOVE: onSelectTool(TOOLS.MOVE); break;
      case 'duplicate': if (onDuplicate) onDuplicate(); break;
      case 'text': onToggleText(); break;
    }
  };

  return (
    <View style={styles.container}>
      {/* Row 1: Drawing tools */}
      <View style={styles.row}>
        {TOOL_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.toolBtn, activeTool === item.key && styles.toolBtnActive]}
            onPress={() => onSelectTool(item.key)}
          >
            <Text style={styles.toolIcon}>{item.icon}</Text>
            <Text style={[styles.toolLabel, activeTool === item.key && styles.toolLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Row 2: Actions */}
      <View style={styles.row}>
        {ACTION_ITEMS.map((item) => {
          const disabled =
            (item.key === 'undo' && !canUndo) ||
            (item.key === 'redo' && !canRedo) ||
            (item.key === 'duplicate' && !canDuplicate);
          const isActive =
            (item.key === 'shapes' && shapesActive) ||
            (item.key === TOOLS.MOVE && activeTool === TOOLS.MOVE);

          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.toolBtn, isActive && styles.toolBtnActive, disabled && styles.toolBtnDisabled]}
              onPress={() => handleAction(item.key)}
              disabled={disabled}
            >
              <Text style={[styles.toolIcon, disabled && styles.iconDisabled]}>{item.icon}</Text>
              <Text style={[styles.toolLabel, isActive && styles.toolLabelActive, disabled && styles.labelDisabled]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF8E7',
    borderBottomWidth: 1,
    borderBottomColor: '#D4C4A0',
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  toolBtn: {
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: 8,
    flex: 1,
  },
  toolBtnActive: {
    backgroundColor: 'rgba(184, 134, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#B8860B',
  },
  toolBtnDisabled: {
    opacity: 0.3,
  },
  toolIcon: {
    fontSize: 16,
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
    color: '#B8860B',
    fontWeight: '600',
  },
  labelDisabled: {
    color: '#555',
  },
});
