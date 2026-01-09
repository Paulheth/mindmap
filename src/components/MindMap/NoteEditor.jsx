import React, { useState, useEffect, useRef } from 'react';
import { useMap } from '../../context/MapContext';
import './NoteEditor.css';

const NoteEditor = () => {
    const { state, dispatch } = useMap();
    const { editingNoteId } = state;
    const [noteText, setNoteText] = useState('');
    const textareaRef = useRef(null);

    // Find the node being edited
    // We need a helper to find generic node by ID since the context helper isn't exported directly
    // Ideally we should export findNode from specific utils or Context
    // For now, let's just search the tree or assume we can pass the node if we change structure.
    // The reducer has findNode but it's internal.
    // Let's do a quick BFS to find the node from state.root
    const findNodeById = (root, id) => {
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
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [editingNoteId]);

    if (!editingNoteId || !node) return null;

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
        <div className="note-editor-overlay" onClick={handleClose}>
            <div className="note-editor-modal" onClick={e => e.stopPropagation()}>
                <h3>Edit Note</h3>
                <textarea
                    ref={textareaRef}
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Enter your note here..."
                    rows={8}
                />
                <div className="note-editor-actions">
                    <button className="note-delete-btn" onClick={handleDelete}>Delete Note</button>
                    <div className="right-actions">
                        <button className="note-cancel-btn" onClick={handleClose}>Cancel</button>
                        <button className="note-save-btn" onClick={handleSave}>Save Note</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoteEditor;
