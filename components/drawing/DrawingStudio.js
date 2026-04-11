import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Platform,
  ScrollView,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import DrawingCanvas from './DrawingCanvas';
import DrawingToolbar from './DrawingToolbar';
import ShapeToolPanel from './ShapeToolPanel';
import TextOverlay from './TextOverlay';
import { TOOLS, FREEHAND_TOOLS, SHAPE_TOOLS, BRUSH_PRESETS, COLORS, BRUSH_SIZES } from './drawingConstants';
import { pointsToSvgPath, simplifyPoints, appendToSvgPath, hitTestStroke, moveStroke } from './drawingUtils';
import { showAlert } from '../../utils/alertUtils';
import { useAuth } from '../../context/AuthContext';
import { canAccessFeature } from '../../utils/premiumUtils';

export default function DrawingStudio({
  visible,
  onClose,
  onSaveToPersonal,
  onSaveToCourage,
  prompt,
  courageUploadedToday,
}) {
  // Premium check
  const { userProfile } = useAuth();
  const hasAdvancedText = canAccessFeature('studioAdvancedText', userProfile);

  // Title
  const [artTitle, setArtTitle] = useState('');

  // Drawing state
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [redoStack, setRedoStack] = useState([]);
  const [textOverlays, setTextOverlays] = useState([]);

  // Tool state
  const [activeTool, setActiveTool] = useState(TOOLS.PEN);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(1.0);
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [shapeFill, setShapeFill] = useState(false);

  // Panel visibility
  const [colorBgMode, setColorBgMode] = useState(false);
  const [showShapes, setShowShapes] = useState(false);
  const [showTextOverlay, setShowTextOverlay] = useState(false);
  const [textPlacementMode, setTextPlacementMode] = useState(false);
  const [pendingText, setPendingText] = useState(null);

  // Export ref
  const canvasRef = useRef(null);

  // Refs for imperative tracking (avoids stale closures in PanResponder)
  const pointsRef = useRef([]);
  const shapeStartRef = useRef(null);
  const currentStrokeRef = useRef(null);
  const rafRef = useRef(null);        // requestAnimationFrame handle
  const pathRef = useRef('');          // incrementally built SVG path
  const lastPathIndexRef = useRef(0);  // index of last point added to path
  const activeToolRef = useRef(activeTool);
  const brushColorRef = useRef(brushColor);
  const brushSizeRef = useRef(brushSize);
  const brushOpacityRef = useRef(brushOpacity);
  const backgroundColorRef = useRef(backgroundColor);
  const shapeFillRef = useRef(shapeFill);
  const textPlacementModeRef = useRef(textPlacementMode);
  const pendingTextRef = useRef(pendingText);

  // Move tool refs
  const movingStrokeIndexRef = useRef(null);
  const moveStartPosRef = useRef(null);
  const originalStrokeRef = useRef(null);
  const moveDeltaRef = useRef({ dx: 0, dy: 0 }); // accumulated delta for RAF batching
  const strokesRef = useRef(strokes);
  const [lastMovedIndex, setLastMovedIndex] = useState(null);

  // Undo operations stack — tracks whether each action was 'draw' or 'move'
  const undoOpsRef = useRef([]);
  const redoOpsRef = useRef([]);

  // Keep refs in sync with state
  activeToolRef.current = activeTool;
  brushColorRef.current = brushColor;
  brushSizeRef.current = brushSize;
  brushOpacityRef.current = brushOpacity;
  backgroundColorRef.current = backgroundColor;
  shapeFillRef.current = shapeFill;
  textPlacementModeRef.current = textPlacementMode;
  pendingTextRef.current = pendingText;
  strokesRef.current = strokes;

  const getStrokeColor = () => {
    if (activeToolRef.current === TOOLS.ERASER) return backgroundColorRef.current;
    return brushColorRef.current;
  };

  const getStrokeOpacity = () => {
    const preset = BRUSH_PRESETS[activeToolRef.current];
    if (preset) return brushOpacityRef.current * preset.opacity;
    return brushOpacityRef.current;
  };

  const getStrokeSize = () => {
    if (activeToolRef.current === TOOLS.HIGHLIGHTER) return brushSizeRef.current * 3;
    if (activeToolRef.current === TOOLS.MARKER) return brushSizeRef.current * 1.5;
    return brushSizeRef.current;
  };

  const getLineCap = () => {
    const preset = BRUSH_PRESETS[activeToolRef.current];
    return preset?.lineCap || 'round';
  };

  const getLineJoin = () => {
    const preset = BRUSH_PRESETS[activeToolRef.current];
    return preset?.lineJoin || 'round';
  };

  // --- Touch handlers (use refs to avoid stale closures) ---

  const handleStrokeStart = useCallback((pos) => {
    if (textPlacementModeRef.current && pendingTextRef.current) {
      setTextOverlays((prev) => [
        ...prev,
        { ...pendingTextRef.current, x: pos.x, y: pos.y },
      ]);
      setTextPlacementMode(false);
      setPendingText(null);
      return;
    }

    const tool = activeToolRef.current;

    if (tool === TOOLS.MOVE) {
      // Hit-test strokes from topmost to bottom
      const currentStrokes = strokesRef.current;
      for (let i = currentStrokes.length - 1; i >= 0; i--) {
        if (hitTestStroke(currentStrokes[i], pos)) {
          movingStrokeIndexRef.current = i;
          moveStartPosRef.current = pos;
          originalStrokeRef.current = { ...currentStrokes[i] };
          // Deep copy points array for path strokes
          if (currentStrokes[i].type === 'path' && currentStrokes[i].points) {
            originalStrokeRef.current.points = currentStrokes[i].points.map(p => ({ ...p }));
          }
          return;
        }
      }
      // No stroke found at this position
      movingStrokeIndexRef.current = null;
      return;
    }

    if (FREEHAND_TOOLS.includes(tool)) {
      pointsRef.current = [pos];
      pathRef.current = '';
      lastPathIndexRef.current = 0;
      const stroke = {
        id: Date.now(),
        type: 'path',
        points: [pos],
        color: getStrokeColor(),
        size: getStrokeSize(),
        opacity: getStrokeOpacity(),
        lineCap: getLineCap(),
        lineJoin: getLineJoin(),
        brushType: tool,
      };
      currentStrokeRef.current = stroke;
      setCurrentStroke(stroke);
    } else if (SHAPE_TOOLS.includes(tool)) {
      shapeStartRef.current = pos;
      const stroke = {
        id: Date.now(),
        type: tool,
        startPoint: pos,
        endPoint: pos,
        color: getStrokeColor(),
        size: getStrokeSize(),
        opacity: getStrokeOpacity(),
        lineCap: 'round',
        lineJoin: 'round',
        fillColor: (shapeFillRef.current && tool !== 'line') ? brushColorRef.current : null,
      };
      currentStrokeRef.current = stroke;
      setCurrentStroke(stroke);
    }
  }, []);

  const handleStrokeMove = useCallback((pos) => {
    const tool = activeToolRef.current;

    if (tool === TOOLS.MOVE && movingStrokeIndexRef.current !== null) {
      const prevPos = moveStartPosRef.current;
      moveStartPosRef.current = pos;
      moveDeltaRef.current.dx += pos.x - prevPos.x;
      moveDeltaRef.current.dy += pos.y - prevPos.y;
      const idx = movingStrokeIndexRef.current;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const { dx, dy } = moveDeltaRef.current;
          moveDeltaRef.current = { dx: 0, dy: 0 };
          setStrokes((prev) => {
            const updated = [...prev];
            updated[idx] = moveStroke(updated[idx], dx, dy);
            return updated;
          });
        });
      }
      return;
    }

    if (FREEHAND_TOOLS.includes(tool) && pointsRef.current.length > 0) {
      pointsRef.current.push(pos);

      // Throttle state updates to one per animation frame
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const pts = pointsRef.current;
          // Incremental path: only compute new segments
          const newPath = appendToSvgPath(pathRef.current, pts, lastPathIndexRef.current);
          pathRef.current = newPath;
          lastPathIndexRef.current = Math.max(0, pts.length - 1);
          const updated = {
            ...currentStrokeRef.current,
            points: pts,
            pathData: newPath,
          };
          currentStrokeRef.current = updated;
          setCurrentStroke(updated);
        });
      }
    } else if (SHAPE_TOOLS.includes(tool) && shapeStartRef.current) {
      const updated = { ...currentStrokeRef.current, endPoint: pos };
      currentStrokeRef.current = updated;
      setCurrentStroke(updated);
    }
  }, []);

  const handleStrokeEnd = useCallback(() => {
    // Handle move tool end
    if (activeToolRef.current === TOOLS.MOVE && movingStrokeIndexRef.current !== null) {
      // Flush any pending accumulated delta
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const { dx, dy } = moveDeltaRef.current;
      if (dx !== 0 || dy !== 0) {
        const idx = movingStrokeIndexRef.current;
        setStrokes((prev) => {
          const updated = [...prev];
          updated[idx] = moveStroke(updated[idx], dx, dy);
          return updated;
        });
      }
      moveDeltaRef.current = { dx: 0, dy: 0 };

      const origStroke = originalStrokeRef.current;
      if (origStroke) {
        undoOpsRef.current.push({ type: 'move', index: movingStrokeIndexRef.current, originalStroke: origStroke });
        setRedoStack([]);
        redoOpsRef.current = [];
      }
      setLastMovedIndex(movingStrokeIndexRef.current);
      movingStrokeIndexRef.current = null;
      moveStartPosRef.current = null;
      originalStrokeRef.current = null;
      return;
    }

    // Cancel any pending RAF
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const stroke = currentStrokeRef.current;
    if (stroke) {
      let finalStroke = { ...stroke };

      if (finalStroke.type === 'path' && pointsRef.current.length > 0) {
        const simplified = simplifyPoints(pointsRef.current);
        finalStroke.points = simplified;
        finalStroke.pathData = pointsToSvgPath(simplified);
      }

      setStrokes((prev) => [...prev, finalStroke]);
      setRedoStack([]);
      undoOpsRef.current.push({ type: 'draw' });
      redoOpsRef.current = [];
      setCurrentStroke(null);
      currentStrokeRef.current = null;
      pointsRef.current = [];
      shapeStartRef.current = null;
      pathRef.current = '';
      lastPathIndexRef.current = 0;
    }
  }, []);

  // --- Actions ---

  const handleUndo = () => {
    const op = undoOpsRef.current.pop();
    if (!op) return;

    if (op.type === 'move') {
      // Restore the original stroke at its index
      setStrokes((prev) => {
        const updated = [...prev];
        const movedStroke = updated[op.index];
        updated[op.index] = op.originalStroke;
        redoOpsRef.current.push({ type: 'move', index: op.index, originalStroke: movedStroke });
        return updated;
      });
    } else {
      // Normal draw undo — pop last stroke
      setStrokes((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        setRedoStack((redo) => [...redo, last]);
        redoOpsRef.current.push({ type: 'draw' });
        return prev.slice(0, -1);
      });
    }
  };

  const handleRedo = () => {
    const op = redoOpsRef.current.pop();
    if (!op) return;

    if (op.type === 'move') {
      // Re-apply the move: swap back
      setStrokes((prev) => {
        const updated = [...prev];
        const currentStroke = updated[op.index];
        updated[op.index] = op.originalStroke;
        undoOpsRef.current.push({ type: 'move', index: op.index, originalStroke: currentStroke });
        return updated;
      });
    } else {
      // Normal draw redo — push stroke back
      setRedoStack((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        setStrokes((s) => [...s, last]);
        undoOpsRef.current.push({ type: 'draw' });
        return prev.slice(0, -1);
      });
    }
  };

  const handleDuplicate = () => {
    if (lastMovedIndex === null || lastMovedIndex >= strokes.length) return;
    const source = strokes[lastMovedIndex];
    const duplicate = moveStroke({ ...source, id: Date.now() }, 20, 20);
    // Deep copy points for path strokes
    if (duplicate.type === 'path' && duplicate.points) {
      duplicate.points = duplicate.points.map(p => ({ ...p }));
    }
    setStrokes((prev) => [...prev, duplicate]);
    undoOpsRef.current.push({ type: 'draw' });
    setRedoStack([]);
    redoOpsRef.current = [];
    // Point lastMovedIndex to the new copy so user can duplicate again
    setLastMovedIndex(strokes.length);
  };

  const handleClear = () => {
    setStrokes([]);
    setRedoStack([]);
    setTextOverlays([]);
    setCurrentStroke(null);
    undoOpsRef.current = [];
    redoOpsRef.current = [];
    setLastMovedIndex(null);
  };

  const handleSelectTool = (tool) => {
    setActiveTool(tool);
    setShowShapes(false);
    setTextPlacementMode(false);
    setPendingText(null);
  };

  const handleToggleShapes = () => {
    setShowShapes(!showShapes);
  };

  const handleToggleText = () => {
    setShowTextOverlay(true);
  };

  const handleAddText = (textData) => {
    setPendingText(textData);
    setTextPlacementMode(true);
    // User taps canvas to place the text
  };

  // --- Export & Save ---

  const exportCanvas = async () => {
    try {
      if (!canvasRef.current) {
        showAlert('Error', 'Canvas not ready. Try again.');
        return null;
      }
      if (Platform.OS === 'web') {
        // html2canvas can't reliably capture SVG on mobile web — serialize SVG directly
        const svgEl = canvasRef.current.querySelector('svg');
        if (!svgEl) {
          showAlert('Export Error', 'Could not export drawing.');
          return null;
        }
        const { width, height } = svgEl.getBoundingClientRect();
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svgEl);
        const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        return new Promise((resolve) => {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width || 400;
            canvas.height = height || 400;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png', 0.9));
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            showAlert('Export Error', 'Could not export drawing.');
            resolve(null);
          };
          img.src = url;
        });
      }
      const uri = await captureRef(canvasRef, {
        format: 'png',
        quality: 0.9,
        result: 'tmpfile',
      });
      return uri;
    } catch (error) {
      console.log('Export error:', error);
      showAlert('Export Error', 'Could not export drawing.');
      return null;
    }
  };

  const handleSavePersonal = async () => {
    if (strokes.length === 0 && textOverlays.length === 0) {
      showAlert('Empty Canvas', 'Draw something first!');
      return;
    }
    const uri = await exportCanvas();
    if (uri) {
      onSaveToPersonal(uri, artTitle.trim());
      handleCloseAndReset();
    }
  };

  const handleSaveCourage = async () => {
    if (courageUploadedToday) {
      showAlert('Already Submitted', 'You can only upload one Courage per day.');
      return;
    }
    if (strokes.length === 0 && textOverlays.length === 0) {
      showAlert('Empty Canvas', 'Draw something first!');
      return;
    }
    const uri = await exportCanvas();
    if (uri) {
      onSaveToCourage(uri, artTitle.trim());
      handleCloseAndReset();
    }
  };

  const handleCloseAndReset = () => {
    setArtTitle('');
    setStrokes([]);
    setRedoStack([]);
    setTextOverlays([]);
    setCurrentStroke(null);
    setActiveTool(TOOLS.PEN);
    setBrushColor('#000000');
    setBrushSize(5);
    setBrushOpacity(1.0);
    setBackgroundColor('#FFFFFF');
    setShapeFill(false);
    setShowShapes(false);
    setColorBgMode(false);
    setTextPlacementMode(false);
    setPendingText(null);
    setLastMovedIndex(null);
    undoOpsRef.current = [];
    redoOpsRef.current = [];
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleCloseAndReset}>
            <Text style={styles.closeBtnText}>X</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{prompt || 'Art Studio'}</Text>
        </View>

        {/* Toolbar */}
        <DrawingToolbar
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onToggleShapes={handleToggleShapes}
          onToggleText={handleToggleText}
          onDuplicate={handleDuplicate}
          canUndo={strokes.length > 0 || undoOpsRef.current.length > 0}
          canRedo={redoStack.length > 0 || redoOpsRef.current.length > 0}
          canDuplicate={lastMovedIndex !== null && lastMovedIndex < strokes.length}
          shapesActive={showShapes}
        />

        {/* Always-visible controls: size + color */}
        <View style={styles.controlStrip}>
          {/* Size row */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Size</Text>
            {BRUSH_SIZES.map((preset) => (
              <TouchableOpacity
                key={preset.value}
                style={[styles.sizeBtn, brushSize === preset.value && styles.sizeBtnActive]}
                onPress={() => setBrushSize(preset.value)}
              >
                <Text style={[styles.sizeBtnText, brushSize === preset.value && styles.sizeBtnTextActive]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Color row: Brush/BG toggle + color swatches */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.colorScrollContent}
          >
            <TouchableOpacity
              style={[styles.modeChip, !colorBgMode && styles.modeChipActive]}
              onPress={() => setColorBgMode(false)}
            >
              <View style={[styles.modeChipDot, { backgroundColor: brushColor }]} />
              <Text style={styles.modeChipText}>Brush</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeChip, colorBgMode && styles.modeChipActive]}
              onPress={() => setColorBgMode(true)}
            >
              <View style={[styles.modeChipDot, { backgroundColor: backgroundColor, borderWidth: 1, borderColor: '#999' }]} />
              <Text style={styles.modeChipText}>BG</Text>
            </TouchableOpacity>

            <View style={styles.controlDivider} />

            {COLORS.map((color) => {
              const activeColor = colorBgMode ? backgroundColor : brushColor;
              return (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.swatch,
                    { backgroundColor: color },
                    activeColor.toUpperCase() === color.toUpperCase() && styles.swatchSelected,
                    color === '#FFFFFF' && styles.swatchWhite,
                  ]}
                  onPress={() => colorBgMode ? setBackgroundColor(color) : setBrushColor(color)}
                />
              );
            })}
          </ScrollView>
        </View>

        {/* Shape panel */}
        {showShapes && (
          <ShapeToolPanel
            activeTool={activeTool}
            onSelectTool={handleSelectTool}
            shapeFill={shapeFill}
            onToggleFill={() => setShapeFill(!shapeFill)}
            fillColor={brushColor}
          />
        )}

        {/* Text placement hint */}
        {textPlacementMode && (
          <View style={styles.textHint}>
            <Text style={styles.textHintText}>Tap on the canvas to place your text</Text>
          </View>
        )}

        {/* Move tool hint */}
        {activeTool === TOOLS.MOVE && (
          <View style={styles.textHint}>
            <Text style={styles.textHintText}>Tap and drag a shape or stroke to move it</Text>
          </View>
        )}

        {/* Canvas */}
        <View style={styles.canvasRow}>
          <DrawingCanvas
            strokes={strokes}
            currentStroke={currentStroke}
            textOverlays={textOverlays}
            backgroundColor={backgroundColor}
            activeTool={activeTool}
            brushColor={brushColor}
            brushSize={brushSize}
            brushOpacity={brushOpacity}
            onStrokeStart={handleStrokeStart}
            onStrokeMove={handleStrokeMove}
            onStrokeEnd={handleStrokeEnd}
            canvasRef={canvasRef}
          />
        </View>

        {/* Title */}
        <View style={styles.titleRow}>
          <TextInput
            style={styles.titleInput}
            placeholder="Title your work (optional)"
            placeholderTextColor="#888"
            value={artTitle}
            onChangeText={setArtTitle}
            maxLength={100}
          />
        </View>

        {/* Save buttons */}
        <View style={styles.saveRow}>
          <TouchableOpacity style={styles.savePersonalBtn} onPress={handleSavePersonal}>
            <Text style={styles.savePersonalText}>Save to Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveCourageBtn, courageUploadedToday && styles.saveBtnDisabled]}
            onPress={handleSaveCourage}
            disabled={courageUploadedToday}
          >
            <Text style={styles.saveCourageText}>
              {courageUploadedToday ? 'Courage achieved. Come back tomorrow.' : 'Share as Courage'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Text overlay modal */}
      <TextOverlay
        visible={showTextOverlay}
        onClose={() => setShowTextOverlay(false)}
        onAddText={handleAddText}
        isPremium={hasAdvancedText}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  canvasRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  controlStrip: {
    backgroundColor: '#FFF8E7',
    borderBottomWidth: 1,
    borderBottomColor: '#D4C4A0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlLabel: {
    color: '#4a3520',
    fontSize: 11,
    fontWeight: '600',
    width: 30,
  },
  sizeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D4C4A0',
    backgroundColor: '#fff',
  },
  sizeBtnActive: {
    borderColor: '#B8860B',
    backgroundColor: 'rgba(184, 134, 11, 0.15)',
  },
  sizeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  sizeBtnTextActive: {
    color: '#B8860B',
  },
  colorScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4C4A0',
    backgroundColor: '#fff',
  },
  modeChipActive: {
    borderColor: '#B8860B',
    backgroundColor: 'rgba(184, 134, 11, 0.15)',
  },
  modeChipDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  modeChipText: {
    fontSize: 11,
    color: '#444',
    fontWeight: '600',
  },
  controlDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#D4C4A0',
    marginHorizontal: 2,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: '#B8860B',
    borderWidth: 2.5,
  },
  swatchWhite: {
    borderColor: '#999',
    borderWidth: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF8E7',
    borderBottomWidth: 1,
    borderBottomColor: '#D4C4A0',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    color: '#332100',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  textHint: {
    backgroundColor: 'rgba(180, 140, 60, 0.15)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  textHintText: {
    color: '#7A6520',
    fontSize: 13,
    fontStyle: 'italic',
  },
  saveRow: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
    backgroundColor: '#FFF8E7',
    borderTopWidth: 1,
    borderTopColor: '#D4C4A0',
  },
  savePersonalBtn: {
    flex: 1,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  savePersonalText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveCourageBtn: {
    flex: 1,
    backgroundColor: '#9C27B0',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveCourageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  titleRow: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 500,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  titleInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#333',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#D4C4A0',
  },
});
