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

                    {timelineGroups.map((group, index) => (
                        <div key={group.date} className="timeline-item">
                            <div className="timeline-date">{group.date}</div>
                            <div className="timeline-marker"></div>
                            <div className="timeline-connector"></div>
                            <div className="timeline-stack">
                                {group.nodes.map(node => (
                                    <div
                                        key={node.id}
                                        className="timeline-card"
                                        style={{ borderColor: node.style?.backgroundColor }}
                                    >
                                        <strong>{node.text}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}


                    {/* End Line Lead-out */}
                    <div style={{ minWidth: 100, height: 4, background: '#334155' }}></div>
                </div>
            )}
        </div>
    );
};

export default TimelineView;
