export const generateMMFile = (state) => {
    const { root } = state;

    if (!root) return '';

    const escapeXml = (unsafe) => {
        return unsafe.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    };

    const buildNodeXml = (node, isRoot = false) => {
        const text = escapeXml(node.text || '');
        const folded = node.isCollapsed ? 'true' : 'false';

        let attrs = `TEXT="${text}" FOLDED="${folded}"`;

        // Add ID for stability if needed, though standard MM often doesn't force it.
        // ID="${node.id}" 

        // Style Attributes
        if (node.style) {
            if (node.style.color) attrs += ` COLOR="${node.style.color}"`;
            if (node.style.backgroundColor) attrs += ` BACKGROUND_COLOR="${node.style.backgroundColor}"`;
        }

        // Position (for root children mostly)
        if (node.side && !isRoot) {
            attrs += ` POSITION="${node.side}"`;
        }

        let xml = `<node ${attrs}>`;

        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                xml += buildNodeXml(child);
            });
        }

        xml += `</node>`;
        return xml;
    };

    const mapXml = `<map version="1.0.1">
${buildNodeXml(root, true)}
</map>`;

    return mapXml;
};
