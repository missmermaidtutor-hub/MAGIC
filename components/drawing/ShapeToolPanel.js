import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { TOOLS } from './drawingConstants';

const SHAPE_OPTIONS = [
  { key: TOOLS.LINE, label: 'Line', icon: '╱' },
  { key: TOOLS.RECT, label: 'Rectangle', icon: '▭' },
  { key: TOOLS.CIRCLE, label: 'Circle', icon: '◯' },
  { key: TOOLS.TRIANGLE, label: 'Triangle', icon: '△' },
];

export default function ShapeToolPanel({ activeTool, onSelectTool }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Shape Tools</Text>
      <View style={styles.row}>
        {SHAPE_OPTIONS.map((shape) => (
          <TouchableOpacity
            key={shape.key}
            style={[
              styles.shapeBtn,
              activeTool === shape.key && styles.shapeBtnActive,
            ]}
            onPress={() => onSelectTool(shape.key)}
          >
            <Text style={styles.shapeIcon}>{shape.icon}</Text>
            <Text style={[
              styles.shapeLabel,
              activeTool === shape.key && styles.shapeLabelActive,
            ]}>{shape.label}</Text>
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
    gap: 10,
  },
  shapeBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  shapeBtnActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  shapeIcon: {
    fontSize: 22,
    color: '#fff',
    marginBottom: 2,
  },
  shapeLabel: {
    fontSize: 10,
    color: '#999',
  },
  shapeLabelActive: {
    color: '#FFD700',
    fontWeight: '600',
  },
});
