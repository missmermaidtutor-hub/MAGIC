import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { COLORS } from './drawingConstants';

export default function TextOverlay({ visible, onClose, onAddText }) {
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(24);
  const [color, setColor] = useState('#000000');
  const [bold, setBold] = useState(false);

  const FONT_SIZES = [14, 18, 24, 32, 48];

  const handleAdd = () => {
    if (!text.trim()) return;
    onAddText({
      text: text.trim(),
      fontSize,
      color,
      bold,
    });
    setText('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Add Text</Text>

          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type your text..."
            placeholderTextColor="#666"
            multiline
            autoFocus
          />

          {/* Font size */}
          <Text style={styles.label}>Size</Text>
          <View style={styles.row}>
            {FONT_SIZES.map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.sizeBtn, fontSize === size && styles.sizeBtnActive]}
                onPress={() => setFontSize(size)}
              >
                <Text style={[styles.sizeText, fontSize === size && styles.sizeTextActive]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Color */}
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {COLORS.slice(0, 8).map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  color === c && styles.colorDotActive,
                  c === '#FFFFFF' && { borderWidth: 1, borderColor: '#666' },
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          {/* Bold toggle */}
          <TouchableOpacity
            style={[styles.boldBtn, bold && styles.boldBtnActive]}
            onPress={() => setBold(!bold)}
          >
            <Text style={[styles.boldText, bold && styles.boldTextActive]}>B Bold</Text>
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Text style={styles.addText}>Add to Canvas</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 12,
  },
  label: {
    color: '#999',
    fontSize: 12,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sizeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  sizeBtnActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  sizeText: {
    color: '#999',
    fontSize: 13,
  },
  sizeTextActive: {
    color: '#FFD700',
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  boldBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  boldBtnActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  boldText: {
    color: '#999',
    fontSize: 14,
    fontWeight: 'bold',
  },
  boldTextActive: {
    color: '#FFD700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
    alignItems: 'center',
  },
  cancelText: {
    color: '#999',
    fontSize: 15,
  },
  addBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFD700',
    alignItems: 'center',
  },
  addText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
