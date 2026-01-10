import React, { useMemo, useState } from 'react';
import { useMap } from '../../context/MapContext';
import MapPreview from '../MindMap/MapPreview';
import './TimelineView.css';

const TimelineView = () => {
    const { state, dispatch } = useMap();
    const [hoveredNode, setHoveredNode] = useState(null); // { id, x, y }

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

    const handleMouseEnter = (e, nodeId) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHoveredNode({
            id: nodeId,
            x: rect.right + 10, // Show to the right
            y: rect.top
        });
    };

    const handleMouseLeave = () => {
        setHoveredNode(null);
    };

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
                        // Default to Grey (#cbd5e1) to match map nodes
                        const groupColor = group.nodes[0]?.dateColor || '#cbd5e1';

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

                        // Drag & Drop Handlers
                        const handleDragStart = (e, nodeId) => {
                            e.dataTransfer.setData('timelineNodeId', nodeId);
                            e.dataTransfer.effectAllowed = 'move';
                        };

                        const handleDragOver = (e) => {
                            e.preventDefault(); // Allow drop
                            e.dataTransfer.dropEffect = 'move';
                            e.currentTarget.classList.add('drag-over');
                        };

                        const handleDragLeave = (e) => {
                            e.currentTarget.classList.remove('drag-over');
                        };

                        const handleDrop = (e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('drag-over');
                            const nodeId = e.dataTransfer.getData('timelineNodeId');

                            if (nodeId) {
                                // Update the node's date to this group's date, AND reset color to default
                                dispatch({
                                    type: 'UPDATE_NODE',
                                    payload: {
                                        id: nodeId,
                                        updates: {
                                            date: group.date,
                                            dateColor: null // Reset color to default (grey)
                                        }
                                    }
                                });
                            }
                        };


                        return (
                            <div
                                key={group.date}
                                className="timeline-item"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                {/* Editable Date Label */}
                                <EditableDate
                                    date={group.date}
                                    color={groupColor}
                                    onDateChange={handleDateChange}
                                />

                                <TimelineColorPicker
                                    color={groupColor}
                                    onChange={handleColorChange}
                                />

                                <div className="timeline-connector" style={{ backgroundColor: groupColor }}></div>
                                <div className="timeline-stack">
                                    {group.nodes.map(node => (
                                        <div
                                            key={node.id}
                                            className="timeline-card"
                                            style={{ borderColor: node.effectiveStyle?.backgroundColor, borderLeftWidth: 4, cursor: 'grab' }}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, node.id)}
                                            onMouseEnter={(e) => handleMouseEnter(e, node.id)}
                                            onMouseLeave={handleMouseLeave}
                                            onDoubleClick={() => {
                                                // Open in new tab with focus
                                                const url = new URL(window.location.href);
                                                url.searchParams.set('focus', node.id);
                                                window.open(url.toString(), '_blank');
                                            }}
                                            title="Double-click to view in Map (New Tab)"
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

            {/* Hover Pop-up */}
            {hoveredNode && (
                <div
                    style={{
                        position: 'fixed',
                        top: hoveredNode.y,
                        left: hoveredNode.x,
                        zIndex: 1000,
                        pointerEvents: 'none' // Don't interfere with mouse
                    }}
                >
                    <MapPreview targetNodeId={hoveredNode.id} />
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
                onChange={onDateChange}
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

const TimelineColorPicker = ({ color, onChange }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const popoverRef = React.useRef(null);

    // 24 Light Colors suitable for black text
    // 18 Distinct Vibrant Colors (6x3 Grid) maximizing hue variation
    const lightPalette = [
        // Row 1: Vivid Warm (Red -> Green)
        '#ef4444', // Red 
        '#f97316', // Orange 
        '#eab308', // Gold 
        '#84cc16', // Lime 
        '#22c55e', // Green 
        '#10b981', // Emerald 

        // Row 2: Vivid Cool (Teal -> Pink) - Skipping similar blues
        '#14b8a6', // Teal 
        '#06b6d4', // Cyan 
        '#3b82f6', // Blue (Primary)
        '#8b5cf6', // Violet 
        '#d946ef', // Fuchsia 
        '#ec4899', // Pink 

        // Row 3: Distinct & Neutrals
        '#f43f5e', // Rose 
        '#64748b', // Slate (Blue Grey)
        '#78716c', // Stone (Warm Grey)
        '#818cf8', // Periwinkle (Indigo 400)
        '#fb7185', // Salmon (Rose 400)
        '#6ee7b7'  // Mint (Emerald 300)
    ];

    // Handle clicking outside to close
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (c) => {
        // Mock event object for the parent handler
        onChange({ target: { value: c } });
        setIsOpen(false);
    };

    return (
        <div className="timeline-marker-wrapper" style={{ position: 'relative' }}>
            <div
                className="timeline-marker"
                style={{ backgroundColor: color, borderColor: color, cursor: 'pointer' }}
                onClick={() => setIsOpen(!isOpen)}
                title="Change Date Color"
            ></div>

            {isOpen && (
                <div
                    ref={popoverRef}
                    className="color-popover"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: 8,
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        padding: 8,
                        zIndex: 1000,
                        width: 'max-content',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: 6
                    }}
                >
                    {lightPalette.map(c => (
                        <div
                            key={c}
                            onClick={() => handleSelect(c)}
                            style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                backgroundColor: c,
                                border: color === c ? '2px solid #334155' : '1px solid #cbd5e1',
                                cursor: 'pointer',
                                transition: 'transform 0.1s'
                            }}
                            title={c}
                        />
                    ))}
                    {/* Custom Picker Add Button */}
                    <label
                        className="custom-color-add"
                        style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #cbd5e1'
                        }}
                        title="Custom Color"
                    >
                        <input
                            type="color"
                            style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                            onChange={(e) => handleSelect(e.target.value)}
                        />
                        <span style={{ fontSize: 14, fontWeight: 'bold', color: 'white', textShadow: '0 0 2px black', pointerEvents: 'none' }}>+</span>
                    </label>
                </div>
            )}
        </div>
    );
};

export default TimelineView;
