import { flextree } from 'd3-flextree';
import { hierarchy } from 'd3-hierarchy';

const GAP_X = 50; // Horizontal gap between nodes
const GAP_Y = 10; // Vertical gap between nodes

/**
 * Calculates the X,Y coordinates for all nodes in the mind map.
 * Uses d3-flextree to produce a compact "masonry-like" tree layout.
 * 
 * @param {Object} rootNode - The root data object of the tree.
 * @param {Object} nodeDimensions - Map of node ID to { width, height }.
 * @returns {Object} { nodes: { [id]: {x,y} }, width, height }
 */
export const calculateMindMapLayout = (rootNode, nodeDimensions) => {
    if (!rootNode) return {};

    const positions = {};

    // 1. Separate Children into Left and Right trees
    const children = rootNode.children || [];
    const leftChildren = [];
    const rightChildren = [];

    // existing split logic
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

    // Default dimension fallback
    const getSize = (d) => {
        const dim = nodeDimensions[d.data.id] || { width: 100, height: 40 };
        // Add spacing to the node size for the layout engine
        return [dim.height + GAP_Y, dim.width + GAP_X];
        // Note: d3-flextree using [height, width] usually implies a horizontal layout if one rotates usage, 
        // but flextree standard is [x_size, y_size]. 
        // For a horizontal tree (growing right), 'size' usually means [height, width] in standard d3 terms because x is height-like (depth) and y is width-like (breadth) in vertical.
        // Wait, standard d3 tree(size) is [width, height]. 
        // d3-flextree default: nodeSize(d => [d.x_size, d.y_size]).
        // If we want horizontal layout (nodes vary in height vertically), the 'spacing' along the growth axis (X) is determined by node Width.
        // The 'spacing' along the sibling axis (Y) is determined by node Height.

        // Let's assume standard orientation (Top-Down) first for mental model, then swap X/Y?
        // Actually, d3-flextree creates vertical trees by default?
        // Let's stick to: we want (x, y). 
        // x = horizontal position (depth), y = vertical position (breadth).
        // Then node dimensions should be passed as [width, height]? 
        // Or [height, width]?

        // In flexible tree layouts:
        // If "nodeSize" returns [A, B], it means the node occupies A space in the dimension of children-stacking, and B space in the dimension of depth.
        // Actually, looking at d3-flextree docs/examples:
        // nodeSize(d => [d.width, d.height]) means space taken.
        // If we want Horizontal Layout (Root -> Right):
        // Sibilings stack Vertically (Y axis). So we need accurate 'Height' for stacking.
        // Depth increases Horizontally (X axis). So we need accurate 'Width'.

        // Let's configure it effectively:
        // We will generate a Vertical Layout (Root -> Down) because it's easier to reason about "width of siblings", 
        // and then SWAP x/y coordinates to make it Horizontal.

        // For Vertical Layout (Top -> Down):
        // x = horizontal (stacking of siblings side-by-side).
        // y = vertical (depth).

        // But we want Horizontal Layout (Left -> Right):
        // x = horizontal (depth).
        // y = vertical (stacking of siblings).

        // So if we simulate Vertical and swap:
        // We need 'nodeSize' to be [height, width]. 
        // Because in Vertical: 'x' is sibling separation (which maps to our Y Height), 
        // and 'y' is depth separation (which maps to our X Width).
    };

    // Layout configuration
    const layout = flextree()
        .nodeSize(d => getSize(d))
        .spacing((a, b) => 0); // Spacing already included in nodeSize or handle here. 
    // d3-flextree spacing is additive to nodeSize? 
    // usually nodeSize includes gap. Let's simplify and include GAP in nodeSize.

    // 2. Process RIGHT Subtree
    // Create a hierarchy including Root + Right Children
    const rightData = { ...rootNode, children: rightChildren };
    const rightRoot = hierarchy(rightData);
    layout(rightRoot);

    // Extract positions for Right side
    // Standard d3-flextree produces (x, y). 
    // Since we passed [height, width] as size:
    // calculation.x = position in sibling stacking dimension (Vertical Y).
    // calculation.y = position in depth dimension (Horizontal X).
    rightRoot.each(node => {
        // Adjust coordinates
        // node.x is vertical (Y). node.y is horizontal (X).
        // Standard d3 tree starts root at x=0, y=0.
        // We want y to be Y, x to be X.

        positions[node.data.id] = {
            x: node.y, // Depth -> X
            y: node.x  // Stack -> Y
        };
    });


    // 3. Process LEFT Subtree
    // Create a hierarchy including Root + Left Children
    const leftData = { ...rootNode, children: leftChildren };
    const leftRoot = hierarchy(leftData);
    layout(leftRoot);

    // Extract positions for Left side
    leftRoot.each(node => {
        // Ignore the root position itself (it's at 0,0, same as right).
        // For children:
        // node.y is horizontal depth (positive). We want it Negative (Left).
        // node.x is vertical stack.

        positions[node.data.id] = {
            x: -node.y, // Depth -> Negative X
            y: node.x   // Stack -> Y
        };
    });

    // 4. Centering Correction?
    // The root is at (0,0) for both trees.
    // However, the "center" of the root node in our UI should be at (0,0).
    // If layout assumes top-left of root is (0,0), we might need to shift.
    // For now, let's assume (0,0) is center of Root Node.
    // But d3 usually positions centers or top-lefts depending on impl.
    // d3-flextree: "The layout places the root node at (0, 0)."

    // 4. Shift Coordinates to Positive Space
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    Object.values(positions).forEach(pos => {
        if (pos.x < minX) minX = pos.x;
        if (pos.x > maxX) maxX = pos.x;
        if (pos.y < minY) minY = pos.y;
        if (pos.y > maxY) maxY = pos.y;
    });

    // Add padding
    const PADDING = 100; // General padding around the map
    const width = (maxX - minX) + (PADDING * 2);
    const height = (maxY - minY) + (PADDING * 2);

    const shiftedPositions = {};
    Object.keys(positions).forEach(key => {
        shiftedPositions[key] = {
            x: positions[key].x - minX + PADDING,
            y: positions[key].y - minY + PADDING
        };
    });

    // Root correction if needed? 
    // Usually shifting preserves relative structure which is what matters.

    return {
        nodes: shiftedPositions,
        width: Math.max(width, 100), // Min size
        height: Math.max(height, 100)
    };
};
