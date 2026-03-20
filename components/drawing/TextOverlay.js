import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from './drawingConstants';

// Font families available on both iOS and web
const PREMIUM_FONTS = [
  { label: 'Default', value: undefined },
  { label: 'Serif', value: 'Georgia' },
  { label: 'Mono', value: 'Courier New' },
  { label: 'Cursive', value: 'cursive' },
];

export default function TextOverlay({ visible, onClose, onAddText, isPremium = true }) {
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(24);
  const [color, setColor] = useState('#000000');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [strikethrough, setStrikethrough] = useState(false);
  const [fontFamily, setFontFamily] = useState(undefined);

  const FONT_SIZES = [14, 18, 24, 32, 48];

  // Free users see 8 colors, premium see all 12
  const availableColors = isPremium ? COLORS : COLORS.slice(0, 8);

  const handleAdd = () => {
    if (!text.trim()) return;
    onAddText({
      text: text.trim(),
      fontSize,
      color,
      bold,
      italic: isPremium ? italic : false,
      underline: isPremium ? underline : false,
      strikethrough: isPremium ? strikethrough : false,
      fontFamily: isPremium ? fontFamily : undefined,
    });
    setText('');
    setItalic(false);
    setUnderline(false);
    setStrikethrough(false);
    setFontFamily(undefined);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>Add Text</Text>

            <TextInput
              style={[
                styles.input,
                bold && { fontWeight: 'bold' },
                italic && { fontStyle: 'italic' },
                fontFamily && { fontFamily },
                { color },
              ]}
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
              {availableColors.map((c) => (
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

            {/* Formatting toggles */}
            <Text style={styles.label}>Style</Text>
            <View style={styles.formatRow}>
              {/* Bold — always free */}
              <TouchableOpacity
                style={[styles.formatBtn, bold && styles.formatBtnActive]}
                onPress={() => setBold(!bold)}
              >
                <Text style={[styles.formatText, bold && styles.formatTextActive, { fontWeight: 'bold' }]}>B</Text>
              </TouchableOpacity>

              {/* Italic — premium */}
              <TouchableOpacity
                style={[
                  styles.formatBtn,
                  italic && styles.formatBtnActive,
                  !isPremium && styles.formatBtnLocked,
                ]}
                onPress={() => isPremium && setItalic(!italic)}
              >
                <Text style={[
                  styles.formatText,
                  italic && styles.formatTextActive,
                  { fontStyle: 'italic' },
                  !isPremium && styles.formatTextLocked,
                ]}>I</Text>
              </TouchableOpacity>

              {/* Underline — premium */}
              <TouchableOpacity
                style={[
                  styles.formatBtn,
                  underline && styles.formatBtnActive,
                  !isPremium && styles.formatBtnLocked,
                ]}
                onPress={() => isPremium && setUnderline(!underline)}
              >
                <Text style={[
                  styles.formatText,
                  underline && styles.formatTextActive,
                  { textDecorationLine: 'underline' },
                  !isPremium && styles.formatTextLocked,
                ]}>U</Text>
              </TouchableOpacity>

              {/* Strikethrough — premium */}
              <TouchableOpacity
                style={[
                  styles.formatBtn,
                  strikethrough && styles.formatBtnActive,
                  !isPremium && styles.formatBtnLocked,
                ]}
                onPress={() => isPremium && setStrikethrough(!strikethrough)}
              >
                <Text style={[
                  styles.formatText,
                  strikethrough && styles.formatTextActive,
                  { textDecorationLine: 'line-through' },
                  !isPremium && styles.formatTextLocked,
                ]}>S</Text>
              </TouchableOpacity>
            </View>

            {/* Font family — premium */}
            {isPremium && (
              <>
                <Text style={styles.label}>Font</Text>
                <View style={styles.row}>
                  {PREMIUM_FONTS.map((f) => (
                    <TouchableOpacity
                      key={f.label}
                      style={[styles.fontBtn, fontFamily === f.value && styles.fontBtnActive]}
                      onPress={() => setFontFamily(f.value)}
                    >
                      <Text style={[
                        styles.fontText,
                        fontFamily === f.value && styles.fontTextActive,
                        f.value && { fontFamily: f.value },
                      ]}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Premium hint for free users */}
            {!isPremium && (
              <Text style={styles.premiumHint}>
                &#x2B50; Upgrade for italic, underline, strikethrough, fonts & more colors
              </Text>
            )}

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
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
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
    flexWrap: 'wrap',
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
    flexWrap: 'wrap',
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
  formatRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  formatBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatBtnActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  formatBtnLocked: {
    opacity: 0.35,
  },
  formatText: {
    color: '#999',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formatTextActive: {
    color: '#FFD700',
  },
  formatTextLocked: {
    color: '#555',
  },
  fontBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  fontBtnActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  fontText: {
    color: '#999',
    fontSize: 13,
  },
  fontTextActive: {
    color: '#FFD700',
    fontWeight: '600',
  },
  premiumHint: {
    color: '#FFD700',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 12,
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
