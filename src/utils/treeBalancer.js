export const balanceTree = (root) => {
    if (!root || !root.children || root.children.length === 0) return root;

    // 1. Calculate weight (subtree size) for each direct child
    const getWeight = (node) => {
        if (!node.children || node.children.length === 0) return 1;
        // Simple weight: total number of descendant nodes + 1 (self)
        // Advanced weight: could use estimated height if we had font metrics, 
        // but count is a decent proxy for now.
        return 1 + node.children.reduce((acc, child) => acc + getWeight(child), 0);
    };

    const childrenWithWeight = root.children.map(child => ({
        node: child,
        weight: getWeight(child)
    }));

    // Start with empty buckets
    let leftWeight = 0;
    let rightWeight = 0;
    let leftChildren = [];
    let rightChildren = [];

    // Sort by weight descending to place largest blocks first (Greedy partition)
    // This helps strictly balance the big chunks.
    childrenWithWeight.sort((a, b) => b.weight - a.weight);

    childrenWithWeight.forEach(({ node, weight }) => {
        // If node has explicit side, respect it? 
        // User wants "Auto Balance", so we might override imports UNLESS they are locked?
        // Let's say: if side is set, we respect it, but track the weight.
        // If side is null/undefined, we assign to the lighter side.

        if (node.side === 'left') {
            leftChildren.push(node);
            leftWeight += weight;
        } else if (node.side === 'right') {
            rightChildren.push(node);
            rightWeight += weight;
        } else {
            // Greedy assignment to standard layout
            if (leftWeight <= rightWeight) {
                node.side = 'left';
                leftChildren.push(node);
                leftWeight += weight;
            } else {
                node.side = 'right';
                rightChildren.push(node);
                rightWeight += weight;
            }
        }
    });

    // Reconstruct children array with new side properties assigned
    // Note: We don't change the order in the array necessarily, Node.jsx filters by side.
    // But for clean state, let's keep them all in root.children

    // We mutated `node.side` in place above.
    return root;
};
