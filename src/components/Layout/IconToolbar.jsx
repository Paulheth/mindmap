import React from 'react';
import { useMap } from '../../context/MapContext';
import { TextB, TextItalic, PaintBucket, TextT, Plus, Trash, Link as LinkIcon, Calendar, FloppyDisk, FolderOpen } from '@phosphor-icons/react'; // Phosphor icons
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

    // Check current selection style (from first node)
    // Simplified: just defaults or empty

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
                }}><FloppyDisk size={18} /></button>
                <button title="Load Map" onClick={() => document.getElementById('file-upload').click()}>
                    <FolderOpen size={18} />
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
                <button title="Add Child" onClick={() => dispatch({ type: 'ADD_CHILD' })}><Plus size={18} /></button>
                <button title="Delete" onClick={() => dispatch({ type: 'DELETE_NODE' })}><Trash size={18} /></button>
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
                }}><LinkIcon size={18} /></button>
            </div>

            <div className="separator"></div>

            <div className="toolbar-group">
                <div className="color-picker-wrapper" title="Background Color">
                    <PaintBucket size={18} />
                    <input type="color" onChange={(e) => handleColorChange(e, 'backgroundColor')} />
                </div>
                <div className="color-picker-wrapper" title="Text Color">
                    <TextT size={18} />
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
                <button title="Bold" onClick={() => updateStyle('fontWeight', 'bold')}><TextB size={18} /></button>
                <button title="Italic" onClick={() => updateStyle('fontStyle', 'italic')}><TextItalic size={18} /></button>
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
                <div className="date-wrapper">
                    <Calendar size={18} />
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
