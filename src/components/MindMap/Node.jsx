import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useMap } from '../../context/MapContext';
import { NotePencil } from '@phosphor-icons/react';
import './Node.css';

const Node = ({ node, positions, onReportSize, level = 0 }) => {
    const { state, dispatch } = useMap();
    const isRoot = level === 0;
    const isEditing = state.editingId === node.id;
    const [editText, setEditText] = useState(node.text);
    const inputRef = useRef(null);
    const contentRef = useRef(null);

    const isSelected = state.selectedIds.includes(node.id);
    const myPos = positions?.[node.id] || { x: 0, y: 0 };

    // Resolve Style: Templates > User Overrides
    const levelStyle = state.levelStyles?.[Math.min(level, 5)] || {};
    const effectiveStyle = {
        ...levelStyle,
        ...node.style, // Node explicit style overrides template
    };

    // Measure and report size
    useLayoutEffect(() => {
        if (contentRef.current) {
            const { offsetWidth, offsetHeight } = contentRef.current;
            if (onReportSize) {
                onReportSize(node.id, offsetWidth, offsetHeight);
            }
        }
    }, [node.text, effectiveStyle, isEditing, onReportSize, node.id]); // Use effectiveStyle dependency

    const handleClick = (e) => {
        e.stopPropagation();
        dispatch({
            type: 'SELECT_NODE',
            payload: { id: node.id, multi: e.shiftKey || e.metaKey }
        });
    };

    // ... (Drag handlers same as before) ...
    const handleDragStart = (e) => {
        e.stopPropagation();
        e.dataTransfer.setData('nodeId', node.id);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const dragId = e.dataTransfer.getData('nodeId');
        if (dragId) {
            dispatch({ type: 'MOVE_NODE', payload: { dragId, targetId: node.id } });
        }
    };

    const toggleCollapse = (e) => {
        e.stopPropagation();
        dispatch({ type: 'TOGGLE_COLLAPSE', payload: node.id });
    };

    const handleDoubleClick = (e) => {
        e.stopPropagation();
        dispatch({ type: 'SET_EDITING_ID', payload: node.id });
    };

    const handleBorderDoubleClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        // Open Style Editor for this level
        dispatch({ type: 'SET_EDITING_STYLE_LEVEL', payload: Math.min(level, 5) });
    };

    const handleBlur = () => {
        dispatch({ type: 'SET_EDITING_ID', payload: null });
        if (editText !== node.text) {
            dispatch({
                type: 'UPDATE_NODE',
                payload: { id: node.id, updates: { text: editText } }
            });
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    useEffect(() => {
        setEditText(node.text);
    }, [node.text])


    return (
        <div className={`node-wrapper ${isRoot ? 'root' : ''}`}>
            {/* Node Content (The visual box) */}
            <div
                ref={contentRef}
                id={`node-${node.id}`}
                className={`node-content ${isSelected ? 'selected' : ''}`}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                draggable
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{
                    backgroundColor: effectiveStyle.backgroundColor,
                    color: effectiveStyle.color,
                    fontSize: effectiveStyle.fontSize ? `${effectiveStyle.fontSize}px` : undefined,
                    fontWeight: effectiveStyle.fontWeight,
                    fontStyle: effectiveStyle.fontStyle,
                    zIndex: 10,
                    position: 'relative' // relative to sit above border target? Target is absolute.
                }}
            >
                {isEditing ? (
                    <input
                        ref={inputRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="node-input"
                    />
                ) : (
                    <span className="node-text">{node.text}</span>
                )}
                {node.date && (
                    <div
                        className="node-date"
                        style={node.dateColor ? { backgroundColor: node.dateColor } : {}}
                    >
                        {node.date}
                    </div>
                )}

                {/* Note Indicator */}
                {node.note && (
                    <div
                        className="node-note-icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: 'SET_EDITING_NOTE_ID', payload: node.id });
                        }}
                        title="Edit Note"
                    >
                        <NotePencil size={16} weight="fill" />
                    </div>
                )}

                {/* Collapse Button */}
                {!isRoot && node.children && node.children.length > 0 && (
                    <div
                        className="collapse-btn"
                        onClick={toggleCollapse}
                        title={node.isCollapsed ? "Expand" : "Collapse"}
                    >
                        {node.isCollapsed ? '+' : '-'}
                    </div>
                )}
            </div>

            {/* Children Layer (Absolute Positioning) */}
            {!node.isCollapsed && node.children && node.children.length > 0 && (
                <div className="node-children-layer" style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, overflow: 'visible' }}>
                    {node.children.map(child => {
                        const childPos = positions?.[child.id];
                        if (!childPos) return null; // Wait for layout

                        const relX = childPos.x - myPos.x;
                        const relY = childPos.y - myPos.y;

                        return (
                            <div
                                key={child.id}
                                style={{
                                    position: 'absolute',
                                    transform: `translate(${relX}px, ${relY}px)`,
                                    width: 'max-content'
                                }}
                            >
                                <Node
                                    node={child}
                                    positions={positions}
                                    onReportSize={onReportSize}
                                    level={level + 1}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Node;
