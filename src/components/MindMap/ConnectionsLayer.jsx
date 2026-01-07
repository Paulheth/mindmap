import React, { useEffect, useState, useCallback } from 'react';
import { useMap } from '../../context/MapContext';
import './ConnectionsLayer.css';

const ConnectionsLayer = () => {
    const { state } = useMap();
    const [paths, setPaths] = useState([]);

    const drawPaths = useCallback(() => {
        const canvas = document.querySelector('.map-canvas');
        if (!canvas) return;
        const canvasRect = canvas.getBoundingClientRect();

        const getCenter = (id) => {
            const el = document.getElementById(`node-${id}`);
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            // Compensation for zoom:
            // Visual Delta = rect - canvasRect.
            // Logical Delta = Visual Delta / Zoom.
            const zoom = state.zoom || 1;

            return {
                x: (rect.left - canvasRect.left) / zoom + (rect.width / zoom) / 2,
                y: (rect.top - canvasRect.top) / zoom + (rect.height / zoom) / 2,
                width: rect.width / zoom,
                height: rect.height / zoom
            };
        };

        const newPaths = [];

        // 1. Draw Tree Connections (Parent -> Child)
        const traverse = (node) => {
            // Skip collapsed children logic is handled by Node not rendering them, 
            // so `node.children` iteration here should check if they are actually in DOM?
            // If `node.isCollapsed` is true, Node component doesn't render children.
            // But `state.root` still has them.
            // We should respect `isCollapsed`.
            if (node.isCollapsed || !node.children || node.children.length === 0) return;

            const parentCenter = getCenter(node.id);
            if (!parentCenter) return;

            node.children.forEach(child => {
                const childCenter = getCenter(child.id);
                if (childCenter) {
                    // Determine direction based on position
                    // Standard Right-side growth: Child is to right of Parent.
                    // dX = endX - startX.
                    // If Right: dX > 0.
                    // If Left: dX < 0.
                    // Logic:
                    // Start (Parent Edge) -> End (Child Inner Edge).
                    // Actually, `getCenter` returns center.
                    // Proper anchor points:
                    // Right Side: Parent Right Edge -> Child Left Edge.
                    // Left Side: Parent Left Edge -> Child Right Edge.

                    let pX, pY, cX, cY;
                    if (childCenter.x < parentCenter.x) {
                        // Left Side
                        pX = parentCenter.x - parentCenter.width / 2;
                        pY = parentCenter.y;
                        cX = childCenter.x + childCenter.width / 2;
                        cY = childCenter.y;
                    } else {
                        // Right Side
                        pX = parentCenter.x + parentCenter.width / 2;
                        pY = parentCenter.y;
                        cX = childCenter.x - childCenter.width / 2;
                        cY = childCenter.y;
                    }

                    const distX = cX - pX;

                    // Curvature: always extend horizontally first.
                    // CP1 should be pX + offset (where offset is towards cX).
                    // CP2 should be cX - offset (where offset is towards pX).
                    // If distX is negative (Left), we want pX - abs(offset).
                    // Basically `pX + distX * 0.4` works for both directions?
                    // Right: 10 + 100*0.4 = 50. Correct.
                    // Left: 100 + (-100)*0.4 = 60. Correct.

                    const cp1x = pX + distX * 0.4;
                    const cp1y = pY;
                    const cp2x = cX - distX * 0.4;
                    const cp2y = cY;

                    newPaths.push({
                        id: `link-${node.id}-${child.id}`,
                        d: `M ${pX} ${pY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${cX} ${cY}`,
                        type: 'tree'
                    });

                    traverse(child);
                }
            });
        };

        traverse(state.root);

        // 2. Draw Arbitrary Links
        state.links.forEach((link) => {
            const fromCenter = getCenter(link.from);
            const toCenter = getCenter(link.to);
            if (fromCenter && toCenter) {
                const startX = fromCenter.x;
                const startY = fromCenter.y;
                const endX = toCenter.x;
                const endY = toCenter.y;

                // Straight line
                newPaths.push({
                    id: link.id,
                    d: `M ${startX} ${startY} L ${endX} ${endY}`,
                    type: 'custom',
                    style: link.style || 'dashed',
                    color: link.color || '#ef4444',
                    arrow: true // Default to arrow for custom links
                });
            }
        });

        setPaths(newPaths);
    }, [state]);

    useEffect(() => {
        const timer = setTimeout(drawPaths, 0);
        const handleResize = () => drawPaths();
        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, [drawPaths, state]);

    return (
        <svg className="connections-layer">
            <defs>
                <marker id="arrow-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                </marker>
                <marker id="arrow-blue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#2563eb" />
                </marker>
                <marker id="arrow-black" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#000000" />
                </marker>
            </defs>
            {paths.map(p => (
                <path
                    key={p.id}
                    d={p.d}
                    stroke={p.type === 'tree' ? '#94a3b8' : (p.color || '#ef4444')}
                    strokeWidth={p.type === 'tree' ? "2" : "2"}
                    strokeDasharray={(p.style === 'dashed' || p.type === 'custom') ? "5,5" : "none"}
                    fill="none"
                    markerEnd={p.type === 'custom' && p.arrow ? `url(#arrow-${p.color === '#2563eb' ? 'blue' : (p.color === '#ef4444' ? 'red' : 'black')})` : ''}
                />
            ))}
        </svg>
    );
};

export default ConnectionsLayer;
