import React, { useState, useEffect, useRef } from 'react';
import { useMap } from '../../context/MapContext';
import './NoteEditor.css';

const NoteEditor = () => {
    const { state, dispatch } = useMap();
    const { editingNoteId } = state;
    const [noteText, setNoteText] = useState('');
    const textareaRef = useRef(null);

    // ... (rest of logic)

    // Return block update
    return (
        <div
            className="note-editor-container"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="note-header">
                <h3>Edit Note</h3>
                <button className="btn-note btn-cancel-icon" onClick={handleClose}>✕</button>
            </div>

            <div className="note-content">
                <textarea
                    ref={textareaRef}
                    className="note-textarea"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Enter your note here..."
                />
            </div>

            <div className="note-actions">
                <button className="btn-note btn-delete" onClick={handleDelete} title="Delete Note">
                    🗑
                </button>
                <div className="action-right">
                    <button className="btn-note btn-save" onClick={handleSave}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoteEditor;
