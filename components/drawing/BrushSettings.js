import React, { useRef, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BRUSH_SIZES } from './drawingConstants';

const SLIDER_MIN = 1;
const SLIDER_MAX = 50;
const THUMB_MAX_SIZE = 32;

export default function BrushSettings({ brushSize, onChangeBrushSize }) {
  const trackLayout = useRef({ x: 0, y: 0, width: 1 });

  const sizeFromX = useCallback((x) => {
    const w = trackLayout.current.width || 1;
    const ratio = Math.max(0, Math.min(1, x / w));
    return Math.round(SLIDER_MIN + ratio * (SLIDER_MAX - SLIDER_MIN));
  }, []);

  const handleTrackTouch = useCallback((evt) => {
    onChangeBrushSize(sizeFromX(evt.nativeEvent.locationX));
  }, [onChangeBrushSize, sizeFromX]);

  const handleTrackMove = useCallback((evt) => {
    onChangeBrushSize(sizeFromX(evt.nativeEvent.locationX));
  }, [onChangeBrushSize, sizeFromX]);

  const sliderRatio = (brushSize - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN);
  const thumbDiameter = Math.max(14, Math.min(THUMB_MAX_SIZE, brushSize * 0.8 + 8));

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Brush Size</Text>
        <Text style={styles.valueLabel}>{brushSize}</Text>
      </View>

      {/* Custom slider */}
      <View
        style={styles.sliderContainer}
        onLayout={(e) => {
          trackLayout.current = e.nativeEvent.layout;
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTrackTouch}
        onResponderMove={handleTrackMove}
      >
        {/* Track background */}
        <View style={styles.track}>
          {/* Filled portion */}
          <View style={[styles.trackFill, { width: `${sliderRatio * 100}%` }]} />
        </View>

        {/* Thumb */}
        <View
          style={[
            styles.thumb,
            {
              left: `${sliderRatio * 100}%`,
              width: thumbDiameter,
              height: thumbDiameter,
              borderRadius: thumbDiameter / 2,
              marginLeft: -thumbDiameter / 2,
              marginTop: -thumbDiameter / 2 + 3,
            },
          ]}
          pointerEvents="none"
        >
          {/* Inner dot shows actual brush size preview */}
          <View
            style={{
              width: Math.min(brushSize, thumbDiameter - 6),
              height: Math.min(brushSize, thumbDiameter - 6),
              borderRadius: Math.min(brushSize, thumbDiameter - 6) / 2,
              backgroundColor: '#333',
            }}
          />
        </View>
      </View>

      {/* Preset buttons */}
      <View style={styles.presetsRow}>
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
                  width: Math.min(preset.value * 1.5, 24),
                  height: Math.min(preset.value * 1.5, 24),
                  borderRadius: Math.min(preset.value * 0.75, 12),
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#4a3520',
    fontSize: 12,
    fontWeight: '600',
  },
  valueLabel: {
    color: '#333',
    fontSize: 13,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'right',
  },
  sliderContainer: {
    height: 36,
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackFill: {
    height: 6,
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  sizeBtn: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 44,
  },
  sizeBtnActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  sizePreview: {
    backgroundColor: '#fff',
    marginBottom: 3,
  },
  sizeLabel: {
    color: '#999',
    fontSize: 11,
    fontWeight: '600',
  },
  sizeLabelActive: {
    color: '#FFD700',
  },
});
