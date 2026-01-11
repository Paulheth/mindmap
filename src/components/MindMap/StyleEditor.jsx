import React, { useState } from 'react';
import { useMap } from '../../context/MapContext';
import './StyleEditor.css';

const StyleEditor = () => {
    const { state, dispatch } = useMap();
    const { editingStyleLevel, levelStyles } = state;
    const [activeTab, setActiveTab] = useState(0); // For Global mode

    if (editingStyleLevel === null) return null;

    const isGlobal = editingStyleLevel === 'GLOBAL';
    const targetLevel = isGlobal ? activeTab : editingStyleLevel;
    const currentStyle = levelStyles[targetLevel] || {};

    const update = (key, value) => {
        dispatch({
            type: 'UPDATE_LEVEL_STYLE',
            payload: {
                level: targetLevel,
                style: { [key]: value }
            }
        });
    };

    const close = () => dispatch({ type: 'SET_EDITING_STYLE_LEVEL', payload: null });

    const resetManualStyles = () => {
        if (confirm("This will remove all manual style overrides from ALL nodes, forcing them to use the level templates. Continue?")) {
            dispatch({ type: 'RESET_ALL_NODE_STYLES' });
        }
    };

    const stopProp = (e) => {
        e.stopPropagation();
        // Prevent wheel event propagation if scrolling inside modal
        // But let default scroll happen if needed
    };

    return (
        <div className="style-editor-overlay"
            onMouseDown={stopProp}
            onMouseMove={stopProp}
            onMouseUp={stopProp}
            onWheel={stopProp}
            onClick={stopProp} // Also stop clicks just in case
        >
            <div className={`style-editor-modal ${isGlobal ? 'global-mode' : ''}`}>
                <div className="style-editor-header">
                    <h3>{isGlobal ? 'Node Style Setup' : `Edit Style: Level ${editingStyleLevel}`}</h3>
                    <button onClick={close} className="close-btn">&times;</button>
                </div>


                {isGlobal && (
                    <div className="style-tabs">
                        {[0, 1, 2, 3, 4, 5].map(lvl => (
                            <button
                                key={lvl}
                                className={`tab-btn ${activeTab === lvl ? 'active' : ''}`}
                                onClick={() => setActiveTab(lvl)}
                            >
                                {lvl === 0 ? 'Root' : `Lvl ${lvl}`}
                            </button>
                        ))}
                    </div>
                )}

                <div className="style-editor-body">
                    <h4>{isGlobal ? (activeTab === 0 ? 'Central Topic' : `Level ${activeTab}`) : ''}</h4>
                    <div className="control-group">
                        <label>Background Color</label>
                        <div className="color-preview">
                            <input
                                type="color"
                                value={currentStyle.backgroundColor || '#ffffff'}
                                onChange={(e) => update('backgroundColor', e.target.value)}
                            />
                            <span>{currentStyle.backgroundColor}</span>
                        </div>
                    </div>
                    <div className="control-group">
                        <label>Text Color</label>
                        <div className="color-preview">
                            <input
                                type="color"
                                value={currentStyle.color || '#000000'}
                                onChange={(e) => update('color', e.target.value)}
                            />
                            <span>{currentStyle.color}</span>
                        </div>
                    </div>
                    <div className="control-group">
                        <label>Font Size (px)</label>
                        <input
                            type="number"
                            min="8" max="72"
                            value={currentStyle.fontSize || 14}
                            onChange={(e) => update('fontSize', parseInt(e.target.value))}
                        />
                    </div>
                    <div className="control-group">
                        <label>Corner Radius (px)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                type="range"
                                min="0" max="30"
                                value={currentStyle.borderRadius || 0}
                                onChange={(e) => update('borderRadius', parseInt(e.target.value))}
                                style={{ flex: 1 }}
                            />
                            <span style={{ minWidth: 24, textAlign: 'right', fontSize: 12 }}>{currentStyle.borderRadius || 0}</span>
                        </div>
                    </div>

                    {isGlobal && (
                        <div className="reset-section" style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
                            <button
                                onClick={() => {
                                    localStorage.setItem('userDefaultStyles', JSON.stringify(levelStyles));
                                    alert("Current styles saved as default for new maps!");
                                }}
                                className="save-default-btn"
                                style={{ width: '100%', background: '#22c55e', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px' }}
                            >
                                Save as Default for New Maps
                            </button>

                            <button onClick={resetManualStyles} className="reset-btn" style={{ width: '100%', background: '#ff4d4f', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}>
                                Reset All Manual Overrides
                            </button>
                            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: 5 }}>
                                Use Reset if changes aren't applying to existing nodes.
                            </p>
                        </div>
                    )}
                </div>

                <div className="style-editor-footer">
                    <button onClick={close} className="done-btn">Done</button>
                </div>
            </div>
        </div>
    );
};

export default StyleEditor;
