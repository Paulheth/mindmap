import { v4 as uuidv4 } from 'uuid';

export const parseMMFile = (xmlContent) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

    const mapNode = xmlDoc.getElementsByTagName("map")[0];
    if (!mapNode) {
        throw new Error("Invalid .mm file: No <map> tag found.");
    }

    const rootXmlNode = mapNode.querySelector("node");
    if (!rootXmlNode) {
        throw new Error("Invalid .mm file: No root <node> found.");
    }

    const parseNode = (xmlNode) => {
        const id = uuidv4();
        const text = xmlNode.getAttribute("TEXT") || xmlNode.getAttribute("text") || "Node";
        const folded = xmlNode.getAttribute("FOLDED") === "true";
        const position = xmlNode.getAttribute("POSITION") || xmlNode.getAttribute("position");
        const dateAttr = xmlNode.getAttribute("DATE") || xmlNode.getAttribute("date");
        const noteAttr = xmlNode.getAttribute("NOTE") || xmlNode.getAttribute("note");

        let noteContent = noteAttr || null;

        // Try to find richcontent note if attribute is missing
        if (!noteContent) {
            const richContent = Array.from(xmlNode.childNodes).find(
                child => child.nodeName === 'richcontent' && child.getAttribute('TYPE') === 'NOTE'
            );
            if (richContent) {
                // Simplified extraction: just get text content of body
                // Ideally this would parse HTML to plain text or keep HTML if we supported it
                // For now, let's try to get the text inside <p> or just pure text
                noteContent = richContent.textContent.trim();
            }
        }

        const style = {};

        // Try to capture some basic styling
        if (xmlNode.getAttribute("COLOR")) {
            style.color = xmlNode.getAttribute("COLOR");
        }
        if (xmlNode.getAttribute("BACKGROUND_COLOR")) {
            style.backgroundColor = xmlNode.getAttribute("BACKGROUND_COLOR");
        }

        const node = {
            id,
            text,
            date: dateAttr || null,
            note: noteContent,
            style,
            // Capture side preference
            side: position === 'left' || position === 'right' ? position : null,
            isCollapsed: folded,
            children: []
        };

        // Recursive children
        // Use childNodes to be safe across XML DOM implementations
        if (xmlNode.childNodes) {
            for (let i = 0; i < xmlNode.childNodes.length; i++) {
                const child = xmlNode.childNodes[i];
                if (child.nodeType === 1 && child.tagName.toLowerCase() === 'node') {
                    node.children.push(parseNode(child));
                }
            }
        }


        return node;
    };

    const rootNode = parseNode(rootXmlNode);
    rootNode.id = 'root'; // Force ID for compatibility
    rootNode.isCollapsed = false; // Always expand root on load, regardless of file state

    // Ensure root specific styling/defaults
    rootNode.text = rootNode.text || "Central Topic";
    // We do NOT hardcode styles here anymore. 
    // The MapContext will inject default levelStyles, and the Root node will inherit Level 0 style (Blue).
    // Unless the XML explicitly had attributes, which are captured above.

    return {
        root: rootNode,
        selectedIds: [rootNode.id],
        editingId: null,
        links: [],
        zoom: 1,
        view: 'map'
    };
};
