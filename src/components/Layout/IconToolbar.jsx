import React from 'react';
import { useMap } from '../../context/MapContext';
import { parseMMFile } from '../../utils/mmParser';
import './IconToolbar.css';

const IconToolbar = () => {
    const { state, dispatch } = useMap();
    const selectedCount = state.selectedIds.length;

    // Helpers to update style
    const updateStyle = (key, value) => {
        if (selectedCount === 0) return;
        dispatch({
            type: 'UPDATE_NODE_STYLE',
            payload: {
                ids: state.selectedIds,
                style: { [key]: value }
            }
        });
    };

    const handleColorChange = (e, prop) => {
        updateStyle(prop, e.target.value);
    };

    // Icons as small components for cleanliness
    const IconSave = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
    );
    const IconFolder = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
    );
    const IconPlus = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    );
    const IconTrash = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
    );
    const IconLink = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
    );
    const IconPaintBucket = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 3a2 2 0 0 0-2-2L6 16l-4-4 13-13 8 4z"></path>
            <path d="M6 16l-3 3 5 5 3-3"></path>
            <path d="M10 21l3-3"></path>
        </svg>
    );
    const IconText = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7"></polyline>
            <line x1="9" y1="20" x2="15" y2="20"></line>
            <line x1="12" y1="4" x2="12" y2="20"></line>
        </svg>
    );
    const IconBold = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
        </svg>
    );
    const IconItalic = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="4" x2="10" y2="4"></line>
            <line x1="14" y1="20" x2="5" y2="20"></line>
            <line x1="15" y1="4" x2="9" y2="20"></line>
        </svg>
    );
    const IconCalendar = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
    );

    return (
        <div className="icon-toolbar">
            <div className="toolbar-group">
                <button title="Save Map" onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
                    const downloadAnchorNode = document.createElement('a');
                    downloadAnchorNode.setAttribute("href", dataStr);
                    downloadAnchorNode.setAttribute("download", "mindmap.json");
                    document.body.appendChild(downloadAnchorNode);
                    downloadAnchorNode.click();
                    downloadAnchorNode.remove();
                }}><IconSave /></button>
                <button title="Load Map" onClick={() => document.getElementById('file-upload').click()}>
                    <IconFolder />
                </button>
                <input
                    type="file"
                    id="file-upload"
                    style={{ display: 'none' }}
                    accept=".json,.mm"
                    onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        const isMM = file.name.toLowerCase().endsWith('.mm');

                        const reader = new FileReader();
                        reader.onload = (event) => {
                            try {
                                let payload;
                                if (isMM) {
                                    payload = parseMMFile(event.target.result);
                                } else {
                                    payload = JSON.parse(event.target.result);
                                }

                                if (payload && payload.root) {
                                    dispatch({ type: 'LOAD_MAP', payload });
                                } else {
                                    alert("Invalid file structure");
                                }
                            } catch (err) {
                                console.error(err);
                                alert("Failed to parse file: " + err.message);
                            }
                        };
                        reader.readAsText(file);
                        e.target.value = ''; // Reset
                    }}
                />
                <button title="Add Child" onClick={() => dispatch({ type: 'ADD_CHILD' })}><IconPlus /></button>
                <button title="Delete" onClick={() => dispatch({ type: 'DELETE_NODE' })}><IconTrash /></button>
                <button title="Add Link (Select 2 nodes)" onClick={() => {
                    // Logic to add link if 2 selected
                    if (selectedCount === 2) {
                        dispatch({
                            type: 'ADD_LINK',
                            payload: { from: state.selectedIds[0], to: state.selectedIds[1] }
                        });
                    } else {
                        alert("Please select exactly 2 nodes to connect.");
                    }
                }}><IconLink /></button>
            </div>

            <div className="separator"></div>

            <div className="toolbar-group">
                <div className="color-picker-wrapper" title="Background Color">
                    <IconPaintBucket />
                    <input type="color" onChange={(e) => handleColorChange(e, 'backgroundColor')} />
                </div>
                <div className="color-picker-wrapper" title="Text Color">
                    <IconText />
                    <input type="color" onChange={(e) => handleColorChange(e, 'color')} />
                </div>
                <div className="font-size-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: '#64748b' }}>Px:</span>
                    <input
                        type="number"
                        min="8"
                        max="72"
                        defaultValue="14"
                        onChange={(e) => updateStyle('fontSize', parseInt(e.target.value))}
                        style={{ width: 40, border: '1px solid #cbd5e1', borderRadius: 4, padding: 2, fontSize: 12 }}
                    />
                </div>
                <button title="Bold" onClick={() => updateStyle('fontWeight', 'bold')}><IconBold /></button>
                <button title="Italic" onClick={() => updateStyle('fontStyle', 'italic')}><IconItalic /></button>
                <button title="Normal Text" onClick={() => {
                    updateStyle('fontWeight', 'normal');
                    updateStyle('fontStyle', 'normal');
                }} style={{ fontSize: 10, width: 'auto', padding: '0 4px' }}>Reset</button>
            </div>

            <div className="separator"></div>

            <div className="toolbar-group">
                <button title="Zoom In" onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.min((state.zoom || 1) + 0.1, 2) })}>+</button>
                <div style={{ fontSize: 12, width: 30, textAlign: 'center' }}>{Math.round((state.zoom || 1) * 100)}%</div>
                <button title="Zoom Out" onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.max((state.zoom || 1) - 0.1, 0.5) })}>-</button>
            </div>

            <div className="separator"></div>

            <div className="toolbar-group">
                <button
                    title="Map View"
                    className={state.view === 'map' ? 'active' : ''}
                    onClick={() => dispatch({ type: 'SET_VIEW', payload: 'map' })}
                    style={{ fontSize: 12, width: 'auto', padding: '0 8px', background: state.view === 'map' ? '#e2e8f0' : 'transparent' }}
                >Map</button>
                <button
                    title="Timeline View"
                    className={state.view === 'timeline' ? 'active' : ''}
                    onClick={() => dispatch({ type: 'SET_VIEW', payload: 'timeline' })}
                    style={{ fontSize: 12, width: 'auto', padding: '0 8px', background: state.view === 'timeline' ? '#e2e8f0' : 'transparent' }}
                >Timeline</button>
            </div>

            <div className="separator"></div>

            <div className="toolbar-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b' }}>
                    <span>Vertical</span>
                    <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={state.layoutSpacing || 0}
                        onChange={(e) => dispatch({ type: 'SET_LAYOUT_SPACING', payload: parseInt(e.target.value) })}
                        style={{ width: 100 }}
                        title={`Wall Spread: ${state.layoutSpacing || 0}`}
                    />
                    <span>Wide</span>
                </div>
            </div>

            <div className="toolbar-group">
                <div className="date-wrapper">
                    <IconCalendar />
                    <input
                        type="date"
                        className="toolbar-date"
                        onChange={(e) => dispatch({
                            type: 'UPDATE_NODE',
                            payload: { ids: state.selectedIds, updates: { date: e.target.value } }
                        })}
                    />
                </div>
            </div>

            <div className="toolbar-status">
                {selectedCount} selected
            </div>
        </div>
    );
};

export default IconToolbar;
