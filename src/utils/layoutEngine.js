import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCollide,
    forceX,
    forceY
} from 'd3-force';

/**
 * Calculates the X,Y coordinates using a Hybrid Force-Tree Layout.
 * Robust version with Try/Catch and Optimizations.
 * 
 * @param {Object} rootNode - The root data object of the tree.
 * @param {Object} nodeDimensions - Map of node ID to { width, height }.
 * @param {number} spacingFactor - 0 (Tight) to 10 (Loose). Default 5.
 * @returns {Object} { nodes: { [id]: {x,y} }, width, height }
 */
export const calculateMindMapLayout = (rootNode, nodeDimensions = {}, spacingFactor = 5) => {
    // 0. Safety Checks
    if (!rootNode) return { nodes: {}, width: 100, height: 100 };

    try {
        const nodes = {};

        // Config defaults in case of weirdness
        const safeSpacing = Number.isFinite(spacingFactor) ? spacingFactor : 5;
        const nodeSep = 20 + (safeSpacing * 2); // Vertical gap
        const levelSep = 40 + (safeSpacing * 5); // Horizontal gap

        // ---------------------------------------------------------
        // 1. MICRO LAYOUT (Calculate Branch Shapes)
        // ---------------------------------------------------------

        const calculateBranchLayout = (l1Node, direction = 'RIGHT') => {
            const localNodes = {};

            // Pass 1: Measure and Bubble Up Dimensions
            const measure = (node) => {
                const dims = nodeDimensions[node.id] || { width: 100, height: 40 };
                const w = dims.width || 100;
                const h = dims.height || 40;

                let childBlockHeight = 0;
                let childBlockWidth = 0;

                if (node.children && node.children.length > 0) {
                    node.children.forEach((child, i) => {
                        const childLayout = measure(child);
                        childBlockHeight += childLayout.totalHeight + (i > 0 ? nodeSep : 0);
                        childBlockWidth = Math.max(childBlockWidth, childLayout.totalWidth);
                    });
                }

                const totalHeight = Math.max(h, childBlockHeight);
                const totalWidth = w + (childBlockWidth > 0 ? levelSep + childBlockWidth : 0);

                // Store calculation results for Pass 2
                localNodes[node.id] = {
                    itemWidth: w,
                    itemHeight: h,
                    totalWidth,
                    totalHeight,
                    childBlockHeight,
                    relX: 0,
                    relY: 0
                };

                return localNodes[node.id];
            };

            const rootLayout = measure(l1Node);

            // Pass 2: Position (Flatten) using direct node traversal
            // Avoids O(N^2) lookup
            const flatten = (node, x, y) => {
                // Ensure we have measured info
                const info = localNodes[node.id];
                if (!info) return; // Should not happen

                // Set relative position for this node
                info.relX = x;
                info.relY = y;

                // Position children
                if (node.children && node.children.length > 0) {
                    let currentY = -(info.childBlockHeight / 2);

                    node.children.forEach(child => {
                        const childInfo = localNodes[child.id];
                        if (!childInfo) return;

                        const childH = childInfo.totalHeight;
                        const childY = currentY + (childH / 2);

                        const dir = direction === 'RIGHT' ? 1 : -1;
                        // Parent is at (x,y). Child X is offset by parent width + gap + child width/2
                        const childRelX = (info.itemWidth / 2 + levelSep + childInfo.itemWidth / 2) * dir;

                        // Recursive call with ACCUMULATED relative coordinates
                        // Wait, calculateBranchLayout wants coordinates relative to l1Node (0,0)
                        // x/y passed in here are relative to l1Node.
                        // So we pass x + childRelX, y + childY??
                        // 
                        // Actually, let's keep the logic simple:
                        // flatten sets the finalized coordinate relative to l1Node.

                        flatten(child, x + childRelX, y + childY);

                        currentY += childH + nodeSep;
                    });
                }
            };

            flatten(l1Node, 0, 0);

            return {
                ...rootLayout,
                nodes: localNodes // Now contains populated relX/relY
            };
        };

        // ---------------------------------------------------------
        // 2. MACRO LAYOUT (Force Simulation for L1 Islands)
        // ---------------------------------------------------------

        nodes[rootNode.id] = { x: 0, y: 0 };

        // If no children, early return
        if (!rootNode.children || rootNode.children.length === 0) {
            return { nodes, width: 200, height: 200 };
        }

        const l1Nodes = rootNode.children.map((child, i) => {
            const isRight = i % 2 === 0;
            const direction = isRight ? 'RIGHT' : 'LEFT';

            // Safety: Ensure child has ID
            if (!child.id) child.id = `fallback-${i}`;

            const layout = calculateBranchLayout(child, direction);

            // Radius estimation: Max dimension / 2 + padding
            const radius = (Math.max(layout.totalWidth, layout.totalHeight) / 2) + 20;

            return {
                id: child.id,
                ...layout,
                direction,
                // Scatter initial positions
                x: Math.cos((i / rootNode.children.length) * Math.PI * 2) * 200,
                y: Math.sin((i / rootNode.children.length) * Math.PI * 2) * 200,
                radius: radius
            };
        });

        // Create simulation nodes including dummy root
        const simNodes = [...l1Nodes, { id: 'root', x: 0, y: 0, fx: 0, fy: 0 }];

        const simulation = forceSimulation(simNodes)
            .force("center", forceX(0).strength(0.05))
            .force("centerY", forceY(0).strength(0.05))
            .force("link", forceLink(l1Nodes.map(d => ({ source: 'root', target: d.id })))
                .id(d => d.id)
                .distance(d => {
                    // Check target existence safely
                    const target = d.target; // Node object or ID
                    let h = 100;
                    // If it's the node object, use totalHeight
                    if (typeof target === 'object' && target.totalHeight) {
                        h = target.totalHeight;
                    }
                    // If we are looking up by ID in l1Nodes (manual simulation)
                    else if (typeof target === 'string') {
                        const found = l1Nodes.find(n => n.id === target);
                        if (found) h = found.totalHeight;
                    }

                    return 150 + (Math.min(h, 600) * 0.6) + (safeSpacing * 15);
                })
                .strength(0.5)
            )
            .force("charge", forceManyBody().strength(d => {
                // Heavier repulsion for larger subtrees
                return -500 - (d.radius * 3);
            }))
            .force("collide", forceCollide().radius(d => d.radius + 30).strength(1));

        // Run synchronously
        simulation.stop();
        const NUM_TICKS = 300;
        for (let i = 0; i < NUM_TICKS; ++i) {
            simulation.tick();
        }

        // ---------------------------------------------------------
        // 3. COMPOSE (Stitch Micro to Macro)
        // ---------------------------------------------------------

        l1Nodes.forEach(l1 => {
            // l1 is now the positioned "Sub-Root"
            if (!l1.nodes) return;

            Object.keys(l1.nodes).forEach(descendantId => {
                const relPos = l1.nodes[descendantId];
                nodes[descendantId] = {
                    x: l1.x + relPos.relX, // Note: we named it relX in flatten
                    y: l1.y + relPos.relY
                };
            });

            // Don't forget the l1 node itself (relative 0,0) - already handled by flatten logic?
            // Wait, flatten(l1Node, 0, 0) sets l1.nodes[l1Node.id] = {relX:0, relY:0}.
            // So the loop above handles the l1 node too.
        });

        // ---------------------------------------------------------
        // 4. BOUNDS & NORMALIZE
        // ---------------------------------------------------------

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        const checkBounds = (id, x, y) => {
            const dims = nodeDimensions[id] || { width: 100, height: 40 };
            const w = dims.width || 100;
            const h = dims.height || 40;
            if (x - w / 2 < minX) minX = x - w / 2;
            if (x + w / 2 > maxX) maxX = x + w / 2;
            if (y - h / 2 < minY) minY = y - h / 2;
            if (y + h / 2 > maxY) maxY = y + h / 2;
        };

        // Add root explicitly
        checkBounds(rootNode.id, 0, 0);

        Object.keys(nodes).forEach(id => {
            checkBounds(id, nodes[id].x, nodes[id].y);
        });

        if (minX === Infinity) return { nodes: {}, width: 100, height: 100 };

        const PADDING = 200;
        const width = (maxX - minX) + (PADDING * 2);
        const height = (maxY - minY) + (PADDING * 2);

        const shifted = {};

        // Root
        const rDims = nodeDimensions[rootNode.id] || { width: 100, height: 40 };
        shifted[rootNode.id] = {
            x: 0 - minX + PADDING - (rDims.width / 2),
            y: 0 - minY + PADDING - (rDims.height / 2)
        };

        Object.keys(nodes).forEach(id => {
            // We already centered them in calculation?
            // No, our calculations yielded CENTER coordinates.
            // The renderer expects Top-Left?
            // Usually renderer: style={{ left: node.x, top: node.y }}
            // If our x/y is center, we should subtract width/2.

            const dims = nodeDimensions[id] || { width: 100, height: 40 };
            shifted[id] = {
                x: nodes[id].x - minX + PADDING - (dims.width / 2),
                y: nodes[id].y - minY + PADDING - (dims.height / 2)
            };
        });

        return { nodes: shifted, width, height };

    } catch (error) {
        console.error("Layout Engine Crash Detected:", error);
        // Fallback: Place everything at zero or simple list to avoid white screen
        const fallbackNodes = {};
        if (rootNode) fallbackNodes[rootNode.id] = { x: 500, y: 500 };
        return { nodes: fallbackNodes, width: 1000, height: 1000 };
    }
};
