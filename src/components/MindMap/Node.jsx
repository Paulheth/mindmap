import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useMap } from '../../context/MapContext';
import './Node.css';

const Node = ({ node, positions, onReportSize, isRoot = false }) => {
    const { state, dispatch } = useMap();
    const isEditing = state.editingId === node.id;
    const [editText, setEditText] = useState(node.text);
    const inputRef = useRef(null);
    const contentRef = useRef(null);

    const isSelected = state.selectedIds.includes(node.id);
    const myPos = positions?.[node.id] || { x: 0, y: 0 };

    // Measure and report size
    useLayoutEffect(() => {
        if (contentRef.current) {
            const { offsetWidth, offsetHeight } = contentRef.current;
            if (onReportSize) {
                onReportSize(node.id, offsetWidth, offsetHeight);
            }
        }
    }, [node.text, node.style, isEditing, onReportSize, node.id]);

    const handleClick = (e) => {
        e.stopPropagation();
        dispatch({
            type: 'SELECT_NODE',
            payload: { id: node.id, multi: e.shiftKey || e.metaKey }
        });
    };

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
                    backgroundColor: node.style?.backgroundColor,
                    color: node.style?.color,
                    fontSize: node.style?.fontSize ? `${node.style.fontSize}px` : undefined,
                    fontWeight: node.style?.fontWeight,
                    fontStyle: node.style?.fontStyle,
                    zIndex: 10
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
                {node.date && <div className="node-date">{node.date}</div>}

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

                        // Calculate relative position from Parent Center (or Top-Left) to Child
                        // Note: myPos and childPos are absolute coordinates in the map space.
                        // We are inside the Parent's div.
                        // If Parent is at (100, 100) and Child is at (200, 150).
                        // Rel = (100, 50).
                        const relX = childPos.x - myPos.x;
                        const relY = childPos.y - myPos.y;

                        return (
                            <div
                                key={child.id}
                                style={{
                                    position: 'absolute',
                                    transform: `translate(${relX}px, ${relY}px)`,
                                    // Ensure width doesn't collapse 
                                    width: 'max-content'
                                }}
                            >
                                <Node
                                    node={child}
                                    positions={positions}
                                    onReportSize={onReportSize}
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
