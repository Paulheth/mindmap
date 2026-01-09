import React, { useRef } from 'react';
import { useMap, initialState } from '../../context/MapContext';
import { useAuth } from '../../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import './MenuBar.css';

const MenuBar = () => {
    const { state, dispatch } = useMap();
    const { user, logout } = useAuth();
    const fileInputRef = useRef(null);

    const createNewMap = () => {
        if (!state.autoSave) {
            if (!confirm("You have auto-save disabled. Any unsaved changes will be lost. Create new map?")) {
                return;
            }
        } else {
            if (!confirm("Start a new map?")) {
                return;
            }
        }

        // Deep copy initial state to avoid reference issues
        const cleanState = JSON.parse(JSON.stringify(initialState));
        dispatch({ type: 'LOAD_MAP', payload: cleanState });
    };

    const importMM = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");

            // Basic recursive parser for FreeMind/Mindmup .mm
            // This is a simplified parser. FreeMind uses <map><node TEXT="..."><node .../></node></map>
            const parseNode = (xmlNode) => {
                const text = xmlNode.getAttribute('TEXT') || 'Node';
                const children = [];
                // Iterate child nodes
                for (let i = 0; i < xmlNode.childNodes.length; i++) {
                    const child = xmlNode.childNodes[i];
                    if (child.nodeName === 'node') {
                        children.push(parseNode(child));
                    }
                }
                return {
                    id: uuidv4(),
                    text: text,
                    date: null,
                    style: { backgroundColor: '#ffffff', color: '#000000', fontSize: 14 },
                    children: children
                };
            };

            const mapCheck = xmlDoc.getElementsByTagName('map')[0];
            if (mapCheck) {
                const rootXml = mapCheck.getElementsByTagName('node')[0]; // First node is root
                if (rootXml) {
                    const newRoot = parseNode(rootXml);
                    const newState = {
                        root: newRoot,
                        links: [] // Reset links as .mm links are complex (arrows), we skip for now
                    };
                    dispatch({ type: 'LOAD_MAP', payload: newState });
                }
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    };

    const saveMap = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "mindmap.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="menu-bar">
            <div className="menu-item">
                File
                <div className="dropdown">
                    <div className="dropdown-item" onClick={createNewMap}>New Map</div>
                    <div className="dropdown-item" onClick={() => fileInputRef.current.click()}>Import .mm file</div>
                    <div className="dropdown-item" onClick={saveMap}>Export JSON</div>
                    <div className="dropdown-separator"></div>
                    <div className="dropdown-item" onClick={logout}>Logout</div>
                </div>
            </div>
            <div className="menu-item">
                Edit
                <div className="dropdown">
                    <div className="dropdown-item" onClick={() => dispatch({ type: 'ADD_CHILD' })}>Add Child (Tab)</div>
                    <div className="dropdown-item" onClick={() => dispatch({ type: 'ADD_SIBLING' })}>Add Sibling (Enter)</div>
                    <div className="dropdown-item" onClick={() => dispatch({ type: 'DELETE_NODE' })}>Delete Node</div>
                </div>
            </div>
            <div className="menu-item">
                View
                <div className="dropdown">
                    <div className="dropdown-item">Map View</div>
                    <div className="dropdown-item">Timeline View</div>
                </div>
            </div>
            <div className="logo-area">Mind Map Manager</div>

            {user && (
                <div className="user-area" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                    <span>{user.email}</span>
                    <button onClick={logout} style={{ padding: '2px 8px', fontSize: '0.8rem' }}>Logout</button>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={importMM}
                accept=".mm"
                style={{ display: 'none' }}
            />
        </div>
    );
};

export default MenuBar;
