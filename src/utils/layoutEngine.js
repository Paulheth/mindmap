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
export const calculateMindMapLayout = (rootNode, nodeDimensions = {}, spacingFactor = 5, previousPositions = {}) => {
    // 0. Safety Checks
    if (!rootNode) return { nodes: {}, width: 100, height: 100 };

    try {
        const nodes = {};

        // Config defaults in case of weirdness
        const safeSpacing = Number.isFinite(spacingFactor) ? spacingFactor : 5;
        const nodeSep = 10 + (safeSpacing * 1); // Vertical gap (Tighter)
        const levelSep = 60 + (safeSpacing * 8); // Horizontal gap (Wider)

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

                if (!node.isCollapsed && node.children && node.children.length > 0) {
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
            const flatten = (node, x, y) => {
                const info = localNodes[node.id];
                if (!info) return;

                info.relX = x;
                info.relY = y;

                if (!node.isCollapsed && node.children && node.children.length > 0) {
                    let currentY = -(info.childBlockHeight / 2);

                    node.children.forEach(child => {
                        const childInfo = localNodes[child.id];
                        if (!childInfo) return;

                        const childH = childInfo.totalHeight;
                        const childY = currentY + (childH / 2);

                        const dir = direction === 'RIGHT' ? 1 : -1;
                        const childRelX = (info.itemWidth / 2 + levelSep + childInfo.itemWidth / 2) * dir;

                        flatten(child, x + childRelX, y + childY);

                        currentY += childH + nodeSep;
                    });
                }
            };

            flatten(l1Node, 0, 0);

            return {
                ...rootLayout,
                nodes: localNodes
            };
        };

        // ---------------------------------------------------------
        // 2. MACRO LAYOUT (Force Simulation for L1 Islands)
        // ---------------------------------------------------------

        // Start with Root at 0,0
        nodes[rootNode.id] = { x: 0, y: 0 };

        if (!rootNode.children || rootNode.children.length === 0) {
            return { nodes, width: 200, height: 200 };
        }

        const l1Nodes = rootNode.children.map((child, i) => {
            const isRight = i % 2 === 0;
            const direction = isRight ? 'RIGHT' : 'LEFT';
            if (!child.id) child.id = `fallback-${i}`;

            const layout = calculateBranchLayout(child, direction);
            const radius = (Math.max(layout.totalWidth, layout.totalHeight) / 2) + 20;

            // Seed Position Logic
            let initialX = Math.cos((i / rootNode.children.length) * Math.PI * 2) * 200;
            let initialY = Math.sin((i / rootNode.children.length) * Math.PI * 2) * 200;

            // If we have a previous position, USE IT to minimize jumpiness
            if (previousPositions && previousPositions[child.id]) {
                initialX = previousPositions[child.id].x;
                initialY = previousPositions[child.id].y;
            }

            const nodeObj = {
                id: child.id,
                ...layout,
                direction,
                x: initialX,
                y: initialY,
                radius: radius
            };

            // Respect Manual Positioning (Strongest override)
            if (child.x !== null && child.x !== undefined && child.y !== null && child.y !== undefined) {
                nodeObj.fx = child.x;
                nodeObj.fy = child.y;
                nodeObj.x = child.x;
                nodeObj.y = child.y;
            }

            return nodeObj;
        });

        // Create simulation nodes including dummy root (fixed at 0,0)
        const simNodes = [...l1Nodes, { id: 'root', x: 0, y: 0, fx: 0, fy: 0 }];

        const simulation = forceSimulation(simNodes)
            .alpha(0.1) // Start very cold
            .alphaDecay(0.02)
            .force("x", forceX(d => {
                if (d.id === 'root') return 0;
                return d.direction === 'RIGHT' ? 300 : -300;
            }).strength(0.01)) // Bare minimum to suggest a side
            .force("y", forceY(0).strength(0.01)) // Very weak centering
            .force("link", forceLink(l1Nodes.map(d => ({ source: 'root', target: d.id })))
                .id(d => d.id)
                .distance(d => {
                    const target = d.target;
                    let h = 100;
                    if (typeof target === 'object' && target.totalHeight) h = target.totalHeight;
                    else if (typeof target === 'string') {
                        const found = l1Nodes.find(n => n.id === target);
                        if (found) h = found.totalHeight;
                    }
                    return 50 + (Math.min(h, 600) * 0.4) + (safeSpacing * 5);
                })
                .strength(0.2)
            )
            .force("charge", forceManyBody().strength(d => {
                return -50 - (d.radius * 0.5);
            }))
            .force("collide", forceCollide().radius(d => d.radius + 30).strength(0.5));

        // Run simulation
        simulation.stop();
        const NUM_TICKS = 150; // Fewer ticks + low alpha = smoother transitions
        for (let i = 0; i < NUM_TICKS; ++i) {
            simulation.tick();
        }

        // ---------------------------------------------------------
        // 3. COMPOSE (Stitch Micro to Macro)
        // ---------------------------------------------------------

        l1Nodes.forEach(l1 => {
            if (!l1.nodes) return;
            Object.keys(l1.nodes).forEach(descendantId => {
                // center nodes around the simulated center
                const relPos = l1.nodes[descendantId];
                const dims = nodeDimensions[descendantId] || { width: 100, height: 40 };

                nodes[descendantId] = {
                    x: l1.x + relPos.relX - (dims.width / 2),
                    y: l1.y + relPos.relY - (dims.height / 2)
                };
            });
        });

        // Update L1 Node itself (it's not in l1.nodes? Wait, verify flatten logic)
        // Previous flatten logic put l1Node in localNodes[l1Node.id].
        // So the loop above HANDLES the L1 node too.
        // BUT we need to make sure the ROOT is handled.

        // Root is special, it's at 0,0 but we need to center it visually
        const rDims = nodeDimensions[rootNode.id] || { width: 100, height: 40 };
        nodes[rootNode.id] = {
            x: -rDims.width / 2,
            y: -rDims.height / 2
        };

        // ---------------------------------------------------------
        // 4. BOUNDS Check (Meta only, no shifting)
        // ---------------------------------------------------------

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        Object.values(nodes).forEach(n => {
            if (n.x < minX) minX = n.x;
            if (n.x > maxX) maxX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.y > maxY) maxY = n.y;
        });

        // Return raw nodes (centered at Origin)
        // Return calculated width/height for container sizing if needed
        return {
            nodes,
            width: (maxX - minX) + 1000,
            height: (maxY - minY) + 1000
        };

    } catch (error) {
        console.error("Layout Engine Crash Detected:", error);
        const fallbackNodes = {};
        if (rootNode) fallbackNodes[rootNode.id] = { x: 0, y: 0 };
        return { nodes: fallbackNodes, width: 1000, height: 1000 };
    }
};
