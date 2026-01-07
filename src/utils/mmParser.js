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

        const style = {
            backgroundColor: '#ffffff',
            color: '#000000',
            fontSize: 14,
            fontWeight: 'normal',
            fontStyle: 'normal'
        };

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
            date: null,
            style,
            // Capture side preference
            side: position === 'left' || position === 'right' ? position : null,
            isCollapsed: folded,
            children: []
        };

        // Recursive children
        // Use .children to get direct element children, but filter for "node" tag
        const childNodes = Array.from(xmlNode.children).filter(child => child.tagName === 'node');

        childNodes.forEach(childXml => {
            node.children.push(parseNode(childXml));
        });

        return node;
    };

    const rootNode = parseNode(rootXmlNode);
    rootNode.id = 'root'; // Force ID for compatibility

    // Ensure root specific styling/defaults
    rootNode.text = rootNode.text || "Central Topic";
    // Override root style to default blue if it wasn't specified, or keep if it was? 
    // Let's reset root style to be consistent with our app unless the file specified something.
    if (!rootXmlNode.getAttribute("BACKGROUND_COLOR")) {
        rootNode.style.backgroundColor = '#2563eb';
        rootNode.style.color = '#ffffff';
        rootNode.style.fontSize = 24;
        rootNode.style.fontWeight = 'bold';
    }

    return {
        root: rootNode,
        selectedIds: [rootNode.id],
        editingId: null,
        links: [],
        zoom: 1,
        view: 'map'
    };
};
