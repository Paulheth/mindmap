import React, { useMemo } from 'react';
import { useMap } from '../../context/MapContext';
import './TimelineView.css';

const TimelineView = () => {
    const { state, dispatch } = useMap();

    // Flatten nodes and group by date
    const timelineGroups = useMemo(() => {
        const groups = {};
        const traverse = (node, level = 0) => {
            // Resolve effective style
            const levelStyle = state.levelStyles?.[Math.min(level, 5)] || {};
            const effectiveStyle = {
                ...levelStyle,
                ...node.style,
            };

            if (node.date) {
                if (!groups[node.date]) {
                    groups[node.date] = [];
                }
                // Store node with resolved style for display
                groups[node.date].push({ ...node, effectiveStyle });
            }
            if (node.children) {
                node.children.forEach(child => traverse(child, level + 1));
            }
        };
        traverse(state.root);

        // Convert to array and sort by date
        return Object.keys(groups)
            .sort((a, b) => new Date(a) - new Date(b))
            .map(date => ({
                date,
                nodes: groups[date]
            }));
    }, [state.root, state.levelStyles]);

    return (
        <div className="timeline-view">
            {timelineGroups.length === 0 ? (
                <div className="empty-state">
                    <h3>No dated items found</h3>
                    <p>Add dates to nodes using the calendar icon in the toolbar to see them here.</p>
                </div>
            ) : (
                <div className="timeline-track">
                    {/* Start Line Lead-in */}
                    <div style={{ minWidth: 50, height: 4, background: '#334155' }}></div>

                    {timelineGroups.map((group, index) => {
                        // Use the first node's dateColor as the representative color for the timeline marker
                        // Default to Blue if no color set
                        const groupColor = group.nodes[0]?.dateColor || '#3b82f6';

                        const handleColorChange = (e) => {
                            const newColor = e.target.value;

                            // Update ALL nodes in this date group
                            dispatch({
                                type: 'UPDATE_NODE',
                                payload: {
                                    ids: group.nodes.map(n => n.id),
                                    updates: { dateColor: newColor }
                                }
                            });
                        };

                        const handleDateChange = (e) => {
                            const newDate = e.target.value;
                            if (!newDate) {
                                // Clear action
                                if (window.confirm("Are you sure you want to remove dates from all these nodes and remove them from the timeline?")) {
                                    dispatch({
                                        type: 'UPDATE_NODE',
                                        payload: {
                                            ids: group.nodes.map(n => n.id),
                                            updates: { date: null }
                                        }
                                    });
                                }
                            } else {
                                // Update action
                                dispatch({
                                    type: 'UPDATE_NODE',
                                    payload: {
                                        ids: group.nodes.map(n => n.id),
                                        updates: { date: newDate }
                                    }
                                });
                            }
                        };

                        return (
                            <div key={group.date} className="timeline-item">
                                {/* Editable Date Label */}
                                <EditableDate
                                    date={group.date}
                                    color={groupColor}
                                    onDateChange={handleDateChange}
                                />

                                <label className="timeline-marker-wrapper" style={{ cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div
                                        className="timeline-marker"
                                        style={{ backgroundColor: groupColor, borderColor: groupColor }}
                                        title="Click to set color for this date"
                                    ></div>
                                    <input
                                        type="color"
                                        onInput={handleColorChange}
                                        value={groupColor}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
                                    />
                                </label>

                                <div className="timeline-connector" style={{ backgroundColor: groupColor }}></div>
                                <div className="timeline-stack">
                                    {group.nodes.map(node => (
                                        <div
                                            key={node.id}
                                            className="timeline-card"
                                            style={{ borderColor: node.effectiveStyle?.backgroundColor, borderLeftWidth: 4 }}
                                        >
                                            <strong>{node.text}</strong>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}


                    {/* End Line Lead-out */}
                    <div style={{ minWidth: 100, height: 4, background: '#334155' }}></div>
                </div>
            )}
        </div>
    );
};

const EditableDate = ({ date, color, onDateChange }) => {
    const inputRef = React.useRef(null);

    const handleClick = () => {
        if (inputRef.current) {
            try {
                inputRef.current.showPicker();
            } catch (err) {
                // Fallback for browsers not supporting showPicker
                inputRef.current.focus();
                inputRef.current.click();
            }
        }
    };

    return (
        <div
            className="timeline-date"
            style={{ color: color, cursor: 'pointer', zIndex: 10 }}
            onClick={handleClick}
        >
            {date}
            <input
                ref={inputRef}
                type="date"
                onChange={onDateChange} // Changed to onChange for standard picker behavior
                onInput={onDateChange} // Input for immediate
                value={date}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 0, // Hide visual footprint
                    height: 0,
                    opacity: 0,
                    border: 0,
                    padding: 0
                }}
            />
        </div>
    );
};

export default TimelineView;
