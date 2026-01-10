import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { useMap } from '../../context/MapContext';
import { calculateMindMapLayout } from '../../utils/layoutEngine';
import Node from './Node';
import NoteEditor from './NoteEditor';
import ConnectionsLayer from './ConnectionsLayer';
import StyleEditor from './StyleEditor';
import TimelineView from '../Timeline/TimelineView';
import './MapContainer.css';

const MapContainer = ({ hidden = false }) => {
    const { state, dispatch } = useMap();
    const containerRef = useRef(null);

    const [nodeDimensions, setNodeDimensions] = useState({});
    // Local state for animation smoothness, but we sync to global for other views
    const [localNodePositions, setLocalNodePositions] = useState({});
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    // Use global positions if local are empty (e.g. init) to avoid jump?
    // Actually, we should probably stick to local for rendering THIS component to avoid context loop,
    // and sync to global for OTHERS. 
    // BUT if we want pop-up to be perfectly synced, maybe we should just use global?
    // If we use global, every layout tick causes a context update -> re-render of everything.
    // That might be heavy. 
    // Better: Run layout -> Set Local -> Sync Global (Debounced or Post-Layout).
    // Given the request "Persistent Layout Engine", MapContainer IS the engine.

    // Let's use Local for rendering here, and side-effect dispatch to global.

    // Calculate Layout whenever tree or dimensions change
    useLayoutEffect(() => {
        if (!state.root) return;
        // Pass current (previous) positions to seed the next layout
        const layout = calculateMindMapLayout(state.root, nodeDimensions, state.layoutSpacing, localNodePositions);

        setLocalNodePositions(layout.nodes || {});
        setCanvasSize({ width: layout.width || 0, height: layout.height || 0 });

        // Sync to global state for Timeline/Popups
        if (Object.keys(layout.nodes || {}).length > 0) {
            dispatch({ type: 'UPDATE_ALL_NODE_POSITIONS', payload: layout.nodes });
        }
    }, [state.root, nodeDimensions, state.layoutSpacing]); // Removed state.view dependency so it runs always (if mounted)

    // Deep Linking / Focus Logic
    // Runs when layout is ready (localNodePositions populated)
    const handledFocusId = useRef(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const focusId = params.get('focus');

        // If we have a focus ID, and it's different from the one we last handled
        // AND we have the position for it.
        if (focusId && focusId !== handledFocusId.current && localNodePositions[focusId]) {
            const targetPos = localNodePositions[focusId];

            // Mark as handled appropriately
            handledFocusId.current = focusId;

            // Calculate Pan to Center Target
            // Center Screen = Window / 2
            // Target Canvas = targetPos
            // Pan = Center Screen - (Target Canvas * Zoom)
            // But Pan Logic in handleWheel is: Mouse - (Mouse - Pan) * Ratio...
            // Simple render transform is: translate(Pan) scale(Zoom)
            // So: ScreenX = (CanvasX * Zoom) + PanX
            // => PanX = ScreenX - (CanvasX * Zoom)

            const zoom = 1; // Force 100% zoom on focus? Or keep current? Let's reset to 1 for clarity.
            const screenCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

            const newPan = {
                x: screenCenter.x - (targetPos.x * zoom),
                y: screenCenter.y - (targetPos.y * zoom)
            };

            setLocalPan(newPan);
            dispatch({ type: 'SET_PAN', payload: newPan });
            dispatch({ type: 'SET_ZOOM', payload: zoom });
            dispatch({ type: 'SELECT_NODE', payload: { id: focusId, multi: false } });
            dispatch({ type: 'SET_VIEW', payload: 'map' }); // Force map view in case new tab inherited timeline state

            // Clean URL to prevent re-focusing on reload? 
            // Maybe not, user might want to bookmark. 
        }
    }, [localNodePositions, dispatch]); // Dependency on localNodePositions ensures we wait for layout

    // Optimize size reporting to avoid unnecessary re-renders
    const handleReportSize = useCallback((id, width, height) => {
        setNodeDimensions(prev => {
            const current = prev[id];
            if (current && Math.abs(current.width - width) < 2 && Math.abs(current.height - height) < 2) {
                return prev;
            }
            return { ...prev, [id]: { width, height } };
        });
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case 'Tab':
                    e.preventDefault();
                    if (state.selectedIds.length > 0) dispatch({ type: 'ADD_CHILD' });
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (state.selectedIds.length > 0) dispatch({ type: 'ADD_SIBLING' });
                    break;
                case 'Backspace':
                case 'Delete':
                    if (state.selectedIds.length > 0) dispatch({ type: 'DELETE_NODE' });
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    dispatch({ type: 'NAVIGATE', payload: { direction: 'UP' } });
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    dispatch({ type: 'NAVIGATE', payload: { direction: 'DOWN' } });
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    dispatch({ type: 'NAVIGATE', payload: { direction: 'LEFT' } });
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    dispatch({ type: 'NAVIGATE', payload: { direction: 'RIGHT' } });
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.selectedIds, dispatch]);

    // Render Timeline View if active
    if (state.view === 'timeline' && !hidden) {
        return (
            <div className="map-container" ref={containerRef}>
                <TimelineView />
            </div>
        );
    }

    if (hidden) {
        // Render minimal for layout engine only
        // We still need the DOM for size measurement (onReportSize in Node)
        // So we render fully but with visibility hidden
        // And absolute positioning off-screen or z-index behind?
        // Visibility hidden is safest for layout.
    }

    // Panning Logic (Local state for performance, sync to context on end)
    // Default to Center of Screen if state.pan is 0,0
    const [localPan, setLocalPan] = useState(() => {
        if (state.pan && (state.pan.x !== 0 || state.pan.y !== 0)) return state.pan;
        return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    });

    const isDragging = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    // Sync local pan if context changes external to dragging (e.g. load)
    useEffect(() => {
        if (!isDragging.current && state.pan) {
            // Only update if significantly different (avoid override loops)
            // or if we want to enforce external changes
            if (Math.abs(state.pan.x - localPan.x) > 1 || Math.abs(state.pan.y - localPan.y) > 1) {
                setLocalPan(state.pan);
            }
        }
    }, [state.pan]);

    const handleMouseDown = (e) => {
        // Only trigger on left click and if clicking background properties
        if (e.button !== 0) return;
        // Allow dragging if target is the container or canvas directly
        // (Prevent dragging when clicking inside a node)
        // Check if event target is part of a node-card? 
        if (e.target.closest('.node-content') || e.target.closest('.note-editor')) return;

        isDragging.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current) return;

        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;

        setLocalPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        if (isDragging.current) {
            isDragging.current = false;
            // Commit to context
            dispatch({ type: 'SET_PAN', payload: localPan });
        }
    };

    const handleMouseLeave = () => {
        if (isDragging.current) {
            isDragging.current = false;
            dispatch({ type: 'SET_PAN', payload: localPan });
        }
    };

    // --- Manual Node Repositioning (Drag 2nd Level) ---
    const handleDragOver = (e) => {
        e.preventDefault(); // Allow drop
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const dragId = e.dataTransfer.getData('nodeId');
        if (!dragId) return;

        // Check if this node is a 2nd level node (child of root)
        // We can check if its parent is 'root'. 
        // Or simpler: Just allow setting x/y on ANY node, but LayoutEngine only respects it for L1 nodes currently.
        // This is fine. Moving deeply nested nodes manually without logic support might be weird but safe.

        // Calculate Canvas Coordinates
        // Canvas is transformed by: translate(panX, panY) scale(zoom)
        // Mouse ClientX/Y relative to Container
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Apply Inverse Transform
            // localPan is the current visual translation
            // zoom is state.zoom
            const zoom = state.zoom || 1;

            // x_canvas = (x_screen - panX) / zoom
            const canvasX = (mouseX - localPan.x) / zoom;
            const canvasY = (mouseY - localPan.y) / zoom;

            // We need to center the node? 
            // The coordinates we set (node.x, node.y) are what the LayoutEngine treats as "Center" (for forces).
            // So calculating the drop point as the new center is correct.

            // Dispatch update
            dispatch({
                type: 'UPDATE_NODE_POSITION',
                payload: { id: dragId, x: canvasX, y: canvasY }
            });
        }
    };

    const handleWheel = (e) => {
        // e.preventDefault(); // React synthetic event might not support this for passive listeners
        // But overflow:hidden prevents scrolling anyway.

        const scaleSensitivity = 0.001; // Adjust for trackpad/mouse
        const delta = -e.deltaY;
        const currentZoom = state.zoom || 1;

        // Calculate new zoom
        // limit change per event to avoid huge jumps
        let newZoom = currentZoom + delta * scaleSensitivity * currentZoom;
        newZoom = Math.min(Math.max(0.1, newZoom), 5); // Clamp 0.1 to 5

        if (containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const mouseX = e.clientX - containerRect.left;
            const mouseY = e.clientY - containerRect.top;

            // PanNew = Mouse - (Mouse - PanOld) * (ZoomNew / ZoomOld)
            const currentPanX = localPan.x;
            const currentPanY = localPan.y;

            const ratio = newZoom / currentZoom;

            const newPanX = mouseX - (mouseX - currentPanX) * ratio;
            const newPanY = mouseY - (mouseY - currentPanY) * ratio;

            const newPan = { x: newPanX, y: newPanY };

            // Update Visuals
            setLocalPan(newPan);

            // Update Context
            dispatch({ type: 'SET_ZOOM', payload: newZoom });
            dispatch({ type: 'SET_PAN', payload: newPan });
        }
    };

    return (
        <div
            className="map-container"
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={hidden ? { visibility: 'hidden', position: 'absolute', pointerEvents: 'none', zIndex: -1, width: '100%', height: '100%' } : {}}
        >
            <div
                className={`map-canvas`}
                style={{
                    transform: `translate(${localPan.x}px, ${localPan.y}px) scale(${state.zoom || 1})`,
                    position: 'relative',
                    width: canvasSize.width,
                    height: canvasSize.height,
                    transformOrigin: '0 0' // Must be 0 0 for Top-Left based pan/zoom math to work correctly
                    // With FlexTree layout, center might be better, but let's test.
                    // If zoom is handled by simple scale, transform origin matters.
                }}
            >
                <ConnectionsLayer />
                {state.root && localNodePositions[state.root.id] && (
                    <div style={{
                        position: 'absolute',
                        transform: `translate(${localNodePositions[state.root.id].x}px, ${localNodePositions[state.root.id].y}px)`
                    }}>
                        <Node
                            node={state.root}
                            isRoot={true}
                            level={0}
                            positions={localNodePositions}
                            onReportSize={handleReportSize}
                        />
                    </div>
                )}
                {state.editingNoteId && localNodePositions[state.editingNoteId] && (() => {
                    const nodeId = state.editingNoteId;
                    const pos = localNodePositions[nodeId];
                    const dims = nodeDimensions[nodeId] || { width: 100, height: 40 };
                    // pos.y is horizontal (left/right) in this swapped layout system?
                    // Checked Node uses transform(y, x).
                    // So 'left' = y. 
                    // Nodes are centered at y? Or y is left edge?
                    // d3-flextree usually layout(root) returns coordinates of center.
                    // Let's assume center for now. If it looks off, we adjust.
                    // Editor Left = Node Center X (pos.y) + Half Width + Gap
                    const editorX = pos.y + (dims.width / 2) + 5;
                    const editorY = pos.x - 20; // Slightly above center Y

                    return <NoteEditor position={{ x: editorX, y: editorY }} />;
                })()}
            </div>
            <StyleEditor />
        </div >
    );
};

export default MapContainer;
