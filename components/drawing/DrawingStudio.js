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
import ColorPicker, { ColorSidebar } from './ColorPicker';
import BrushSettings from './BrushSettings';
import ShapeToolPanel from './ShapeToolPanel';
import TextOverlay from './TextOverlay';
import { TOOLS, FREEHAND_TOOLS, SHAPE_TOOLS, BRUSH_PRESETS } from './drawingConstants';
import { pointsToSvgPath, simplifyPoints, appendToSvgPath } from './drawingUtils';
import { showAlert } from '../../utils/alertUtils';

export default function DrawingStudio({
  visible,
  onClose,
  onSaveToPersonal,
  onSaveToCourage,
  prompt,
  courageUploadedToday,
}) {
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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBrushSettings, setShowBrushSettings] = useState(false);
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

  // Keep refs in sync with state
  activeToolRef.current = activeTool;
  brushColorRef.current = brushColor;
  brushSizeRef.current = brushSize;
  brushOpacityRef.current = brushOpacity;
  backgroundColorRef.current = backgroundColor;
  shapeFillRef.current = shapeFill;
  textPlacementModeRef.current = textPlacementMode;
  pendingTextRef.current = pendingText;

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
          lastPathIndexRef.current = Math.max(0, pts.length - 2);
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
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((redo) => [...redo, last]);
      return prev.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStrokes((s) => [...s, last]);
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setStrokes([]);
    setRedoStack([]);
    setTextOverlays([]);
    setCurrentStroke(null);
  };

  const handleSelectTool = (tool) => {
    setActiveTool(tool);
    setShowShapes(false);
    setTextPlacementMode(false);
    setPendingText(null);
  };

  const handleToggleShapes = () => {
    setShowShapes(!showShapes);
    setShowColorPicker(false);
    setShowBrushSettings(false);
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
      const uri = await captureRef(canvasRef, {
        format: 'png',
        quality: 0.9,
        result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
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
    setShowColorPicker(false);
    setShowBrushSettings(false);
    setShowShapes(false);
    setColorBgMode(false);
    setTextPlacementMode(false);
    setPendingText(null);
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
          canUndo={strokes.length > 0}
          canRedo={redoStack.length > 0}
          shapesActive={showShapes}
          showBrushSettings={showBrushSettings}
          onToggleBrushSettings={() => {
            setShowBrushSettings(!showBrushSettings);
            setShowColorPicker(false);
            setShowShapes(false);
          }}
          showColorPicker={showColorPicker}
          onToggleColorPicker={() => {
            setShowColorPicker(!showColorPicker);
            setShowBrushSettings(false);
            setShowShapes(false);
          }}
          brushColor={brushColor}
          backgroundColor={backgroundColor}
          onToggleBgColor={() => {
            setColorBgMode(true);
            setShowColorPicker(true);
            setShowBrushSettings(false);
            setShowShapes(false);
          }}
        />

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

        {/* Brush size panel */}
        {showBrushSettings && (
          <BrushSettings brushSize={brushSize} onChangeBrushSize={setBrushSize} />
        )}

        {/* Color picker panel */}
        {showColorPicker && (
          <ColorPicker
            selectedColor={brushColor}
            onSelectColor={setBrushColor}
            opacity={brushOpacity}
            onChangeOpacity={setBrushOpacity}
            backgroundColor={backgroundColor}
            onChangeBackground={setBackgroundColor}
            bgMode={colorBgMode}
            onBgModeChange={setColorBgMode}
          />
        )}

        {/* Text placement hint */}
        {textPlacementMode && (
          <View style={styles.textHint}>
            <Text style={styles.textHintText}>Tap on the canvas to place your text</Text>
          </View>
        )}

        {/* Canvas row (sidebar + canvas) */}
        <View style={styles.canvasRow}>
          {showColorPicker && (
            <ColorSidebar
              brushColor={brushColor}
              onSelectColor={setBrushColor}
            />
          )}
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
              {courageUploadedToday ? 'Courage Sent' : 'Share as Courage'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Text overlay modal */}
      <TextOverlay
        visible={showTextOverlay}
        onClose={() => setShowTextOverlay(false)}
        onAddText={handleAddText}
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
  container: {
    flex: 1,
    backgroundColor: '#E2A06E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E2A06E',
    borderBottomWidth: 1,
    borderBottomColor: '#c8875a',
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
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  textHint: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  textHintText: {
    color: '#FFD700',
    fontSize: 13,
    fontStyle: 'italic',
  },
  saveRow: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
    backgroundColor: '#E2A06E',
    borderTopWidth: 1,
    borderTopColor: '#c8875a',
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
    borderColor: '#c8875a',
  },
});
