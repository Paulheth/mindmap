import React, { useState } from 'react';
import './SaveMapModal.css';

const SaveMapModal = ({ isOpen, onClose, onSave }) => {
    const [filename, setFilename] = useState('My Mind Map');
    const [format, setFormat] = useState('mm'); // 'mm' or 'json'

    if (!isOpen) return null;

    const handleSaveClick = () => {
        onSave(filename, format);
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content save-modal">
                <h2>Save Map</h2>

                <div className="form-group">
                    <label>Filename</label>
                    <input
                        type="text"
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="form-group">
                    <label>Format</label>
                    <div className="format-options">
                        <label className={`format-option ${format === 'mm' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="format"
                                value="mm"
                                checked={format === 'mm'}
                                onChange={() => setFormat('mm')}
                            />
                            .mm (MindMap)
                            <span className="format-desc">Best for sharing with other tools</span>
                        </label>
                        <label className={`format-option ${format === 'json' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="format"
                                value="json"
                                checked={format === 'json'}
                                onChange={() => setFormat('json')}
                            />
                            .json (Backup)
                            <span className="format-desc">Full application state backup</span>
                        </label>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn-cancel" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={handleSaveClick}>Save</button>
                </div>
            </div>
        </div>
    );
};

export default SaveMapModal;
