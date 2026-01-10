import React, { useState, useEffect, useRef } from 'react';
import { useMap } from '../../context/MapContext';
import './NoteEditor.css';

const NoteEditor = ({ position }) => {
    const { state, dispatch } = useMap();
    const { editingNoteId } = state;
    const [noteText, setNoteText] = useState('');
    const textareaRef = useRef(null);

    // Helper to find node
    const findNode = (node, id) => {
        if (!node) return null;
        if (node.id === id) return node;
        if (node.children) {
            for (let child of node.children) {
                const found = findNode(child, id);
                if (found) return found;
            }
        }
        return null;
    };

    useEffect(() => {
        if (editingNoteId && state.root) {
            const node = findNode(state.root, editingNoteId);
            if (node) {
                setNoteText(node.note || '');
            }
        }
        // Focus textarea
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
        }, 100);
    }, [editingNoteId, state.root]);

    const handleClose = () => {
        dispatch({ type: 'SET_EDITING_NOTE_ID', payload: null });
    };

    const handleSave = () => {
        dispatch({
            type: 'UPDATE_NODE',
            payload: {
                ids: [editingNoteId],
                updates: { note: noteText }
            }
        });
        handleClose();
    };

    const handleDelete = () => {
        dispatch({
            type: 'UPDATE_NODE',
            payload: {
                ids: [editingNoteId],
                updates: { note: null }
            }
        });
        handleClose();
    };
    return (
        <div
            className="note-editor-container"
            style={{ position: 'absolute', left: position?.x || 0, top: position?.y || 0 }}
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
