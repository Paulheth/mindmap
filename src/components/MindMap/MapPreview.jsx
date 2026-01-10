import React, { useRef, useLayoutEffect, useState } from 'react';
import { useMap } from '../../context/MapContext';
import Node from './Node';
import ConnectionsLayer from './ConnectionsLayer';

const MapPreview = ({ targetNodeId }) => {
    const { state } = useMap();
    const containerRef = useRef(null);
    const { nodePositions } = state;

    // We want to center the targetNode in our small window.
    // The window size is fixed (e.g. 300x200).
    const width = 300;
    const height = 200;
    const zoom = 0.6; // Preview zoom level

    // Helper to find parent
    const findParent = (node, childId) => {
        if (!node.children) return null;
        for (let child of node.children) {
            if (child.id === childId) return node;
            const found = findParent(child, childId);
            if (found) return found;
        }
        return null;
    };

    const parent = state.root ? findParent(state.root, targetNodeId) : null;

    // Center on Parent if exists, otherwise Target
    // User request: "focus in on the node 1 level up"
    const centerNodeId = parent ? parent.id : targetNodeId;
    const centerPos = nodePositions[centerNodeId];

    if (!centerPos) return <div style={{ width, height, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading Preview...</div>;

    // Calculate Transform to center centerPos
    // Center of window = width/2, height/2
    // Target on Canvas = centerPos.x, centerPos.y
    // We want: (centerPos.x * zoom) + translateX = width/2
    // => translateX = width/2 - (centerPos.x * zoom)

    const translateX = (width / 2) - (centerPos.x * zoom);
    const translateY = (height / 2) - (centerPos.y * zoom);

    return (
        <div
            style={{
                width,
                height,
                overflow: 'hidden',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                position: 'relative'
            }}
            ref={containerRef}
        >
            <div
                style={{
                    transform: `translate(${translateX}px, ${translateY}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    // Ensure the inner container is large enough? 
                    // No, usually ConnectionsLayer relies on DOM elements.
                    // We must render the NODES children first.
                }}
            >
                <ConnectionsLayer
                    idPrefix="preview-"
                    containerRef={containerRef}
                    zoomOverride={zoom}
                />

                {/* Render Root Node (recursive) using same positions but with ID prefix */}
                {state.root && nodePositions[state.root.id] && (
                    <div style={{
                        position: 'absolute',
                        transform: `translate(${nodePositions[state.root.id].x}px, ${nodePositions[state.root.id].y}px)`
                    }}>
                        <Node
                            node={state.root}
                            isRoot={true}
                            level={0}
                            positions={nodePositions} // Use GLOBAL positions
                            idPrefix="preview-" // Prevent ID collisions
                        // onReportSize - Not needed for preview, we trust main engine?
                        // Actually, if fonts differ or zoom differs, might vary slightly.
                        // But usually fine.
                        />
                    </div>
                )}
            </div>
            {/* Overlay Gradient to fade edges? Optional polish. */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(circle, transparent 50%, rgba(248,250,252,0) 60%, rgba(248,250,252,1) 100%)'
            }}></div>
        </div>
    );
};

export default MapPreview;
