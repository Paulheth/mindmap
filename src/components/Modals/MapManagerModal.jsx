import React, { useEffect, useState } from 'react';
import { useMap } from '../../context/MapContext';
import { useToast } from '../../context/ToastContext';
import './MapManagerModal.css';

const MapManagerModal = ({ isOpen, onClose, onLoadMap }) => {
    const { listMaps, deleteMap, renameMap, duplicateMap, createCloudMap, state } = useMap();
    const { showToast } = useToast();
    const [maps, setMaps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');

    useEffect(() => {
        if (isOpen) {
            refreshMaps();
        }
    }, [isOpen]);

    const refreshMaps = async () => {
        setLoading(true);
        try {
            const data = await listMaps();
            setMaps(data);
        } catch (error) {
            console.error("Failed to list maps:", error);
            showToast("Failed to load maps");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e, id, title) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to permanently delete "${title}"? This cannot be undone.`)) {
            return;
        }

        try {
            await deleteMap(id);
            showToast("Map deleted");
            refreshMaps();
        } catch (error) {
            showToast("Failed to delete map");
        }
    };

    const handleDuplicate = async (e, id) => {
        e.stopPropagation();
        if (maps.length >= 10) {
            alert("Cannot clone map: Storage limit (10 maps) reached.");
            return;
        }

        try {
            await duplicateMap(id);
            showToast("Map duplicated");
            refreshMaps();
        } catch (error) {
            console.error(error);
            showToast("Failed to duplicate map");
        }
    };

    const handleSaveCurrentAsCopy = async () => {
        if (maps.length >= 10) {
            alert("Cannot save copy: Storage limit (10 maps) reached.");
            return;
        }

        const newName = prompt("Enter name for copy:", (state.filename || 'MindMap') + " Copy");
        if (!newName) return;

        const copyContent = { ...state, filename: newName };

        try {
            await createCloudMap(copyContent);
            showToast("Current map saved as copy");
            refreshMaps();
        } catch (error) {
            console.error(error);
            showToast("Failed to save copy");
        }
    };

    const startRename = (e, map) => {
        e.stopPropagation();
        setEditingId(map.id);
        setEditTitle(map.title);
    };

    const saveRename = async () => {
        try {
            await renameMap(editingId, editTitle);
            setEditingId(null);
            refreshMaps();
            showToast("Map renamed");
        } catch (error) {
            showToast("Failed to rename map");
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            saveRename();
        } else if (e.key === 'Escape') {
            setEditingId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="map-manager-modal-overlay" onClick={onClose}>
            <div className="map-manager-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Manage Cloud Maps</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="primary-button" onClick={handleSaveCurrentAsCopy}>+ Save Current as Copy</button>
                        <button className="close-button" onClick={onClose}>&times;</button>
                    </div>
                </div>

                <div className="modal-content">
                    <div className="usage-bar">
                        <span className="usage-count">{maps.length} / 10 Maps Used</span>
                        <span className="usage-limit">{maps.length >= 10 ? 'Storage Full' : 'Free slots available'}</span>
                    </div>

                    {loading ? (
                        <div className="loading-state">Loading maps...</div>
                    ) : maps.length === 0 ? (
                        <div className="empty-state">No maps found in the cloud.</div>
                    ) : (
                        <div className="map-list">
                            {maps.map(map => (
                                <div key={map.id} className="map-item">
                                    <div className="map-info" onClick={() => onLoadMap(map.id)}>
                                        {editingId === map.id ? (
                                            <input
                                                type="text"
                                                value={editTitle}
                                                onChange={e => setEditTitle(e.target.value)}
                                                onBlur={saveRename}
                                                onKeyDown={handleKeyDown}
                                                autoFocus
                                                onClick={e => e.stopPropagation()}
                                            />
                                        ) : (
                                            <div className="map-title">{map.title || 'Untitled Map'}</div>
                                        )}
                                        <div className="map-date">Last modified: {new Date(map.last_modified).toLocaleDateString()}</div>
                                    </div>
                                    <div className="map-actions">
                                        <button
                                            className="action-btn"
                                            title="Rename"
                                            onClick={(e) => startRename(e, map)}
                                        >
                                            ✎
                                        </button>
                                        <button
                                            className="action-btn"
                                            title="Duplicate / Clone"
                                            onClick={(e) => handleDuplicate(e, map.id)}
                                        >
                                            ❐
                                        </button>
                                        <button
                                            className="action-btn delete"
                                            title="Delete"
                                            onClick={(e) => handleDelete(e, map.id, map.title)}
                                        >
                                            🗑
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MapManagerModal;
