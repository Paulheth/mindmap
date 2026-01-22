import React from 'react';
import './StartupModal.css';

const StartupModal = ({ isOpen, mapMetadata, onLoad, onNew }) => {
    if (!isOpen) return null;

    const formatDate = (isoString) => {
        if (!isoString) return 'Unknown date';
        return new Date(isoString).toLocaleString();
    };

    return (
        <div className="startup-modal-overlay">
            <div className="startup-modal-content">
                <h2>Welcome Back!</h2>
                <p>We found a saved mind map from your previous session.</p>

                {mapMetadata && (
                    <div className="map-info">
                        <div className="map-detail-row">
                            <strong>Map:</strong>
                            <span>{mapMetadata.title || 'Untitled Map'}</span>
                        </div>
                        <div className="map-detail-row">
                            <strong>Last Modified:</strong>
                            <span>{formatDate(mapMetadata.last_modified)}</span>
                        </div>
                    </div>
                )}

                <div className="startup-actions">
                    <button className="btn-load" onClick={onLoad}>
                        Open Last Map
                    </button>
                    <button className="btn-new" onClick={onNew}>
                        Start New Map
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StartupModal;
