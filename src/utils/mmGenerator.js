/**
 * mmGenerator.js
 * Generates FreeMind-compatible XML from the MindMap state.
 * Preserves custom attributes: COLOR, BACKGROUND_COLOR, DATE, NOTE.
 */

const formatColor = (color) => {
    if (!color) return null;
    return color; // Assuming hex or standard colors already
};

const escapeXml = (unsafe) => {
    if (!unsafe) return "";
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

const generateNodeXml = (node, isRoot = false) => {
    let xml = `<node ID="${node.id}"`;

    // 1. Text
    xml += ` TEXT="${escapeXml(node.text)}"`;

    // 2. Folding
    if (node.isCollapsed) {
        xml += ` FOLDED="true"`;
    }

    // 3. Position (only relevant for root children in FreeMind, but good to store)
    if (node.side) {
        xml += ` POSITION="${node.side}"`;
    }

    // 4. Custom Attributes

    // Style
    if (node.style) {
        if (node.style.color) xml += ` COLOR="${node.style.color}"`;
        if (node.style.backgroundColor) xml += ` BACKGROUND_COLOR="${node.style.backgroundColor}"`;
    }

    // Date (Custom Attribute)
    if (node.date) {
        xml += ` DATE="${escapeXml(node.date)}"`;
    }

    // Note (Custom Attribute for simple, RichContent for complex)
    // We will use BOTH for maximum compatibility. 
    // Attribute for lightweight parsers, RichContent for FreeMind/MindManager.
    if (node.note) {
        xml += ` NOTE="${escapeXml(node.note)}"`;
    }

    xml += `>`;

    // 5. Rich Content Note (Standard FreeMind way)
    if (node.note) {
        xml += `<richcontent TYPE="NOTE"><html><head></head><body><p>${escapeXml(node.note)}</p></body></html></richcontent>`;
    }

    // 6. Children
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
            xml += generateNodeXml(child);
        });
    }

    xml += `</node>`;
    return xml;
};

export const generateMMFileContent = (state) => {
    const header = `<map version="1.0.1">`;
    const body = generateNodeXml(state.root, true);
    const footer = `</map>`;
    return header + body + footer;
};
