import React, { useMemo } from 'react';
import { useMap } from '../../context/MapContext';
import './TimelineView.css';

const TimelineView = () => {
    const { state } = useMap();

    // Flatten nodes and group by date
    const timelineGroups = useMemo(() => {
        const groups = {};
        const traverse = (node) => {
            if (node.date) {
                if (!groups[node.date]) {
                    groups[node.date] = [];
                }
                groups[node.date].push(node);
            }
            if (node.children) {
                node.children.forEach(traverse);
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
    }, [state.root]);

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
                        // Default to Blue to verify changes are active
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

                        return (
                            <div key={group.date} className="timeline-item">
                                <div className="timeline-date" style={{ color: groupColor }}>{group.date}</div>

                                <label className="timeline-marker-wrapper" style={{ cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div
                                        className="timeline-marker"
                                        style={{ backgroundColor: groupColor, borderColor: groupColor }}
                                        title="Click to set color for this date"
                                    ></div>
                                    <input
                                        type="color"
                                        onChange={handleColorChange}
                                        value={groupColor}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                    />
                                </label>

                                <div className="timeline-connector" style={{ backgroundColor: groupColor }}></div>
                                <div className="timeline-stack">
                                    {group.nodes.map(node => (
                                        <div
                                            key={node.id}
                                            className="timeline-card"
                                            style={{ borderColor: node.style?.backgroundColor, borderLeftWidth: 4 }}
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

export default TimelineView;
