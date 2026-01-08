import { flextree } from 'd3-flextree';
import { hierarchy } from 'd3-hierarchy';

/**
 * Calculates the X,Y coordinates for all nodes in the mind map.
 * Implements a "Masonry Wall" layout where first-level children are wrapped into columns
 * to fit a target aspect ratio / max-height.
 * 
 * @param {Object} rootNode - The root data object of the tree.
 * @param {Object} nodeDimensions - Map of node ID to { width, height }.
 * @param {number} spreadFactor - 0 (Vertical/Standard) to 10 (Wide/Wall). Default 0.
 * @returns {Object} { nodes: { [id]: {x,y} }, width, height }
 */
export const calculateMindMapLayout = (rootNode, nodeDimensions, spreadFactor = 0) => {
    if (!rootNode) return {};

    // Constants
    const GAP_X = 60;  // Horizontal gap between columns/nodes
    const GAP_Y = 10;  // Vertical gap between siblings

    // Map spreadFactor (0-10) to Max Column Height
    // 0 = Infinity (Standard Single Column)
    // 10 = Smallest Height (~600px) -> Forces many columns (Wide)
    const getColumnLimit = (f) => {
        if (f <= 0) return Infinity; // Pure Vertical
        // Range: 1 -> 3000px, 10 -> 600px
        const minH = 600;
        const maxH = 3000;
        return maxH - ((f - 1) / 9) * (maxH - minH);
    };
    const MAX_COL_HEIGHT = getColumnLimit(spreadFactor);

    // Helper: Get Node Size including gaps
    const getNodeSize = (d) => {
        const id = d.data.id;
        const dim = nodeDimensions[id] || { width: 100, height: 40 };
        return [dim.height + GAP_Y, dim.width + GAP_X]; // [y, x] for flextree
    };

    // Helper: Layout a single subtree (independent of others)
    // Returns: { positions: {id: {x,y}}, width, height, bounds: {minX...} }
    const layoutSubtree = (subRootNode) => {
        const tree = hierarchy(subRootNode);
        const layout = flextree()
            .nodeSize(d => getNodeSize(d))
            .spacing((a, b) => 0);

        layout(tree);

        const subtreePos = {};
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        tree.each(node => {
            // Swap X/Y for Horizontal Layout
            // Flextree X -> Our Y (Vertical Stack)
            // Flextree Y -> Our X (Depth)
            const x = node.y;
            const y = node.x;

            subtreePos[node.data.id] = { x, y };

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });

        // Handle case for single node
        if (minX === Infinity) { minX = 0; maxX = 0; minY = 0; maxY = 0; }

        return {
            positions: subtreePos,
            width: maxX - minX,
            height: maxY - minY,
            bounds: { minX, maxX, minY, maxY }
        };
    };

    const positions = {};
    positions[rootNode.id] = { x: 0, y: 0 }; // Root at center

    // Process Children
    const children = rootNode.children || [];
    const leftChildren = [];
    const rightChildren = [];

    // Split logic
    const hasExplicitSide = children.some(c => c.side);
    if (hasExplicitSide) {
        children.forEach(c => {
            if (c.side === 'left') leftChildren.push(c);
            else rightChildren.push(c);
        });
    } else {
        const midpoint = Math.ceil(children.length / 2);
        rightChildren.push(...children.slice(0, midpoint));
        leftChildren.push(...children.slice(midpoint));
    }

    // Function to pack subtrees into columns
    const packSide = (nodeList, direction) => {
        if (nodeList.length === 0) return;

        // 1. Calculate size of every child subtree
        const blocks = nodeList.map(node => {
            const layout = layoutSubtree(node);
            return {
                node,
                layout,
                // Effective block size in the "Wall"
                h: (layout.bounds.maxY - layout.bounds.minY) + GAP_Y,
                w: (layout.bounds.maxX - layout.bounds.minX) + GAP_X
            };
        });

        // 2. Pack into Columns
        // We track columns as a list of { blocks: [], x, width, height }
        const columns = [{ blocks: [], x: 0, width: 0, height: 0 }];

        blocks.forEach(block => {
            const current = columns[columns.length - 1];

            // Check if adding this block exceeds max height (and it's not the only block)
            if (MAX_COL_HEIGHT !== Infinity &&
                current.blocks.length > 0 &&
                (current.height + block.h) > MAX_COL_HEIGHT) {

                // Start new column
                const nextX = current.x + current.width;
                columns.push({
                    blocks: [block],
                    x: nextX,
                    width: block.w,
                    height: block.h
                });
            } else {
                // Add to current
                current.blocks.push(block);
                current.height += block.h;
                current.width = Math.max(current.width, block.w);
            }
        });

        // 3. Apply positions
        columns.forEach(col => {
            // Center the column vertically relative to Root
            const totalH = col.height - GAP_Y; // Remove last gap
            let currentY = -(totalH / 2); // Start Y (Top)

            col.blocks.forEach(block => {
                // Determine shifts
                // X: Standard column offset + Initial Gap
                const colXOffset = col.x + GAP_X;

                // Y: currentY aligns with Top of block.
                // We need to shift block so its Top (minY) is at currentY.
                const shiftY = currentY - block.layout.bounds.minY;

                // Merge Subtree Positions
                Object.entries(block.layout.positions).forEach(([id, pos]) => {
                    let finalX = pos.x + colXOffset;
                    let finalY = pos.y + shiftY;

                    if (direction === 'left') {
                        finalX = -finalX; // Mirror X
                    }

                    positions[id] = { x: finalX, y: finalY };
                });

                // Advance Y in column
                currentY += block.h;
            });
        });
    };

    packSide(rightChildren, 'right');
    packSide(leftChildren, 'left');

    return calculateBounds(positions);
};

// Helper to normalize coordinates
const calculateBounds = (positions) => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    Object.values(positions).forEach(pos => {
        if (pos.x < minX) minX = pos.x;
        if (pos.x > maxX) maxX = pos.x;
        if (pos.y < minY) minY = pos.y;
        if (pos.y > maxY) maxY = pos.y;
    });

    // Handle empty map
    if (minX === Infinity) return { nodes: positions, width: 100, height: 100 };

    const PADDING = 100;
    const width = (maxX - minX) + (PADDING * 2);
    const height = (maxY - minY) + (PADDING * 2);

    const shiftedPositions = {};
    Object.keys(positions).forEach(key => {
        shiftedPositions[key] = {
            x: positions[key].x - minX + PADDING,
            y: positions[key].y - minY + PADDING
        };
    });

    return {
        nodes: shiftedPositions,
        width: Math.max(width, 100),
        height: Math.max(height, 100)
    };
};
