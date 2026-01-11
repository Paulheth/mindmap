import React from 'react';
import { useMap } from '../../context/MapContext';
import { useToast } from '../../context/ToastContext';
import { parseMMFile } from '../../utils/mmParser';
import { generateMMFileContent } from '../../utils/mmGenerator';
import './IconToolbar.css';

const IconToolbar = () => {
    const { state, dispatch } = useMap();
    const { showToast } = useToast();
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

    const downloadFile = (content, filename, contentType) => {
        const dataStr = `data:${contentType};charset=utf-8,` + encodeURIComponent(content);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", filename);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
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

    const IconStickyNote = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
    );

    const IconGear = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
    );

    const isTimeline = state.view === 'timeline';
    const disabledStyle = isTimeline ? { opacity: 0.3, pointerEvents: 'none' } : {};

    // Existing Dates Logic (Phase 10)
    const [isDatePopoverOpen, setIsDatePopoverOpen] = React.useState(false);
    const datePopoverRef = React.useRef(null);

    const existingDates = React.useMemo(() => {
        const dateMap = new Map(); // date -> color
        const traverse = (node) => {
            if (!node) return;
            if (node.date) {
                // If date not yet seen, or if current stored color is null but this node has one, update it.
                // We prefer a color over null.
                if (!dateMap.has(node.date) || (!dateMap.get(node.date) && node.dateColor)) {
                    dateMap.set(node.date, node.dateColor);
                }
            }
            if (node.children) node.children.forEach(traverse);
        };
        traverse(state.root);
        return Array.from(dateMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, color]) => ({ date, color }));
    }, [state.root]);

    const hasExistingDates = existingDates.length > 0;

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (datePopoverRef.current && !datePopoverRef.current.contains(event.target) && !event.target.closest('.date-icon-btn')) {
                setIsDatePopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDateSelect = (dateItem) => {
        dispatch({
            type: 'UPDATE_NODE',
            payload: { ids: state.selectedIds, updates: { date: dateItem.date, dateColor: dateItem.color || null } }
        });
        setIsDatePopoverOpen(false);
    };

    return (
        <div className="icon-toolbar">
            <div className="toolbar-group">
                <button title="Save Map (.mm)" onClick={() => {
                    const xmlContent = generateMMFileContent(state);
                    const name = state.filename || 'mindmap';
                    downloadFile(xmlContent, `${name}.mm`, 'text/xml');
                    showToast(`Map saved as ${name}.mm`);
                }}><IconSave /></button>

                <label className="autosave-toggle" title="Toggle Auto Save" style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', marginLeft: 8, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                        type="checkbox"
                        checked={state.autoSave !== false}
                        onChange={() => dispatch({ type: 'TOGGLE_AUTOSAVE' })}
                        style={{ marginRight: 4 }}
                    />
                    Auto Save
                </label>
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
                        const rawName = file.name.replace(/\.(json|mm)$/i, '');

                        const reader = new FileReader();
                        reader.onload = (event) => {
                            try {
                                let payload;
                                if (isMM) {
                                    payload = parseMMFile(event.target.result);
                                    showToast("Map loaded from .mm");
                                } else {
                                    payload = JSON.parse(event.target.result);
                                    showToast("Map loaded from JSON");
                                }

                                if (payload && payload.root) {
                                    // Inject filename into payload
                                    dispatch({ type: 'LOAD_MAP', payload: { ...payload, filename: rawName } });
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
                <button title="Add/Edit Note" onClick={() => {
                    if (selectedCount === 1) {
                        dispatch({ type: 'SET_EDITING_NOTE_ID', payload: state.selectedIds[0] });
                    } else {
                        alert("Please select 1 node to add a note.");
                    }
                }}><IconStickyNote /></button>

                {/* Style Settings - Disabled in Timeline */}
                <button
                    title="Node Style Setup"
                    onClick={() => !isTimeline && dispatch({ type: 'SET_EDITING_STYLE_LEVEL', payload: 'GLOBAL' })}
                    style={disabledStyle}
                    disabled={isTimeline}
                >
                    <IconGear />
                </button>
            </div>

            <div className="separator"></div>

            {/* Styling Tools - Disabled in Timeline */}
            <div className="toolbar-group" style={disabledStyle}>
                <div className="color-picker-wrapper" title="Background Color">
                    <IconPaintBucket />
                    <input type="color" onChange={(e) => handleColorChange(e, 'backgroundColor')} disabled={isTimeline} />
                </div>
                <div className="color-picker-wrapper" title="Text Color">
                    <IconText />
                    <input type="color" onChange={(e) => handleColorChange(e, 'color')} disabled={isTimeline} />
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
                        disabled={isTimeline}
                    />
                </div>
                <button title="Bold" onClick={() => updateStyle('fontWeight', 'bold')} disabled={isTimeline}><IconBold /></button>
                <button title="Italic" onClick={() => updateStyle('fontStyle', 'italic')} disabled={isTimeline}><IconItalic /></button>
                <button title="Normal Text" onClick={() => {
                    updateStyle('fontWeight', 'normal');
                    updateStyle('fontStyle', 'normal');
                }} style={{ fontSize: 10, width: 'auto', padding: '0 4px' }} disabled={isTimeline}>Reset</button>
            </div>

            <div className="separator"></div>

            {/* Zoom Controls - Disabled in Timeline */}
            <div className="toolbar-group" style={disabledStyle}>
                <button title="Zoom In" onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.min((state.zoom || 1) + 0.1, 2) })} disabled={isTimeline}>+</button>
                <div style={{ fontSize: 12, width: 30, textAlign: 'center' }}>{Math.round((state.zoom || 1) * 100)}%</div>
                <button title="Zoom Out" onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.max((state.zoom || 1) - 0.1, 0.5) })} disabled={isTimeline}>-</button>
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

            {/* Layout Density - Disabled in Timeline */}
            <div className="toolbar-group" style={disabledStyle}>
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
                        disabled={isTimeline}
                    />
                    <span>Wide</span>
                </div>
            </div>

            <div className="toolbar-group" style={disabledStyle}>
                <div className="date-wrapper" style={{ position: 'relative' }}>
                    {/* Calendar Icon - Interactive if dates exist */}
                    <button
                        className="date-icon-btn"
                        onClick={() => !isTimeline && hasExistingDates && setIsDatePopoverOpen(!isDatePopoverOpen)}
                        disabled={isTimeline || !hasExistingDates}
                        title={hasExistingDates ? "Select Existing Date" : "No existing dates"}
                        style={{
                            color: hasExistingDates && !isTimeline ? '#3b82f6' : 'inherit',
                            cursor: hasExistingDates && !isTimeline ? 'pointer' : 'default',
                            width: 'auto', padding: '0 4px', border: 'none', background: 'transparent'
                        }}
                    >
                        <IconCalendar />
                    </button>

                    {/* Quick Pick Dropdown */}
                    {isDatePopoverOpen && (
                        <div ref={datePopoverRef} className="date-popover">
                            <div className="date-popover-header">Existing Dates</div>
                            <div className="date-list">
                                {existingDates.map(item => (
                                    <div
                                        key={item.date}
                                        className="date-item"
                                        onClick={() => handleDateSelect(item)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                                    >
                                        {item.color && (
                                            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: item.color }} />
                                        )}
                                        {!item.color && <div style={{ width: 12, height: 12 }} />} {/* Spacer */}
                                        {item.date}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <input
                        type="date"
                        className="toolbar-date"
                        onChange={(e) => dispatch({
                            type: 'UPDATE_NODE',
                            payload: { ids: state.selectedIds, updates: { date: e.target.value, dateColor: null } }
                        })}
                        disabled={isTimeline}
                        title={isTimeline ? "Date Picker disabled in Timeline View" : "Set Date"}
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
