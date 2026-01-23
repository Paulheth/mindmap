import React, { useRef, useState } from 'react';
import { useMap, initialState } from '../../context/MapContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { parseMMFile } from '../../utils/mmParser';
import { generateMMFileContent } from '../../utils/mmGenerator';

import MapManagerModal from '../Modals/MapManagerModal';
import './MenuBar.css';

const MenuBar = () => {
    const { state, dispatch, saveMapToCloud, loadMapFromCloud, startNewMap, listMaps } = useMap();
    const { user, logout } = useAuth();
    const { showToast } = useToast();
    const fileInputRef = useRef(null);
    const [isMapManagerOpen, setIsMapManagerOpen] = useState(false);
    const [recentMaps, setRecentMaps] = useState([]);

    // Poll for recent maps occasionally or on menu open
    const refreshRecents = async () => {
        if (!user) return;
        try {
            const maps = await listMaps();
            setRecentMaps(maps.slice(0, 5)); // Top 5
        } catch (e) {
            console.error(e);
        }
    };

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

    const handleNewMap = async () => {
        // 1. Force Save Current
        if (state.root) {
            await saveMapToCloud();
        }

        // 2. Check Limit
        const maps = await listMaps();
        if (maps.length >= 10) {
            if (confirm("You have reached the 10 map limit. Open Map Manager to delete old maps?")) {
                setIsMapManagerOpen(true);
            }
            return;
        }

        // 3. Create New
        if (confirm("Start a new map? Current map has been saved to cloud.")) {
            startNewMap();
            showToast("New map created");
        }
    };

    const handleOpenCloudMap = async () => {
        // Force save before switching
        if (state.root) {
            await saveMapToCloud();
        }
        setIsMapManagerOpen(true);
    };

    const handleCloudLoad = async (id) => {
        setIsMapManagerOpen(false);
        await loadMapFromCloud(id);
    };

    const handleImportClick = () => {
        // Force save before importing (overwriting)
        if (state.root) {
            saveMapToCloud();
        }
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

                    // IMPORTANT: When importing, we treat it as a "New" map content-wise
                    // We strip the ID so it doesn't overwrite the original map in the cloud if it was exported from there
                    // BUT we keep the filename from the import
                    const newState = { ...loadedState, filename: rawName };
                    delete newState.mapId;

                    dispatch({ type: 'LOAD_MAP', payload: newState });
                    // We deliberately do NOT dispatch SET_MAP_ID so it creates a new cloud entry (if under limit)
                    // But wait, if they have 10 maps, this will fail to autosave.
                    // That's acceptable - they see the "Save Failed" and can Export or Delete.

                    showToast("Map imported from JSON");
                } else {
                    const parsedData = parseMMFile(text);
                    if (parsedData?.root) {
                        const newState = { ...initialState, ...parsedData, filename: rawName };
                        // No ID, acts as new map
                        dispatch({
                            type: 'LOAD_MAP',
                            payload: newState
                        });
                        showToast("Map imported from .mm");
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

    // Export to File (Local)
    // Export to File (Local) - now only supports .mm
    const handleExport = () => {
        let content = '';
        let mimeType = '';
        let extension = '';
        const filename = state.filename || 'mindmap';

        content = generateMMFileContent(state);
        mimeType = 'application/xml';
        extension = 'mm';

        saveFile(content, `${filename}.${extension}`, mimeType);
        showToast("Map exported to file");
    };

    // Manual Cloud Save
    const handleCloudSave = async () => {
        await saveMapToCloud();
        showToast("Map saved to cloud");
    };

    // Save As New (Cloud Clone)




    return (
        <div className="menu-bar">
            {/* File Menu */}
            <div className="menu-item" onMouseEnter={refreshRecents}>
                File
                <div className="dropdown">
                    <div className="dropdown-item" onClick={handleNewMap}>New Map</div>
                    <div className="dropdown-item" onClick={handleOpenCloudMap}>Manage Maps...</div>
                    <div className="dropdown-separator"></div>
                    <div className="dropdown-item" onClick={handleCloudSave}>Save (Cloud)</div>
                    <div className="dropdown-separator"></div>
                    <div className="dropdown-item" onClick={handleImportClick}>Import from File...</div>
                    <div className="dropdown-item" onClick={handleExport}>Export to File (.mm)</div>

                    {recentMaps.length > 0 && (
                        <>
                            <div className="dropdown-separator"></div>
                            <div className="dropdown-label">Recent Maps:</div>
                            {recentMaps.map(m => (
                                <div key={m.id} className="dropdown-item small" onClick={() => handleCloudLoad(m.id)}>
                                    {m.title || 'Untitled'}
                                </div>
                            ))}
                        </>
                    )}

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

            <MapManagerModal
                isOpen={isMapManagerOpen}
                onClose={() => setIsMapManagerOpen(false)}
                onLoadMap={handleCloudLoad}
            />
        </div>
    );
};

export default MenuBar;
