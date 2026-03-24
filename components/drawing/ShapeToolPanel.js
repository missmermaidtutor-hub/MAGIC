import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { TOOLS } from './drawingConstants';

const SHAPE_OPTIONS = [
  { key: TOOLS.LINE, label: 'Line', icon: '╱' },
  { key: TOOLS.RECT, label: 'Rectangle', icon: '▭' },
  { key: TOOLS.CIRCLE, label: 'Circle', icon: '◯' },
  { key: TOOLS.TRIANGLE, label: 'Triangle', icon: '△' },
];

export default function ShapeToolPanel({ activeTool, onSelectTool, shapeFill, onToggleFill, fillColor }) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Shape Tools</Text>
      </View>
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
      <View style={styles.fillRow}>
        <TouchableOpacity
          style={[styles.fillBtn, shapeFill && styles.fillBtnActive]}
          onPress={onToggleFill}
        >
          <View style={[
            styles.fillSwatch,
            { backgroundColor: shapeFill ? fillColor : 'transparent' },
            !shapeFill && styles.fillSwatchEmpty,
          ]} />
          <Text style={[styles.fillLabel, shapeFill && styles.fillLabelActive]}>
            {shapeFill ? 'Fill On' : 'Fill Off'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF8E7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fillRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  label: {
    color: '#666',
    fontSize: 12,
  },
  fillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#444',
    gap: 6,
  },
  fillBtnActive: {
    borderColor: '#B8860B',
    backgroundColor: 'rgba(184, 134, 11, 0.15)',
  },
  fillSwatch: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#B8860B',
  },
  fillSwatchEmpty: {
    borderStyle: 'dashed',
    borderColor: '#888',
  },
  fillLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  fillLabelActive: {
    color: '#B8860B',
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
    borderColor: '#999',
  },
  shapeBtnActive: {
    borderColor: '#B8860B',
    backgroundColor: 'rgba(184, 134, 11, 0.15)',
  },
  shapeIcon: {
    fontSize: 22,
    color: '#332100',
    marginBottom: 2,
  },
  shapeLabel: {
    fontSize: 10,
    color: '#666',
  },
  shapeLabelActive: {
    color: '#B8860B',
    fontWeight: '600',
  },
});
