import React, { useRef, useCallback, useEffect, memo, useState } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import Svg, { Path, Line, Rect, Circle, Polygon, Text as SvgText, G } from 'react-native-svg';
import { TOOLS, FREEHAND_TOOLS, BRUSH_PRESETS } from './drawingConstants';
import { pointsToSvgPath, lineFromPoints, rectFromPoints, circleFromPoints, triangleFromPoints, simplifyPoints } from './drawingUtils';

/**
 * Render a single stroke as an SVG element.
 */
function renderStroke(stroke, index) {
  const key = stroke.id || `stroke-${index}`;
  const commonProps = {
    stroke: stroke.color,
    strokeWidth: stroke.size,
    strokeOpacity: stroke.opacity,
    fill: stroke.fillColor || 'none',
    fillOpacity: stroke.fillColor ? stroke.opacity : 0,
    strokeLinecap: stroke.lineCap || 'round',
    strokeLinejoin: stroke.lineJoin || 'round',
  };

  switch (stroke.type) {
    case 'path': {
      const pathData = stroke.pathData || pointsToSvgPath(stroke.points || []);
      if (!pathData) return null;
      return <Path key={key} d={pathData} {...commonProps} />;
    }
    case 'line': {
      const { x1, y1, x2, y2 } = lineFromPoints(stroke.startPoint, stroke.endPoint);
      return <Line key={key} x1={x1} y1={y1} x2={x2} y2={y2} {...commonProps} />;
    }
    case 'rect': {
      const { x, y, width, height } = rectFromPoints(stroke.startPoint, stroke.endPoint);
      return <Rect key={key} x={x} y={y} width={width} height={height} {...commonProps} />;
    }
    case 'circle': {
      const { cx, cy, r } = circleFromPoints(stroke.startPoint, stroke.endPoint);
      return <Circle key={key} cx={cx} cy={cy} r={r} {...commonProps} />;
    }
    case 'triangle': {
      const points = triangleFromPoints(stroke.startPoint, stroke.endPoint);
      return <Polygon key={key} points={points} {...commonProps} />;
    }
    default:
      return null;
  }
}

/**
 * Memoized component for completed strokes + text overlays.
 * Only re-renders when strokes array reference or textOverlays change,
 * NOT when currentStroke updates on every touch move.
 */
const CompletedStrokes = memo(function CompletedStrokes({ strokes, textOverlays, backgroundColor }) {
  return (
    <>
      {/* Background */}
      <Rect x="0" y="0" width="100%" height="100%" fill={backgroundColor} />

      {/* Completed strokes */}
      <G>
        {strokes.map((stroke, i) => renderStroke(stroke, i))}
      </G>

      {/* Text overlays */}
      {textOverlays.map((t, i) => {
        const decoration = [
          t.underline ? 'underline' : '',
          t.strikethrough ? 'line-through' : '',
        ].filter(Boolean).join(' ') || 'none';
        return (
          <SvgText
            key={`text-${i}`}
            x={t.x}
            y={t.y}
            fill={t.color}
            fontSize={t.fontSize}
            fontWeight={t.bold ? 'bold' : 'normal'}
            fontStyle={t.italic ? 'italic' : 'normal'}
            fontFamily={t.fontFamily || undefined}
            textDecoration={decoration}
            opacity={t.opacity || 1}
          >
            {t.text}
          </SvgText>
        );
      })}
    </>
  );
});

export default function DrawingCanvas({
  strokes,
  currentStroke,
  textOverlays,
  backgroundColor,
  activeTool,
  brushColor,
  brushSize,
  brushOpacity,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
  canvasRef,
}) {
  // Use refs so PanResponder always calls the latest callbacks
  const onStrokeStartRef = useRef(onStrokeStart);
  const onStrokeMoveRef = useRef(onStrokeMove);
  const onStrokeEndRef = useRef(onStrokeEnd);

  useEffect(() => { onStrokeStartRef.current = onStrokeStart; }, [onStrokeStart]);
  useEffect(() => { onStrokeMoveRef.current = onStrokeMove; }, [onStrokeMove]);
  useEffect(() => { onStrokeEndRef.current = onStrokeEnd; }, [onStrokeEnd]);

  const getPosition = useCallback((evt) => {
    return {
      x: evt.nativeEvent.locationX,
      y: evt.nativeEvent.locationY,
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: (evt) => {
        const pos = getPosition(evt);
        onStrokeStartRef.current(pos);
      },

      onPanResponderMove: (evt) => {
        const pos = getPosition(evt);
        onStrokeMoveRef.current(pos);
      },

      onPanResponderRelease: () => {
        onStrokeEndRef.current();
      },
    })
  ).current;

  const [canvasSize, setCanvasSize] = useState(300);
  const onContainerLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize(Math.min(width, height, 500));
  }, []);

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <View
        style={[styles.canvasOuter, canvasSize > 0 && { width: canvasSize, height: canvasSize }]}
        ref={canvasRef}
        collapsable={false}
      >
        <View style={styles.canvasWrap} {...panResponder.panHandlers}>
          <Svg style={styles.svg} width={canvasSize} height={canvasSize} viewBox={`0 0 ${canvasSize} ${canvasSize}`}>
            {/* Memoized completed strokes — won't re-render during active drawing */}
            <CompletedStrokes
              strokes={strokes}
              textOverlays={textOverlays}
              backgroundColor={backgroundColor}
            />

            {/* Active stroke preview — updates on every move */}
            {currentStroke ? renderStroke(currentStroke, 'current') : null}
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  canvasOuter: {
    borderWidth: 2,
    borderColor: '#D4C4A0',
  },
  canvasWrap: {
    flex: 1,
  },
  svg: {
    flex: 1,
  },
});
