import React, { useRef, useCallback, useEffect } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import Svg, { Path, Line, Rect, Circle, Polygon, Text as SvgText, G } from 'react-native-svg';
import { TOOLS, FREEHAND_TOOLS, BRUSH_PRESETS } from './drawingConstants';
import { pointsToSvgPath, lineFromPoints, rectFromPoints, circleFromPoints, triangleFromPoints, simplifyPoints } from './drawingUtils';

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

  const renderStroke = (stroke, index) => {
    const key = stroke.id || `stroke-${index}`;
    const commonProps = {
      stroke: stroke.color,
      strokeWidth: stroke.size,
      strokeOpacity: stroke.opacity,
      fill: 'none',
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
  };

  const renderCurrentStroke = () => {
    if (!currentStroke) return null;
    return renderStroke(currentStroke, 'current');
  };

  return (
    <View style={styles.container}>
      <View style={styles.canvasOuter} ref={canvasRef} collapsable={false}>
        <View style={styles.canvasWrap} {...panResponder.panHandlers}>
          <Svg style={styles.svg}>
            {/* Background */}
            <Rect x="0" y="0" width="100%" height="100%" fill={backgroundColor} />

            {/* Completed strokes */}
            <G>
              {strokes.map((stroke, i) => renderStroke(stroke, i))}
            </G>

            {/* Active stroke preview */}
            {renderCurrentStroke()}

            {/* Text overlays */}
            {textOverlays.map((t, i) => (
              <SvgText
                key={`text-${i}`}
                x={t.x}
                y={t.y}
                fill={t.color}
                fontSize={t.fontSize}
                fontWeight={t.bold ? 'bold' : 'normal'}
                opacity={t.opacity || 1}
              >
                {t.text}
              </SvgText>
            ))}
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
    width: '100%',
    maxWidth: 500,
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: '#c8875a',
  },
  canvasWrap: {
    flex: 1,
  },
  svg: {
    flex: 1,
  },
});
