import React, { useRef } from 'react';
import { useMap, initialState } from '../../context/MapContext';
import { useAuth } from '../../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { parseMMFile } from '../../utils/mmParser';
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
                try {
                    if (file.name.toLowerCase().endsWith('.json')) {
                        const loadedState = JSON.parse(text);
                        if (!loadedState.root) throw new Error("Invalid JSON");
                        dispatch({ type: 'LOAD_MAP', payload: loadedState });
                    } else {
                        const parsedData = parseMMFile(text);
                        if (parsedData?.root) {
                            dispatch({
                                type: 'LOAD_MAP',
                                payload: { ...initialState, ...parsedData }
                            });
                        }
                    }
                } catch (error) {
                    alert("Import Failed: " + error.message);
                }
            };
            reader.readAsText(file);
        };

        const handleSaveConfirm = (filename, format) => {
            let content = '';
            let mimeType = '';
            let extension = '';

            if (format === 'json') {
                content = JSON.stringify(state, null, 2);
                mimeType = 'application/json';
                extension = 'json';
            } else {
                content = generateMMFileContent(state);
                mimeType = 'application/xml';
                extension = 'mm';
            }

            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };

        return (
            <div className="menu-bar">
                {/* File Menu */}
                <div className="menu-item">
                    File
                    <div className="dropdown">
                        <div className="dropdown-item" onClick={createNewMap}>New Map</div>
                        <div className="dropdown-separator"></div>
                        <div className="dropdown-item" onClick={() => dispatch({ type: 'SET_SAVE_MODAL_OPEN', payload: true })}>Save As...</div>
                        <div className="dropdown-separator"></div>
                        <div className="dropdown-item" onClick={() => handleOpenFile('.mm')}>Open (.mm)</div>
                        <div className="dropdown-item" onClick={() => handleOpenFile('.json')}>Open (.json)</div>
                        <div className="dropdown-separator"></div>
                        {user && <div className="dropdown-item" onClick={logout}>Logout</div>}
                    </div>
                </div>

                {/* Edit Menu */}
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

                {/* Hidden Input for generic file opening */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={importMap}
                    accept={openFileFilter}
                    style={{ display: 'none' }}
                />

                <SaveMapModal
                    isOpen={state.isSaveModalOpen}
                    onClose={() => dispatch({ type: 'SET_SAVE_MODAL_OPEN', payload: false })}
                    onSave={handleSaveConfirm}
                />
            </div>
        );
    };

    export default MenuBar;
