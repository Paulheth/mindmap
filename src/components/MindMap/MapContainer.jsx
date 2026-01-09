import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { useMap } from '../../context/MapContext';
import { calculateMindMapLayout } from '../../utils/layoutEngine';
import Node from './Node';
import ConnectionsLayer from './ConnectionsLayer';
import NoteEditor from './NoteEditor';
import StyleEditor from './StyleEditor';
import TimelineView from '../Timeline/TimelineView';
import './MapContainer.css';

const MapContainer = () => {
    const { state, dispatch } = useMap();
    const containerRef = useRef(null);

    const [nodeDimensions, setNodeDimensions] = useState({});
    const [nodePositions, setNodePositions] = useState({});
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    // Calculate Layout whenever tree or dimensions change
    // Only if we are in MAP view? Or always?
    // Optimization: Only layout if view is map.
    useLayoutEffect(() => {
        if (!state.root || state.view !== 'map') return;
        const layout = calculateMindMapLayout(state.root, nodeDimensions, state.layoutSpacing);
        setNodePositions(layout.nodes || {});
        setCanvasSize({ width: layout.width || 0, height: layout.height || 0 });
    }, [state.root, nodeDimensions, state.view, state.layoutSpacing]);

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
            if (e.target.tagName === 'INPUT') return;

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
    if (state.view === 'timeline') {
        return (
            <div className="map-container" ref={containerRef}>
                <TimelineView />
            </div>
        );
    }

    // Panning Logic (Local state for performance, sync to context on end)
    const [localPan, setLocalPan] = useState(state.pan || { x: 0, y: 0 });
    const isDragging = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });

    // Sync local pan if context changes external to dragging (e.g. load)
    useEffect(() => {
        if (!isDragging.current && state.pan) {
            setLocalPan(state.pan);
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
        >
            <div
                className={`map-canvas`}
                style={{
                    transform: `translate(${localPan.x}px, ${localPan.y}px) scale(${state.zoom || 1})`,
                    position: 'relative',
                    width: canvasSize.width,
                    height: canvasSize.height,
                    transformOrigin: 'center center' // Zoom from center? Or 0 0? Usually 0 0 for pan + zoom ease
                    // With FlexTree layout, center might be better, but let's test.
                    // If zoom is handled by simple scale, transform origin matters.
                    // Default logic usually assumes 0 0 if we translate manually.
                }}
            >
                <ConnectionsLayer />
                <Node
                    node={state.root}
                    isRoot={true}
                    level={0}
                    positions={nodePositions}
                    onReportSize={handleReportSize}
                />
                <NoteEditor />
            </div>
            <StyleEditor />
        </div >
    );
};

export default MapContainer;
