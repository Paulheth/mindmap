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
            if (node.isCollapsed || !node.children || node.children.length === 0) return;

            const parentCenter = getCenter(node.id);
            if (!parentCenter) return;

            node.children.forEach(child => {
                const childCenter = getCenter(child.id);
                if (childCenter) {
                    // Smart / Flexible Connection Logic
                    // 1. Calculate relative positions
                    const dx = childCenter.x - parentCenter.x;
                    const dy = childCenter.y - parentCenter.y;
                    const absDx = Math.abs(dx);
                    const absDy = Math.abs(dy);

                    // 2. Determine "Exit" face for Parent and "Entry" face for Child
                    // Preference: Horizontal (side-to-side) for Mind Maps, but allow Vertical if steep.

                    let startX, startY, endX, endY;
                    let cp1x, cp1y, cp2x, cp2y;

                    // Parent Exit Point
                    // If strictly Right/Left (common in Mind Maps), force side.
                    // But for "Organic" 360, we might exit Bottom/Top.

                    // Simple logic: If mostly horizontal, use sides. If mostly vertical, use top/bottom?
                    // User Example looks like mostly Side connections even for vertical stacks, 
                    // BUT for the "Multiple Top Nodes" scenario, maybe they want freedom.
                    // Let's stick to Side-to-Side mostly as it's cleaner for text, 
                    // but adapt the handle length.

                    const isRight = dx > 0;

                    // Start from edges
                    startX = isRight ? (parentCenter.x + parentCenter.width / 2) : (parentCenter.x - parentCenter.width / 2);
                    startY = parentCenter.y;

                    endX = isRight ? (childCenter.x - childCenter.width / 2) : (childCenter.x + childCenter.width / 2);
                    endY = childCenter.y;

                    // 3. Curve Logic
                    // Standard Mind Map S-Curve
                    // CP1 projects horizontally from Parent
                    // CP2 projects horizontally from Child (to ensure straight entry)

                    // Slack/Strength of curve depends on distance
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const tension = Math.min(dist * 0.5, 150);

                    // Direction vector
                    const dir = isRight ? 1 : -1;

                    cp1x = startX + (tension * dir);
                    cp1y = startY;

                    cp2x = endX - (tension * dir);
                    cp2y = endY;

                    // SPECIAL CASE: Vertical Overlap (Child directly above/below)
                    // If dx is very small compared to dy, side-exit looks bad (C-curve).
                    // Switch to Bottom/Top exit/entry? 
                    // Let's try to keep it Side-Exit but reduce tension if vertical?
                    // Or, if absDx < parentWidth/2, maybe exit vertically?

                    // For now, robust S-curve works well for most organic layouts unless perfectly vertical.

                    newPaths.push({
                        id: `link-${node.id}-${child.id}`,
                        d: `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`,
                        type: 'tree'
                    });

                    traverse(child);
                }
            });
        };

        traverse(state.root);

        // 2. Draw Arbitrary Links
        state.links.forEach((link) => {
            // ... existing link logic ...
            const fromCenter = getCenter(link.from);
            const toCenter = getCenter(link.to);
            if (fromCenter && toCenter) {
                const startX = fromCenter.x;
                const startY = fromCenter.y;
                const endX = toCenter.x;
                const endY = toCenter.y;

                newPaths.push({
                    id: link.id,
                    d: `M ${startX} ${startY} L ${endX} ${endY}`,
                    type: 'custom',
                    style: link.style || 'dashed',
                    color: link.color || '#ef4444',
                    arrow: true
                });
            }
        });

        // 3. Draw Duplicate Name Connections (Light Dotted)
        const textMap = {};
        const collectText = (node) => {
            if (!node) return;
            const text = (node.text || '').trim().toLowerCase();
            if (text && text !== 'new node') { // Ignore default new nodes to reduce noise? User didn't specify, but "Duplicate Names" usually implies content.
                // Let's include everything as per request "same name".
                if (!textMap[text]) textMap[text] = [];
                textMap[text].push(node.id);
            }
            if (node.children) node.children.forEach(collectText);
        };
        collectText(state.root);

        Object.values(textMap).forEach(ids => {
            if (ids.length > 1) {
                // Connect in sequence: 0->1, 1->2...
                for (let i = 0; i < ids.length - 1; i++) {
                    const fromId = ids[i];
                    const toId = ids[i + 1];
                    const start = getCenter(fromId);
                    const end = getCenter(toId);

                    if (start && end) {
                        newPaths.push({
                            id: `dup-${fromId}-${toId}`,
                            d: `M ${start.x} ${start.y} L ${end.x} ${end.y}`, // Straight line
                            type: 'duplicate',
                            style: 'dotted',
                            color: '#cbd5e1' // Slate 300 (Lighter than branches, but width 2px keeps it visible)
                        });
                    }
                }
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
                    strokeWidth={p.type === 'duplicate' ? "2" : "2"}
                    strokeDasharray={(p.style === 'dashed' || p.type === 'custom') ? "5,5" : (p.style === 'dotted' ? "4,4" : "none")}
                    fill="none"
                    markerEnd={p.type === 'custom' && p.arrow ? `url(#arrow-${p.color === '#2563eb' ? 'blue' : (p.color === '#ef4444' ? 'red' : 'black')})` : ''}
                />
            ))}
        </svg>
    );
};

export default ConnectionsLayer;
