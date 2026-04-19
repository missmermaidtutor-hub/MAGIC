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
  const [selectedPanel, setSelectedPanel] = useState('pen'); // 'bg'|'shapes'|'pen'|'marker'|'highlighter'|'eraser'
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

  // Undo operations stack — tracks whether each action was 'draw', 'move', 'text', or 'moveText'
  const undoOpsRef = useRef([]);
  const redoOpsRef = useRef([]);

  // Text overlay move refs (appended after all existing hooks to preserve hook order)
  const movingTextIndexRef = useRef(null);
  const originalTextRef = useRef(null);
  const textOverlaysRef = useRef(textOverlays);

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
  textOverlaysRef.current = textOverlays;

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
      const newOverlay = { ...pendingTextRef.current, x: pos.x, y: pos.y };
      setTextOverlays((prev) => [...prev, newOverlay]);
      undoOpsRef.current.push({ type: 'text', overlay: newOverlay });
      setRedoStack([]);
      redoOpsRef.current = [];
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
      // No stroke hit — try text overlays (40px radius from anchor point)
      movingStrokeIndexRef.current = null;
      const overlays = textOverlaysRef.current;
      for (let i = overlays.length - 1; i >= 0; i--) {
        const t = overlays[i];
        const dx = pos.x - t.x;
        const dy = pos.y - t.y;
        if (Math.sqrt(dx * dx + dy * dy) < 40) {
          movingTextIndexRef.current = i;
          moveStartPosRef.current = pos;
          originalTextRef.current = { ...t };
          return;
        }
      }
      movingTextIndexRef.current = null;
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

    if (tool === TOOLS.MOVE && movingTextIndexRef.current !== null) {
      const prevPos = moveStartPosRef.current;
      moveStartPosRef.current = pos;
      const dx = pos.x - prevPos.x;
      const dy = pos.y - prevPos.y;
      const idx = movingTextIndexRef.current;
      setTextOverlays((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], x: updated[idx].x + dx, y: updated[idx].y + dy };
        return updated;
      });
      return;
    }

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
    // Handle text overlay move end
    if (activeToolRef.current === TOOLS.MOVE && movingTextIndexRef.current !== null) {
      const origText = originalTextRef.current;
      if (origText) {
        undoOpsRef.current.push({ type: 'moveText', index: movingTextIndexRef.current, originalText: origText });
        setRedoStack([]);
        redoOpsRef.current = [];
      }
      movingTextIndexRef.current = null;
      moveStartPosRef.current = null;
      originalTextRef.current = null;
      return;
    }

    // Handle stroke move tool end
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

    if (op.type === 'text') {
      setTextOverlays((prev) => {
        const removed = prev[prev.length - 1];
        redoOpsRef.current.push({ type: 'text', overlay: removed });
        return prev.slice(0, -1);
      });
    } else if (op.type === 'moveText') {
      setTextOverlays((prev) => {
        const updated = [...prev];
        const movedText = updated[op.index];
        updated[op.index] = op.originalText;
        redoOpsRef.current.push({ type: 'moveText', index: op.index, originalText: movedText });
        return updated;
      });
    } else if (op.type === 'move') {
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

    if (op.type === 'text') {
      setTextOverlays((prev) => [...prev, op.overlay]);
      undoOpsRef.current.push({ type: 'text', overlay: op.overlay });
    } else if (op.type === 'moveText') {
      setTextOverlays((prev) => {
        const updated = [...prev];
        const currentText = updated[op.index];
        updated[op.index] = op.originalText;
        undoOpsRef.current.push({ type: 'moveText', index: op.index, originalText: currentText });
        return updated;
      });
    } else if (op.type === 'move') {
      // Re-apply the move: swap back
      setStrokes((prev) => {
        const updated = [...prev];
        const currentStrokeVal = updated[op.index];
        updated[op.index] = op.originalStroke;
        undoOpsRef.current.push({ type: 'move', index: op.index, originalStroke: currentStrokeVal });
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
    movingTextIndexRef.current = null;
    originalTextRef.current = null;
  };

  // Called from toolbar actions (Move) — doesn't change the panel selection
  const handleSelectTool = (tool) => {
    setActiveTool(tool);
    setTextPlacementMode(false);
    setPendingText(null);
  };

  // Called from the tool selector strip — sets both panel and active tool
  const handleSelectPanel = (panel) => {
    setSelectedPanel(panel);
    setTextPlacementMode(false);
    setPendingText(null);
    switch (panel) {
      case 'pen': setActiveTool(TOOLS.PEN); break;
      case 'marker': setActiveTool(TOOLS.MARKER); break;
      case 'highlighter': setActiveTool(TOOLS.HIGHLIGHTER); break;
      case 'eraser': setActiveTool(TOOLS.ERASER); break;
      case 'shapes': {
        const current = SHAPE_TOOLS.includes(activeTool) ? activeTool : TOOLS.RECT;
        setActiveTool(current);
        break;
      }
      case 'bg': break; // don't change activeTool — bg is just a color target
    }
  };

  // Called when user picks a shape sub-type within the shapes panel
  const handleSelectShapeTool = (tool) => {
    setActiveTool(tool);
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
        // Read width/height from SVG attributes (matches coordinate space exactly).
        // getBoundingClientRect() can differ from SVG coordinate space when flex CSS is applied.
        const w = parseInt(svgEl.getAttribute('width'), 10) || 400;
        const h = parseInt(svgEl.getAttribute('height'), 10) || 400;
        // Clone and stamp explicit dimensions so browsers don't default to 300×150
        const svgClone = svgEl.cloneNode(true);
        svgClone.setAttribute('width', String(w));
        svgClone.setAttribute('height', String(h));
        svgClone.setAttribute('viewBox', `0 0 ${w} ${h}`);
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svgClone);
        const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        return new Promise((resolve) => {
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
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
    setSelectedPanel('pen');
    setTextPlacementMode(false);
    setPendingText(null);
    setLastMovedIndex(null);
    undoOpsRef.current = [];
    redoOpsRef.current = [];
    movingTextIndexRef.current = null;
    originalTextRef.current = null;
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

        {/* Action toolbar: Move, Undo, Redo, Copy, Text, Clear */}
        <DrawingToolbar
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onToggleText={handleToggleText}
          onDuplicate={handleDuplicate}
          canUndo={strokes.length > 0 || undoOpsRef.current.length > 0}
          canRedo={redoStack.length > 0 || redoOpsRef.current.length > 0}
          canDuplicate={lastMovedIndex !== null && lastMovedIndex < strokes.length}
        />

        {/* Tool selector + contextual options strip */}
        <View style={styles.controlStrip}>
          {/* Tool selector row: BG | Shapes | Pen | Marker | Highlight | Eraser */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolSelectorRow}>
            {[
              { key: 'bg',          label: 'BG',       dot: backgroundColor },
              { key: 'shapes',      label: 'Shapes',   icon: '⬡' },
              { key: 'pen',         label: 'Pen',       icon: '✏️' },
              { key: 'marker',      label: 'Marker',    icon: '🖊️' },
              { key: 'highlighter', label: 'Highlight', icon: '🖍️' },
              { key: 'eraser',      label: 'Eraser',    icon: '🧹' },
            ].map(({ key, label, icon, dot }) => (
              <TouchableOpacity
                key={key}
                style={[styles.panelToolBtn, selectedPanel === key && styles.panelToolBtnActive]}
                onPress={() => handleSelectPanel(key)}
              >
                {dot !== undefined
                  ? <View style={[styles.panelToolDot, { backgroundColor: dot, borderColor: dot === '#FFFFFF' ? '#999' : 'transparent' }]} />
                  : <Text style={styles.panelToolIcon}>{icon}</Text>
                }
                <Text style={[styles.panelToolLabel, selectedPanel === key && styles.panelToolLabelActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Shape sub-options (only when Shapes selected) */}
          {selectedPanel === 'shapes' && (
            <View style={styles.controlRow}>
              {[
                { key: TOOLS.LINE,     label: 'Line',   icon: '╱' },
                { key: TOOLS.RECT,     label: 'Rect',   icon: '▭' },
                { key: TOOLS.CIRCLE,   label: 'Circle', icon: '◯' },
                { key: TOOLS.TRIANGLE, label: 'Tri',    icon: '△' },
              ].map(({ key, label, icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.sizeBtn, activeTool === key && styles.sizeBtnActive]}
                  onPress={() => handleSelectShapeTool(key)}
                >
                  <Text style={[styles.sizeBtnText, activeTool === key && styles.sizeBtnTextActive]}>
                    {icon} {label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.sizeBtn, shapeFill && styles.sizeBtnActive]}
                onPress={() => setShapeFill(!shapeFill)}
              >
                <Text style={[styles.sizeBtnText, shapeFill && styles.sizeBtnTextActive]}>
                  {shapeFill ? 'Fill ●' : 'Fill ○'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Size row (hidden for BG) */}
          {selectedPanel !== 'bg' && (
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
          )}

          {/* Color swatches (hidden for Eraser) */}
          {selectedPanel !== 'eraser' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorScrollContent}>
              {COLORS.map((color) => {
                const activeColor = selectedPanel === 'bg' ? backgroundColor : brushColor;
                const onPressColor = selectedPanel === 'bg'
                  ? () => setBackgroundColor(color)
                  : () => setBrushColor(color);
                return (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.swatch,
                      { backgroundColor: color },
                      activeColor.toUpperCase() === color.toUpperCase() && styles.swatchSelected,
                      color === '#FFFFFF' && styles.swatchWhite,
                    ]}
                    onPress={onPressColor}
                  />
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Canvas section — hints float as absolute overlays */}
        <View style={styles.canvasSection}>

          {/* Text placement hint — absolute banner */}
          {textPlacementMode && (
            <View style={styles.panelOverlay}>
              <View style={styles.textHint}>
                <Text style={styles.textHintText}>Tap on the canvas to place your text</Text>
              </View>
            </View>
          )}

          {/* Move tool hint — absolute banner */}
          {activeTool === TOOLS.MOVE && (
            <View style={styles.panelOverlay}>
              <View style={styles.textHint}>
                <Text style={styles.textHintText}>Tap and drag a shape or stroke to move it</Text>
              </View>
            </View>
          )}

          {/* Canvas — always gets full flex space regardless of which panels are open */}
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
  canvasSection: {
    flex: 1,
    position: 'relative',
  },
  panelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
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
  toolSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 2,
  },
  panelToolBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4C4A0',
    backgroundColor: '#fff',
  },
  panelToolBtnActive: {
    borderColor: '#B8860B',
    backgroundColor: 'rgba(184, 134, 11, 0.15)',
  },
  panelToolIcon: {
    fontSize: 14,
  },
  panelToolDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  panelToolLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  panelToolLabelActive: {
    color: '#B8860B',
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
    paddingHorizontal: 10,
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
    fontSize: 11,
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
