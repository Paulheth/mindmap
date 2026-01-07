import React, { useState } from 'react';
import { useMap } from '../../context/MapContext';
import './Toolbar.css';

const Toolbar = () => {
    const { state, dispatch } = useMap();
    const selectedCount = state.selectedIds.length;

    const handleDateChange = (e) => {
        const date = e.target.value;
        if (selectedCount > 0) {
            dispatch({
                type: 'UPDATE_NODE',
                payload: {
                    ids: state.selectedIds,
                    updates: { date: date }
                }
            });
        }
    };

    // Find common date if multiple selected, or empty
    // Not critical for now.

    return (
        <div className="toolbar">
            <div className="toolbar-info">
                {selectedCount} node{selectedCount !== 1 ? 's' : ''} selected
            </div>
            <div className="toolbar-actions">
                <label>
                    Date:
                    <input
                        type="date"
                        onChange={handleDateChange}
                        className="date-input"
                    />
                </label>
                <button
                    onClick={() => dispatch({
                        type: 'UPDATE_NODE',
                        payload: { ids: state.selectedIds, updates: { date: null } }
                    })}
                >
                    Clear Date
                </button>
            </div>
        </div>
    );
};

export default Toolbar;
