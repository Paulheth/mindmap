import React, { useState, useRef, useEffect } from 'react';
import { useMap } from '../../context/MapContext';
import './Node.css';

const Node = ({ node, direction = 'right', isRoot = false }) => {
    const { state, dispatch } = useMap();
    const isEditing = state.editingId === node.id;
    const [editText, setEditText] = useState(node.text);
    const inputRef = useRef(null);

    const isSelected = state.selectedIds.includes(node.id);

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


    // Root Layout Handling
    if (isRoot) {
        const children = node.children || [];
        let leftChildren = [];
        let rightChildren = [];

        // Check if children have explicit side preference (from import)
        const hasExplicitSide = children.some(c => c.side);

        if (hasExplicitSide) {
            leftChildren = children.filter(c => c.side === 'left');
            // Default to right if 'right' or undefined/null
            rightChildren = children.filter(c => c.side !== 'left');
        } else {
            // Default balanced split
            const midpoint = Math.ceil(children.length / 2);
            rightChildren = children.slice(0, midpoint);
            leftChildren = children.slice(midpoint);
        }

        return (
            <div className="node-wrapper root">
                {/* Left Side */}
                <div className="node-children left-side" style={{ marginRight: 60, marginLeft: 0, alignItems: 'flex-end' }}>
                    {leftChildren.map(child => (
                        <Node key={child.id} node={child} direction="left" />
                    ))}
                </div>

                {/* Root Content */}
                <div
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
                    {/* No collapse button on root usually */}
                </div>

                {/* Right Side */}
                <div className="node-children right-side">
                    {rightChildren.map(child => (
                        <Node key={child.id} node={child} direction="right" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`node-wrapper ${direction === 'left' ? 'left-side' : ''}`}>
            <div
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
                {node.children && node.children.length > 0 && (
                    <div
                        className="collapse-btn"
                        onClick={toggleCollapse}
                        title={node.isCollapsed ? "Expand" : "Collapse"}
                    >
                        {node.isCollapsed ? '+' : '-'}
                    </div>
                )}
            </div>

            {!node.isCollapsed && node.children && node.children.length > 0 && (
                <div className={`node-children ${direction === 'left' ? 'left-side' : ''}`}>
                    {node.children.map(child => (
                        <Node key={child.id} node={child} direction={direction} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Node;
