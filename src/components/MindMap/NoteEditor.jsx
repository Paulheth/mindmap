import React, { useState, useEffect, useRef } from 'react';
import { useMap } from '../../context/MapContext';
import './NoteEditor.css';

const NoteEditor = ({ position = { x: 0, y: 0 } }) => {
    const { state, dispatch } = useMap();
    const { editingNoteId } = state;
    const [noteText, setNoteText] = useState('');
    const textareaRef = useRef(null);

    // Find the node being edited to get initial text
    const findNodeById = (root, id) => {
        if (!root) return null;
        if (root.id === id) return root;
        if (root.children) {
            for (let child of root.children) {
                const found = findNodeById(child, id);
                if (found) return found;
            }
        }
        return null;
    };

    const node = editingNoteId ? findNodeById(state.root, editingNoteId) : null;

    useEffect(() => {
        if (node) {
            setNoteText(node.note || '');
        }
    }, [node]);

    useEffect(() => {
        // Auto-focus with a slight delay to ensure render
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
        }, 50);
    }, [editingNoteId]);

    if (!editingNoteId) return null;

    const handleSave = () => {
        dispatch({
            type: 'UPDATE_NODE',
            payload: {
                id: editingNoteId,
                updates: { note: noteText }
            }
        });
        dispatch({ type: 'SET_EDITING_NOTE_ID', payload: null });
    };

    const handleDelete = () => {
        dispatch({
            type: 'UPDATE_NODE',
            payload: {
                id: editingNoteId,
                updates: { note: null }
            }
        });
        dispatch({ type: 'SET_EDITING_NOTE_ID', payload: null });
    };

    const handleClose = () => {
        dispatch({ type: 'SET_EDITING_NOTE_ID', payload: null });
    };

    return (
        <div
            className="note-editor-container"
            style={{
                left: position.x + 40, // Offset to the right of the node
                top: position.y - 20   // Align near top
            }}
            onClick={(e) => e.stopPropagation()} // Prevent map interaction
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
