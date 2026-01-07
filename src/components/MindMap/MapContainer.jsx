import React, { useEffect, useRef } from 'react';
import { useMap } from '../../context/MapContext';
import Node from './Node';
import ConnectionsLayer from './ConnectionsLayer';
import './MapContainer.css';

const MapContainer = () => {
    const { state, dispatch } = useMap();
    const containerRef = useRef(null);

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

    return (
        <div className="map-container" ref={containerRef}>
            <div
                className="map-canvas"
                style={{
                    transform: `scale(${state.zoom || 1})`,
                }}
            >
                <ConnectionsLayer />
                <Node node={state.root} isRoot={true} />
            </div>
        </div >
    );
};

export default MapContainer;
