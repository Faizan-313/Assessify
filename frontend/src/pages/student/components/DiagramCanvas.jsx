import { useEffect, useRef, useState, useCallback } from "react";
import { Pen, Eraser, Square, Circle, Minus, ArrowRight, Type, Trash2, Move } from "lucide-react";

const PENCIL_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'></path></svg>") 0 18, auto`;
const ERASER_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='white' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20H20V20Z'></path></svg>") 0 24, auto`;

function DiagramCanvas({ questionId, onAnswerChange }) {
    const canvasRef = useRef(null);
    const offscreenCanvasRef = useRef(null);
    const animationFrameRef = useRef(null);
    const textInputRef = useRef(null); // Ref for forced auto-focus
    
    // High-frequency refs
    const isDrawingRef = useRef(false);
    const startPosRef = useRef(null);
    const currentPointsRef = useRef([]);
    const isMovingRef = useRef(false);
    const isResizingRef = useRef(false);
    const moveStartRef = useRef(null);
    const resizeStartRef = useRef(null);
    const resizeHandleRef = useRef(null);
    const shapesRef = useRef([]);
    const selectedShapeIdRef = useRef(null);
    const currentCursorRef = useRef("default");

    // UI State
    const [tool, setTool] = useState("pen");
    const [color, setColor] = useState("#000000");
    const [lineWidth, setLineWidth] = useState(2);
    const [text, setText] = useState("");
    const [textPos, setTextPos] = useState(null);
    const [showTextInput, setShowTextInput] = useState(false);
    
    // Locked massive canvas size for scrolling
    const [canvasWidth] = useState(2000);
    const [canvasHeight] = useState(1500);
    const [selectedShapeId, setSelectedShapeIdState] = useState(null);

    // Force exact autofocus when the text input appears
    useEffect(() => {
        if (showTextInput && textInputRef.current) {
            // setTimeout ensures the DOM has painted the input before we try to focus it
            setTimeout(() => {
                textInputRef.current?.focus();
            }, 10);
        }
    }, [showTextInput]);

    const setSelectedShapeId = useCallback((id) => {
        selectedShapeIdRef.current = id;
        setSelectedShapeIdState(id);
    }, []);

    const applyNativeCursor = useCallback((cursorValue) => {
        if (canvasRef.current && currentCursorRef.current !== cursorValue) {
            canvasRef.current.style.cursor = cursorValue;
            currentCursorRef.current = cursorValue;
        }
    }, []);

    useEffect(() => {
        if (tool === "pen") applyNativeCursor(PENCIL_CURSOR);
        else if (tool === "eraser") applyNativeCursor(ERASER_CURSOR);
        else if (tool === "select") applyNativeCursor("default");
        else applyNativeCursor("crosshair");
    }, [tool, applyNativeCursor]);

    const getCanvasCoordinates = useCallback((canvas, e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }, []);

    const getFreehandBounds = useCallback((points) => {
        if (!points || points.length === 0) return null;
        let minX = points[0].x, minY = points[0].y, maxX = points[0].x, maxY = points[0].y;
        for (let i = 1; i < points.length; i++) {
            if (points[i].x < minX) minX = points[i].x;
            if (points[i].y < minY) minY = points[i].y;
            if (points[i].x > maxX) maxX = points[i].x;
            if (points[i].y > maxY) maxY = points[i].y;
        }
        return { x: minX - 5, y: minY - 5, width: (maxX - minX) + 10, height: (maxY - minY) + 10 };
    }, []);

    const getShapeBounds = useCallback((shape) => {
        if (shape.type === "pen" || shape.type === "eraser") return getFreehandBounds(shape.points);
        if (shape.type === "square") return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
        if (shape.type === "ellipse") return { x: shape.cx - shape.rx, y: shape.cy - shape.ry, width: shape.rx * 2, height: shape.ry * 2 };
        if (shape.type === "line" || shape.type === "arrow") {
            const minX = Math.min(shape.x1, shape.x2);
            const minY = Math.min(shape.y1, shape.y2);
            return { x: minX, y: minY, width: Math.max(1, Math.abs(shape.x2 - shape.x1)), height: Math.max(1, Math.abs(shape.y2 - shape.y1)) };
        }
        if (shape.type === "text") {
            const ctx = canvasRef.current?.getContext("2d", { desynchronized: true });
            if (!ctx) return { x: shape.x, y: shape.y, width: 100, height: 20 };
            ctx.font = `${shape.lineWidth * 8}px Arial`;
            const metrics = ctx.measureText(shape.text);
            const ascent = metrics.actualBoundingBoxAscent || shape.lineWidth * 8 * 0.8;
            return { x: shape.x, y: shape.y - ascent, width: metrics.width, height: ascent + (metrics.actualBoundingBoxDescent || 0) };
        }
        return { x: 0, y: 0, width: 0, height: 0 };
    }, [getFreehandBounds]);

    const drawShape = useCallback((ctx, shape) => {
        ctx.strokeStyle = shape.type === "eraser" ? "#ffffff" : shape.color;
        ctx.lineWidth = shape.type === "eraser" ? 20 : shape.lineWidth;
        ctx.fillStyle = shape.color;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (shape.type === "pen" || shape.type === "eraser") {
            if (shape.points?.length > 0) {
                ctx.beginPath();
                ctx.moveTo(shape.points[0].x, shape.points[0].y);
                for (let i = 1; i < shape.points.length; i++) ctx.lineTo(shape.points[i].x, shape.points[i].y);
                ctx.stroke();
            }
        } else if (shape.type === "square") ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        else if (shape.type === "ellipse") {
            ctx.beginPath();
            ctx.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (shape.type === "line") {
            ctx.beginPath();
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
            ctx.stroke();
        } else if (shape.type === "arrow") {
            const headLength = 15;
            const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
            ctx.beginPath();
            ctx.moveTo(shape.x1, shape.y1);
            ctx.lineTo(shape.x2, shape.y2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(shape.x2, shape.y2);
            ctx.lineTo(shape.x2 - headLength * Math.cos(angle - Math.PI / 6), shape.y2 - headLength * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(shape.x2, shape.y2);
            ctx.lineTo(shape.x2 - headLength * Math.cos(angle + Math.PI / 6), shape.y2 - headLength * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
        } else if (shape.type === "text") {
            ctx.font = `${shape.lineWidth * 8}px Arial`;
            ctx.fillText(shape.text, shape.x, shape.y);
        }
    }, []);

    const drawSelection = useCallback((ctx, shape) => {
        const bounds = getShapeBounds(shape);
        if (!bounds) return;
        ctx.strokeStyle = "#5c8374";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        ctx.setLineDash([]);
        
        const handleSize = 8;
        const handles = [
            { x: bounds.x, y: bounds.y }, { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x, y: bounds.y + bounds.height }, { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
        ];
        ctx.fillStyle = "#ffffff";
        handles.forEach(h => {
            ctx.fillRect(h.x - handleSize/2, h.y - handleSize/2, handleSize, handleSize);
            ctx.strokeRect(h.x - handleSize/2, h.y - handleSize/2, handleSize, handleSize);
        });
    }, [getShapeBounds]);

    const updateOffscreenCanvas = useCallback((excludeId = null) => {
        if (!offscreenCanvasRef.current) offscreenCanvasRef.current = document.createElement("canvas");
        const off = offscreenCanvasRef.current;
        off.width = canvasWidth;
        off.height = canvasHeight;
        
        const ctx = off.getContext("2d", { desynchronized: true, alpha: false });
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, off.width, off.height);

        const shapes = shapesRef.current;
        for (let i = 0; i < shapes.length; i++) {
            if (shapes[i].id !== excludeId) drawShape(ctx, shapes[i]);
        }
    }, [canvasWidth, canvasHeight, drawShape]);

    const redrawCanvas = useCallback((currentPoints = null, previewShape = null) => {
        const canvas = canvasRef.current;
        const off = offscreenCanvasRef.current;
        if (!canvas || !off) return;
        
        const ctx = canvas.getContext("2d", { desynchronized: true, alpha: false });
        ctx.drawImage(off, 0, 0);

        if (currentPoints?.length > 0) {
            ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
            ctx.lineWidth = tool === "eraser" ? 20 : lineWidth;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
            for (let i = 1; i < currentPoints.length; i++) ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
            ctx.stroke();
        }

        if (previewShape) drawShape(ctx, previewShape);

        const selectedId = selectedShapeIdRef.current;
        if (selectedId) {
            const shape = shapesRef.current.find(s => s.id === selectedId);
            if (shape) {
                drawShape(ctx, shape);
                drawSelection(ctx, shape);
            }
        }
    }, [tool, color, lineWidth, drawShape, drawSelection]);

    const scheduleRedraw = useCallback((currentPoints = null, previewShape = null) => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(() => redrawCanvas(currentPoints, previewShape));
    }, [redrawCanvas]);

    useEffect(() => {
        updateOffscreenCanvas(selectedShapeIdRef.current);
        scheduleRedraw();
    }, [canvasWidth, canvasHeight, updateOffscreenCanvas, scheduleRedraw]);

    const getResizeHandleAtPoint = useCallback((x, y) => {
        const selectedId = selectedShapeIdRef.current;
        if (!selectedId) return null;
        const shape = shapesRef.current.find(s => s.id === selectedId);
        const bounds = shape ? getShapeBounds(shape) : null;
        if (!bounds) return null;
        
        const handles = {
            tl: { x: bounds.x, y: bounds.y, cursor: "nwse-resize" },
            tr: { x: bounds.x + bounds.width, y: bounds.y, cursor: "nesw-resize" },
            bl: { x: bounds.x, y: bounds.y + bounds.height, cursor: "nesw-resize" },
            br: { x: bounds.x + bounds.width, y: bounds.y + bounds.height, cursor: "nwse-resize" }
        };
        for (const [key, pos] of Object.entries(handles)) {
            if (Math.abs(x - pos.x) <= 12 && Math.abs(y - pos.y) <= 12) return { handle: key, cursor: pos.cursor };
        }
        return null;
    }, [getShapeBounds]);

    const findShapeAtPoint = useCallback((x, y) => {
        const shapes = shapesRef.current;
        for (let i = shapes.length - 1; i >= 0; i--) {
            const bounds = getShapeBounds(shapes[i]);
            if (bounds && x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height) {
                return shapes[i];
            }
        }
        return null;
    }, [getShapeBounds]);

    const moveShape = useCallback((shape, dx, dy) => {
        switch (shape.type) {
            case "pen": case "eraser": return { ...shape, points: shape.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
            case "square": case "text": return { ...shape, x: shape.x + dx, y: shape.y + dy };
            case "ellipse": return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy };
            case "line": case "arrow": return { ...shape, x1: shape.x1 + dx, y1: shape.y1 + dy, x2: shape.x2 + dx, y2: shape.y2 + dy };
            default: return shape;
        }
    }, []);

    const resizeShape = useCallback((shape, oldBounds, newBounds) => {
        const scaleX = newBounds.width / (oldBounds.width || 1);
        const scaleY = newBounds.height / (oldBounds.height || 1);
        const newShape = { ...shape };

        if (shape.type === "pen" || shape.type === "eraser") {
            newShape.points = shape.points.map(p => ({ x: newBounds.x + (p.x - oldBounds.x) * scaleX, y: newBounds.y + (p.y - oldBounds.y) * scaleY }));
        } else if (shape.type === "square") {
            Object.assign(newShape, { x: newBounds.x, y: newBounds.y, width: newBounds.width, height: newBounds.height });
        } else if (shape.type === "ellipse") {
            Object.assign(newShape, { cx: newBounds.x + newBounds.width / 2, cy: newBounds.y + newBounds.height / 2, rx: newBounds.width / 2, ry: newBounds.height / 2 });
        } else if (shape.type === "line" || shape.type === "arrow") {
            Object.assign(newShape, {
                x1: newBounds.x + (shape.x1 - oldBounds.x) * scaleX, y1: newBounds.y + (shape.y1 - oldBounds.y) * scaleY,
                x2: newBounds.x + (shape.x2 - oldBounds.x) * scaleX, y2: newBounds.y + (shape.y2 - oldBounds.y) * scaleY
            });
        } else if (shape.type === "text") {
            newShape.lineWidth = shape.lineWidth * scaleY;
            newShape.x = newBounds.x;
            newShape.y = newBounds.y + (newShape.lineWidth * 8 * 0.8);
        }
        return newShape;
    }, []);

    const saveCanvasState = useCallback(() => {
        if (!canvasRef.current) return;
        
        // Check if the canvas is empty to avoid sending empty white rectangles
        if (shapesRef.current.length === 0) {
            onAnswerChange(questionId, "");
            return;
        }

        // Export as JPEG with 0.5 (50%) quality instead of raw PNG
        // This reduces the Base64 string from ~5-10MB down to ~50-100KB
        const compressedBase64 = canvasRef.current.toDataURL("image/jpeg", 0.5);
        
        onAnswerChange(questionId, compressedBase64);
    }, [questionId, onAnswerChange]);

    const startDrawing = useCallback((e) => {
        if (!canvasRef.current) return;
        const { x, y } = getCanvasCoordinates(canvasRef.current, e);

        if (tool === "select") {
            const handleInfo = getResizeHandleAtPoint(x, y);
            if (handleInfo) {
                const shape = shapesRef.current.find(s => s.id === selectedShapeIdRef.current);
                if (shape) {
                    isResizingRef.current = true;
                    resizeHandleRef.current = handleInfo.handle;
                    resizeStartRef.current = { bounds: getShapeBounds(shape) };
                }
                return;
            }

            const shape = findShapeAtPoint(x, y);
            if (shape) {
                if (selectedShapeIdRef.current !== shape.id) {
                    setSelectedShapeId(shape.id);
                    updateOffscreenCanvas(shape.id);
                }
                isMovingRef.current = true;
                moveStartRef.current = { x, y };
            } else {
                if (selectedShapeIdRef.current !== null) {
                    setSelectedShapeId(null);
                    updateOffscreenCanvas(null);
                }
            }
            scheduleRedraw();
            return;
        }

        if (tool === "text") {
            setTextPos({ x, y });
            setShowTextInput(true);
            return;
        }

        isDrawingRef.current = true;
        startPosRef.current = { x, y };
        currentPointsRef.current = [{ x, y }];
    }, [tool, getCanvasCoordinates, getResizeHandleAtPoint, findShapeAtPoint, getShapeBounds, scheduleRedraw, setSelectedShapeId, updateOffscreenCanvas]);

    const draw = useCallback((e) => {
        if (!canvasRef.current) return;
        const { x, y } = getCanvasCoordinates(canvasRef.current, e);

        if (tool === "select" && !isMovingRef.current && !isResizingRef.current) {
            const handleInfo = getResizeHandleAtPoint(x, y);
            applyNativeCursor(handleInfo ? handleInfo.cursor : (findShapeAtPoint(x, y) ? "move" : "default"));
        }

        if (tool === "select" && isResizingRef.current && resizeStartRef.current) {
            const oldBounds = resizeStartRef.current.bounds;
            const handle = resizeHandleRef.current;
            let newBounds = { ...oldBounds };
            
            if (handle === 'br') { newBounds.width = Math.max(10, x - oldBounds.x); newBounds.height = Math.max(10, y - oldBounds.y); } 
            else if (handle === 'tl') {
                newBounds.x = Math.min(x, oldBounds.x + oldBounds.width - 10);
                newBounds.y = Math.min(y, oldBounds.y + oldBounds.height - 10);
                newBounds.width = oldBounds.x + oldBounds.width - newBounds.x;
                newBounds.height = oldBounds.y + oldBounds.height - newBounds.y;
            } else if (handle === 'tr') {
                newBounds.y = Math.min(y, oldBounds.y + oldBounds.height - 10);
                newBounds.width = Math.max(10, x - oldBounds.x);
                newBounds.height = oldBounds.y + oldBounds.height - newBounds.y;
            } else if (handle === 'bl') {
                newBounds.x = Math.min(x, oldBounds.x + oldBounds.width - 10);
                newBounds.width = oldBounds.x + oldBounds.width - newBounds.x;
                newBounds.height = Math.max(10, y - oldBounds.y);
            }
            shapesRef.current = shapesRef.current.map(s => s.id === selectedShapeIdRef.current ? resizeShape(s, oldBounds, newBounds) : s);
            scheduleRedraw();
            return;
        }

        if (tool === "select" && isMovingRef.current && moveStartRef.current) {
            const dx = x - moveStartRef.current.x;
            const dy = y - moveStartRef.current.y;
            moveStartRef.current = { x, y };
            shapesRef.current = shapesRef.current.map(s => s.id === selectedShapeIdRef.current ? moveShape(s, dx, dy) : s);
            scheduleRedraw();
            return;
        }

        if (!isDrawingRef.current) return;

        if (tool === "pen" || tool === "eraser") {
            const lastPoint = currentPointsRef.current[currentPointsRef.current.length - 1];
            if (lastPoint) {
                const dx = x - lastPoint.x;
                const dy = y - lastPoint.y;
                if (dx * dx + dy * dy < 16) return; 
            }

            currentPointsRef.current.push({ x, y });
            scheduleRedraw(currentPointsRef.current);
        } else if (["square", "circle", "line", "arrow"].includes(tool)) {
            const startPos = startPosRef.current;
            let preview = null;
            if (tool === "square") preview = { type: "square", x: startPos.x, y: startPos.y, width: x - startPos.x, height: y - startPos.y, color, lineWidth };
            else if (tool === "circle") preview = { type: "ellipse", cx: (startPos.x + x) / 2, cy: (startPos.y + y) / 2, rx: Math.abs(x - startPos.x) / 2, ry: Math.abs(y - startPos.y) / 2, color, lineWidth };
            else if (tool === "line") preview = { type: "line", x1: startPos.x, y1: startPos.y, x2: x, y2: y, color, lineWidth };
            else if (tool === "arrow") preview = { type: "arrow", x1: startPos.x, y1: startPos.y, x2: x, y2: y, color, lineWidth };
            scheduleRedraw(null, preview);
        }
    }, [tool, color, lineWidth, getCanvasCoordinates, applyNativeCursor, getResizeHandleAtPoint, findShapeAtPoint, resizeShape, moveShape, scheduleRedraw]);

    const stopDrawing = useCallback((e) => {
        if (tool === "select") {
            if (isMovingRef.current || isResizingRef.current) {
                isMovingRef.current = false;
                isResizingRef.current = false;
                updateOffscreenCanvas(selectedShapeIdRef.current); 
                saveCanvasState();
            }
            return;
        }

        if (!isDrawingRef.current) return;
        const { x, y } = getCanvasCoordinates(canvasRef.current, e);
        const startPos = startPosRef.current;
        let newShape = null;

        if (["square", "circle", "line", "arrow"].includes(tool) && startPos) {
            if (tool === "square") newShape = { id: Date.now().toString(), type: "square", x: startPos.x, y: startPos.y, width: x - startPos.x, height: y - startPos.y, color, lineWidth };
            else if (tool === "circle") newShape = { id: Date.now().toString(), type: "ellipse", cx: (startPos.x + x) / 2, cy: (startPos.y + y) / 2, rx: Math.abs(x - startPos.x) / 2, ry: Math.abs(y - startPos.y) / 2, color, lineWidth };
            else if (tool === "line") newShape = { id: Date.now().toString(), type: "line", x1: startPos.x, y1: startPos.y, x2: x, y2: y, color, lineWidth };
            else if (tool === "arrow") newShape = { id: Date.now().toString(), type: "arrow", x1: startPos.x, y1: startPos.y, x2: x, y2: y, color, lineWidth };
        } else if ((tool === "pen" || tool === "eraser") && currentPointsRef.current.length > 0) {
            newShape = { id: Date.now().toString(), type: tool, points: [...currentPointsRef.current], color: tool === "eraser" ? "#ffffff" : color, lineWidth: tool === "eraser" ? 20 : lineWidth };
        }

        if (newShape) {
            shapesRef.current.push(newShape);
            updateOffscreenCanvas(selectedShapeIdRef.current);
        }

        isDrawingRef.current = false;
        startPosRef.current = null;
        currentPointsRef.current = [];
        scheduleRedraw();
        saveCanvasState();
    }, [tool, color, lineWidth, getCanvasCoordinates, updateOffscreenCanvas, scheduleRedraw, saveCanvasState]);

    const handleTextSubmit = useCallback(() => {
        if (!text || !textPos) return;
        shapesRef.current.push({ id: Date.now().toString(), type: "text", x: textPos.x, y: textPos.y, text, color, lineWidth });
        setText("");
        setTextPos(null);
        setShowTextInput(false);
        updateOffscreenCanvas(selectedShapeIdRef.current);
        scheduleRedraw();
        saveCanvasState();
    }, [text, textPos, color, lineWidth, updateOffscreenCanvas, scheduleRedraw, saveCanvasState]);

    const clearCanvas = useCallback(() => {
        shapesRef.current = [];
        setSelectedShapeId(null);
        updateOffscreenCanvas(null);
        scheduleRedraw();
        onAnswerChange(questionId, "");
    }, [questionId, onAnswerChange, setSelectedShapeId, updateOffscreenCanvas, scheduleRedraw]);

    const deleteSelectedShape = useCallback(() => {
        if (selectedShapeIdRef.current) {
            shapesRef.current = shapesRef.current.filter(s => s.id !== selectedShapeIdRef.current);
            setSelectedShapeId(null);
            updateOffscreenCanvas(null);
            scheduleRedraw();
            saveCanvasState();
        }
    }, [setSelectedShapeId, updateOffscreenCanvas, scheduleRedraw, saveCanvasState]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.key === "Delete" || e.key === "Backspace") && selectedShapeIdRef.current && !showTextInput) {
                e.preventDefault();
                deleteSelectedShape();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showTextInput, deleteSelectedShape]);

    const tools = [
        { id: "select", icon: Move, label: "Select" }, { id: "pen", icon: Pen, label: "Pen" },
        { id: "eraser", icon: Eraser, label: "Eraser" }, { id: "square", icon: Square, label: "Square" },
        { id: "circle", icon: Circle, label: "Circle" }, { id: "line", icon: Minus, label: "Line" },
        { id: "arrow", icon: ArrowRight, label: "Arrow" }, { id: "text", icon: Type, label: "Text" }
    ];

    return (
        <div className="flex flex-col gap-4 space-y-4 bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm w-full">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    {tools.map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            onClick={() => {
                                setTool(id);
                                if (id !== "select") {
                                    setSelectedShapeId(null);
                                    updateOffscreenCanvas(null);
                                    scheduleRedraw();
                                }
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                                tool === id
                                    ? "bg-[#f0f8f7] dark:bg-[#5c8374]/30 border-[#5c8374] text-[#5c8374] dark:text-[#9ec8b9]"
                                    : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="range" min="1" max="10" value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value))} className="w-24" />
                    </div>
                    
                    {selectedShapeId && (
                        <button onClick={deleteSelectedShape} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg border border-red-300 hover:bg-red-200">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={clearCanvas} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg border border-red-300 hover:bg-red-200">
                        Clear
                    </button>
                </div>
            </div>

            {/* Container fixed at 500px height with overflow-auto for scrollbars */}
            <div className="relative border-2 border-gray-300 dark:border-gray-600 rounded-xl overflow-auto bg-white h-[500px] w-full">
                <canvas
                    ref={canvasRef}
                    width={canvasWidth}
                    height={canvasHeight}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={(e) => isDrawingRef.current && stopDrawing(e)}
                    onTouchStart={(e) => { e.preventDefault(); startDrawing(e); }}
                    onTouchMove={(e) => { e.preventDefault(); draw(e); }}
                    onTouchEnd={stopDrawing}
                    style={{ 
                        width: `${canvasWidth}px`, 
                        height: `${canvasHeight}px`, 
                        maxWidth: "none",
                        transform: "translateZ(0)",
                        backfaceVisibility: "hidden"
                    }}
                    className="touch-none block"
                />
                
                {showTextInput && textPos && (
                    <div className="absolute z-10" style={{ left: textPos.x, top: textPos.y }}>
                        <input
                            ref={textInputRef}
                            type="text" value={text} onChange={(e) => setText(e.target.value)}
                            className="px-2 py-1 border-2 border-[#5c8374] rounded shadow-lg bg-gray-800 text-white outline-none"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleTextSubmit();
                                if (e.key === "Escape") { setShowTextInput(false); setText(""); setTextPos(null); }
                            }}
                        />
                    </div>
                )}
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                {tool === "select" 
                    ? "Click a shape to select it. Drag to move. Use corner handles to resize. Press Delete to remove."
                    : "Scroll down or sideways to explore the entire canvas drawing area."}
            </p>
        </div>
    );
}

export default DiagramCanvas;