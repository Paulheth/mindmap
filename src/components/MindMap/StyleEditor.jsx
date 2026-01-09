import React, { useState, useEffect } from 'react';
import { useMap } from '../../context/MapContext';
import './StyleEditor.css';

const StyleEditor = () => {
    const { state, dispatch } = useMap();
    const { editingStyleLevel, levelStyles } = state;

    if (editingStyleLevel === null) return null;

    const currentStyle = levelStyles[editingStyleLevel] || {};
    // Local state for edits? Or live update? 
    // Live update is cooler given "Dynamic".
    // But local state is safer for "Cancel". 
    // Let's do live but with a close button. User can undo? No undo stack yet. 
    // I'll stick to live updates as they are instant feedback.

    const update = (key, value) => {
        dispatch({
            type: 'UPDATE_LEVEL_STYLE',
            payload: {
                level: editingStyleLevel,
                style: { [key]: value }
            }
        });
    };

    const close = () => dispatch({ type: 'SET_EDITING_STYLE_LEVEL', payload: null });

    return (
        <div className="style-editor-overlay">
            <div className="style-editor-modal">
                <div className="style-editor-header">
                    <h3>Edit Style: Level {editingStyleLevel}</h3>
                    <button onClick={close} className="close-btn">&times;</button>
                </div>
                <div className="style-editor-body">
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
                </div>
                <div className="style-editor-footer">
                    <button onClick={close} className="done-btn">Done</button>
                </div>
            </div>
        </div>
    );
};

export default StyleEditor;
