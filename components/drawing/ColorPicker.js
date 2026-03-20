import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, Text, TextInput, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { COLORS } from './drawingConstants';
import { hsvToHex, hexToHsv } from './drawingUtils';

// Rainbow hue stops
const HUE_STOPS = [
  { offset: '0%', color: '#FF0000' },
  { offset: '17%', color: '#FFFF00' },
  { offset: '33%', color: '#00FF00' },
  { offset: '50%', color: '#00FFFF' },
  { offset: '67%', color: '#0000FF' },
  { offset: '83%', color: '#FF00FF' },
  { offset: '100%', color: '#FF0000' },
];

const HUE_BAR_WIDTH = 22;
const SV_PANEL_WIDTH = 52;

// ─── Vertical sidebar (hue bar + SV panel) beside the canvas ───

export function ColorSidebar({ brushColor, onSelectColor }) {
  const hsv = hexToHsv(brushColor);
  const [hue, setHue] = useState(hsv.h);
  const [sat, setSat] = useState(hsv.s);
  const [val, setVal] = useState(hsv.v);

  // Sync when brushColor changes externally (preset tap, etc.)
  const prevColorRef = useRef(brushColor);
  useEffect(() => {
    if (brushColor !== prevColorRef.current) {
      prevColorRef.current = brushColor;
      const newHsv = hexToHsv(brushColor);
      setHue(newHsv.h);
      setSat(newHsv.s);
      setVal(newHsv.v);
    }
  }, [brushColor]);

  const hueBarLayout = useRef({ height: 1 });
  const svPanelLayout = useRef({ width: 1, height: 1 });

  const applyColor = useCallback((h, s, v) => {
    const hex = hsvToHex(h, s, v);
    prevColorRef.current = hex;
    onSelectColor(hex);
  }, [onSelectColor]);

  // --- Vertical hue bar: Y position → hue 0-360 ---
  const handleHueTouch = useCallback((evt) => {
    const y = evt.nativeEvent.locationY;
    const h = hueBarLayout.current.height || 1;
    const newHue = Math.max(0, Math.min(360, (y / h) * 360));
    setHue(newHue);
    applyColor(newHue, sat, val);
  }, [sat, val, applyColor]);

  const handleHueMove = useCallback((evt) => {
    const y = evt.nativeEvent.locationY;
    const h = hueBarLayout.current.height || 1;
    const newHue = Math.max(0, Math.min(360, (y / h) * 360));
    setHue(newHue);
    applyColor(newHue, sat, val);
  }, [sat, val, applyColor]);

  // --- SV panel: X → saturation, Y → value ---
  const handleSVTouch = useCallback((evt) => {
    const x = evt.nativeEvent.locationX;
    const y = evt.nativeEvent.locationY;
    const w = svPanelLayout.current.width || 1;
    const h = svPanelLayout.current.height || 1;
    const newSat = Math.max(0, Math.min(1, x / w));
    const newVal = Math.max(0, Math.min(1, 1 - y / h));
    setSat(newSat);
    setVal(newVal);
    applyColor(hue, newSat, newVal);
  }, [hue, applyColor]);

  const handleSVMove = useCallback((evt) => {
    const x = evt.nativeEvent.locationX;
    const y = evt.nativeEvent.locationY;
    const w = svPanelLayout.current.width || 1;
    const h = svPanelLayout.current.height || 1;
    const newSat = Math.max(0, Math.min(1, x / w));
    const newVal = Math.max(0, Math.min(1, 1 - y / h));
    setSat(newSat);
    setVal(newVal);
    applyColor(hue, newSat, newVal);
  }, [hue, applyColor]);

  const pureHueColor = hsvToHex(hue, 1, 1);

  return (
    <View style={sidebarStyles.container}>
      {/* Vertical hue bar */}
      <View
        style={sidebarStyles.hueBar}
        onLayout={(e) => { hueBarLayout.current = e.nativeEvent.layout; }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleHueTouch}
        onResponderMove={handleHueMove}
      >
        <Svg width={HUE_BAR_WIDTH} height="100%">
          <Defs>
            <LinearGradient id="hueGradV" x1="0" y1="0" x2="0" y2="1">
              {HUE_STOPS.map((stop, i) => (
                <Stop key={i} offset={stop.offset} stopColor={stop.color} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={HUE_BAR_WIDTH} height="100%" rx="4" fill="url(#hueGradV)" />
        </Svg>
        {/* Hue indicator */}
        <View
          style={[
            sidebarStyles.hueIndicator,
            { top: `${(hue / 360) * 100}%` },
          ]}
          pointerEvents="none"
        />
      </View>

      {/* Vertical SV panel */}
      <View
        style={sidebarStyles.svPanel}
        onLayout={(e) => { svPanelLayout.current = e.nativeEvent.layout; }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleSVTouch}
        onResponderMove={handleSVMove}
      >
        <Svg width={SV_PANEL_WIDTH} height="100%">
          <Defs>
            <LinearGradient id="satGradV" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="100%" stopColor={pureHueColor} />
            </LinearGradient>
            <LinearGradient id="valGradV" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="transparent" />
              <Stop offset="100%" stopColor="#000000" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={SV_PANEL_WIDTH} height="100%" rx="4" fill="url(#satGradV)" />
          <Rect x="0" y="0" width={SV_PANEL_WIDTH} height="100%" rx="4" fill="url(#valGradV)" />
        </Svg>
        {/* Crosshair indicator */}
        <View
          style={[
            sidebarStyles.svIndicator,
            {
              left: `${sat * 100}%`,
              top: `${(1 - val) * 100}%`,
              borderColor: val > 0.5 ? '#000' : '#fff',
            },
          ]}
          pointerEvents="none"
        />
      </View>

      {/* Preview dot at bottom */}
      <View style={[sidebarStyles.previewDot, { backgroundColor: brushColor }]} />
    </View>
  );
}

const sidebarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 4,
    paddingLeft: 4,
    paddingRight: 4,
  },
  hueBar: {
    width: HUE_BAR_WIDTH,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  hueIndicator: {
    position: 'absolute',
    left: -2,
    width: HUE_BAR_WIDTH + 4,
    height: 8,
    marginTop: -4,
    borderRadius: 4,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#333',
  },
  svPanel: {
    width: SV_PANEL_WIDTH,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  svIndicator: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    borderRadius: 7,
    borderWidth: 2.5,
    backgroundColor: 'transparent',
  },
  previewDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#333',
    alignSelf: 'flex-end',
    marginLeft: 2,
  },
});

// ─── Bottom panel (mode toggle, presets, hex, opacity) ───

export default function ColorPicker({
  selectedColor,
  onSelectColor,
  opacity,
  onChangeOpacity,
  backgroundColor,
  onChangeBackground,
  bgMode: bgModeProp,
  onBgModeChange,
}) {
  const [bgModeLocal, setBgModeLocal] = useState(false);
  const bgMode = bgModeProp !== undefined ? bgModeProp : bgModeLocal;
  const setBgMode = onBgModeChange || setBgModeLocal;
  const [customHex, setCustomHex] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const activeColor = bgMode ? backgroundColor : selectedColor;

  const handlePresetPress = (color) => {
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
      handlePresetPress(hex);
      setShowCustom(false);
      setCustomHex('');
    }
  };

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

      {/* Preview + hex */}
      <View style={styles.previewRow}>
        <View style={[styles.previewSwatch, { backgroundColor: activeColor }]}>
          {activeColor === '#FFFFFF' && <View style={styles.previewSwatchBorder} />}
        </View>
        <Text style={styles.hexDisplay}>{activeColor.toUpperCase()}</Text>
        <TouchableOpacity
          style={styles.customToggleBtn}
          onPress={() => setShowCustom(!showCustom)}
        >
          <Text style={styles.customToggleText}>#</Text>
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

      {/* Quick presets */}
      <View style={styles.presetsRow}>
        {COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.presetSwatch,
              { backgroundColor: color },
              activeColor.toUpperCase() === color.toUpperCase() && styles.presetSwatchSelected,
              color === '#FFFFFF' && styles.whiteSwatch,
            ]}
            onPress={() => handlePresetPress(color)}
          />
        ))}
      </View>

      {/* Opacity (brush mode only) */}
      {!bgMode && (
        <View style={styles.opacityRow}>
          <Text style={styles.opacityLabel}>Opacity:</Text>
          {OPACITY_STEPS.map((v) => (
            <TouchableOpacity
              key={v}
              style={[
                styles.opacityBtn,
                Math.abs(opacity - v) < 0.01 && styles.opacityBtnActive,
              ]}
              onPress={() => onChangeOpacity(v)}
            >
              <Text style={[
                styles.opacityText,
                Math.abs(opacity - v) < 0.01 && styles.opacityTextActive,
              ]}>{Math.round(v * 100)}%</Text>
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
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  previewSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333',
  },
  previewSwatchBorder: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#999',
  },
  hexDisplay: {
    color: '#333',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  customToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  customToggleText: {
    color: '#ccc',
    fontSize: 14,
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
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  presetSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetSwatchSelected: {
    borderColor: '#FFD700',
    borderWidth: 2.5,
  },
  whiteSwatch: {
    borderColor: '#666',
    borderWidth: 1,
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
