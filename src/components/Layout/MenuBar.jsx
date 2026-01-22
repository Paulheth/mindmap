import React, { useRef, useState } from 'react';
import { useMap, initialState } from '../../context/MapContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { parseMMFile } from '../../utils/mmParser';
import { generateMMFileContent } from '../../utils/mmGenerator';
import SaveMapModal from '../Modals/SaveMapModal';
import './MenuBar.css';

const MenuBar = () => {
    const { state, dispatch } = useMap();
    const { user, logout } = useAuth();
    const { showToast } = useToast();
    const fileInputRef = useRef(null);

    const handleLogout = async () => {
        try {
            await logout();
            // Force reload to clear all in-memory state
            window.location.reload();
        } catch (error) {
            console.error("Logout failed:", error);
            // Even if API fails, we should clear local state/redirect
            window.location.href = '/';
        }
    };

    const createNewMap = () => {
        const needsSave = !state.autoSave;
        if (needsSave) {
            if (!confirm("Create new map? Unsaved changes may be lost.")) return;
        } else {
            if (!confirm("Start a new map?")) return;
        }

        const cleanState = JSON.parse(JSON.stringify(initialState));
        dispatch({ type: 'LOAD_MAP', payload: cleanState });
        showToast("New map created");
    };

    const handleOpenFile = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const importMap = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Extract filename without extension
        const rawName = file.name.replace(/\.(json|mm)$/i, '');

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            try {
                if (file.name.toLowerCase().endsWith('.json')) {
                    const loadedState = JSON.parse(text);
                    if (!loadedState.root) throw new Error("Invalid JSON");
                    // Ensure filename is set from the file being imported, overriding whatever might be in the JSON or state
                    dispatch({ type: 'LOAD_MAP', payload: { ...loadedState, filename: rawName } });
                    showToast("Map loaded from JSON");
                } else {
                    const parsedData = parseMMFile(text);
                    if (parsedData?.root) {
                        dispatch({
                            type: 'LOAD_MAP',
                            payload: { ...initialState, ...parsedData, filename: rawName }
                        });
                        showToast("Map loaded from .mm");
                    }
                }
            } catch (error) {
                alert("Import Failed: " + error.message);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    };

    const saveFile = (content, filename, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Quick Save: Defaults to .mm and current filename
    const handleQuickSave = () => {
        const content = generateMMFileContent(state);
        const name = state.filename || 'mindmap';
        saveFile(content, `${name}.mm`, 'application/xml');
        showToast(`Map saved as ${name}.mm`);
    };

    // Modal Save Confirm
    const handleSaveConfirm = (filename, format) => {
        let content = '';
        let mimeType = '';
        let extension = '';

        // Update filename in state
        dispatch({ type: 'SET_FILENAME', payload: filename });

        if (format === 'json') {
            content = JSON.stringify(state, null, 2);
            mimeType = 'application/json';
            extension = 'json';
        } else {
            content = generateMMFileContent(state);
            mimeType = 'application/xml';
            extension = 'mm';
        }

        saveFile(content, `${filename}.${extension}`, mimeType);
        showToast("Map saved successfully");
    };

    return (
        <div className="menu-bar">
            {/* File Menu */}
            <div className="menu-item">
                File
                <div className="dropdown">
                    <div className="dropdown-item" onClick={createNewMap}>New Map</div>
                    <div className="dropdown-separator"></div>
                    <div className="dropdown-item" onClick={handleQuickSave}>Save</div>
                    <div className="dropdown-item" onClick={() => dispatch({ type: 'SET_SAVE_MODAL_OPEN', payload: true })}>Save As...</div>
                    <div className="dropdown-separator"></div>
                    <div className="dropdown-item" onClick={handleOpenFile}>Open...</div>
                    <div className="dropdown-separator"></div>
                    {user && <div className="dropdown-item" onClick={handleLogout}>Logout</div>}
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

            <div className="logo-area">
                Mind Map Manager
                {state.filename && <span style={{ opacity: 0.6, fontSize: '0.8em', marginLeft: '10px' }}>&mdash; {state.filename}</span>}
                <span
                    title={state.saveError || 'Unknown Error'}
                    onClick={() => {
                        console.log("Current State:", state);
                        if (state.saveStatus === 'error') {
                            alert(`Save Error Details:\n${state.saveError || 'No specific error message captured.'}\n\nCheck console for full state.`);
                        }
                    }}
                    style={{
                        marginLeft: '15px',
                        fontSize: '0.7rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: state.saveStatus === 'error' ? '#fee2e2' : state.saveStatus === 'saving' ? '#f1f5f9' : 'transparent',
                        color: state.saveStatus === 'error' ? '#ef4444' : '#64748b',
                        cursor: state.saveStatus === 'error' ? 'pointer' : 'default',
                        userSelect: 'none'
                    }}>
                    {state.saveStatus === 'saving' ? 'Saving...' : state.saveStatus === 'error' ? 'Save Failed (Click for info)' : 'Cloud Saved'}
                </span>
            </div>

            {user && (
                <div className="user-area" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                    <span>{user.email}</span>
                    <button onClick={handleLogout} style={{ padding: '2px 8px', fontSize: '0.8rem' }}>Logout</button>
                </div>
            )}

            {/* Hidden Input for generic file opening */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={importMap}
                accept=".mm,.json"
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
