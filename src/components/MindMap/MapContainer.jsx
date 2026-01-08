import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { useMap } from '../../context/MapContext';
import { calculateMindMapLayout } from '../../utils/layoutEngine';
import Node from './Node';
import ConnectionsLayer from './ConnectionsLayer';
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
        const layout = calculateMindMapLayout(state.root, nodeDimensions);
        setNodePositions(layout.nodes || {});
        setCanvasSize({ width: layout.width || 0, height: layout.height || 0 });
    }, [state.root, nodeDimensions, state.view]);

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

    return (
        <div className="map-container" ref={containerRef}>
            <div
                className={`map-canvas`} // Layout is now absolute, removed responsive classes
                style={{
                    transform: `scale(${state.zoom || 1})`,
                    position: 'relative', // Anchor for absolute children
                    width: canvasSize.width, // Explicit size from layout engine
                    height: canvasSize.height
                }}
            >
                <ConnectionsLayer />
                <Node
                    node={state.root}
                    isRoot={true}
                    positions={nodePositions}
                    onReportSize={handleReportSize}
                />
            </div>
        </div >
    );
};

export default MapContainer;
