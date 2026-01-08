import React, { createContext, useReducer, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { balanceTree } from '../utils/treeBalancer';

const MapContext = createContext();

const initialNode = {
    id: 'root',
    text: 'Central Topic',
    date: null,
    style: {
        backgroundColor: '#2563eb', // Blue back fill
        color: '#ffffff',           // White text
        fontSize: 24,               // Larger font (~14px * 1.7)
        fontWeight: 'bold',
        fontStyle: 'normal'
    },
    isCollapsed: false,
    children: []
};

const initialState = {
    root: initialNode,
    selectedIds: ['root'],
    editingId: null, // Track which node is being edited
    links: [],
    zoom: 1,
    view: 'map',
    horizontalSpread: 0 // 0 (Vertical) to 5 (Wide)
};

// Helper to find parent of a node (for sibling addition / deletion)
const findParent = (node, childId) => {
    if (!node.children) return null;
    for (let child of node.children) {
        if (child.id === childId) return node;
        const found = findParent(child, childId);
        if (found) return found;
    }
    return null;
};

// Helper to find node by ID
const findNode = (node, id) => {
    if (node.id === id) return node;
    if (!node.children) return null;
    for (let child of node.children) {
        const found = findNode(child, id);
        if (found) return found;
    }
    return null;
};

const mapReducer = (state, action) => {
    const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

    switch (action.type) {
        case 'SELECT_NODE': {
            const { id, multi } = action.payload;
            const newSelectedIds = multi
                ? (state.selectedIds.includes(id)
                    ? state.selectedIds.filter(sid => sid !== id)
                    : [...state.selectedIds, id])
                : [id];
            return { ...state, selectedIds: newSelectedIds };
        }

        case 'UPDATE_NODE': {
            const newState = deepClone(state);
            const idsToUpdate = action.payload.ids || [action.payload.id];

            idsToUpdate.forEach(id => {
                const node = findNode(newState.root, id);
                if (node) {
                    Object.assign(node, action.payload.updates);
                }
            });
            return newState;
        }

        case 'ADD_CHILD': {
            if (state.selectedIds.length === 0) return state;

            const parentId = state.selectedIds[state.selectedIds.length - 1]; // Take last selected
            const newState = deepClone(state);
            const parent = findNode(newState.root, parentId);

            if (parent) {
                const newNode = {
                    id: uuidv4(),
                    text: 'New Node',
                    date: null,
                    style: {
                        backgroundColor: '#ffffff', color: '#000000', fontSize: 14,
                        fontWeight: 'normal', fontStyle: 'normal'
                    },
                    children: []
                };
                if (!parent.children) parent.children = [];
                parent.children.push(newNode);
                parent.isCollapsed = false; // Auto-expand
                newState.selectedIds = [newNode.id];
                newState.editingId = newNode.id; // Auto-edit
            }

            return newState;
        }

        case 'ADD_SIBLING': {
            const newNode = {
                id: uuidv4(),
                text: 'New Sibling',
                date: null,
                style: {
                    backgroundColor: '#ffffff', color: '#000000', fontSize: 14,
                    fontWeight: 'normal', fontStyle: 'normal'
                },
                children: []
            };

            if (state.selectedIds.length === 0 || state.selectedIds[0] === 'root') return state; // No sibling for root

            const siblingId = state.selectedIds[0];
            const newState = deepClone(state);
            const parent = findParent(newState.root, siblingId);

            if (parent) {
                const index = parent.children.findIndex(c => c.id === siblingId);
                parent.children.splice(index + 1, 0, newNode);
                parent.isCollapsed = false; // Ensure parent is expanded so sibling is visible
                newState.selectedIds = [newNode.id];
                newState.editingId = newNode.id; // Auto-edit
            }

            return newState;
        }

        case 'DELETE_NODE': {
            const newState = deepClone(state);
            const idsToDelete = state.selectedIds.filter(id => id !== 'root');
            if (idsToDelete.length === 0) return state;

            idsToDelete.forEach(id => {
                const parent = findParent(newState.root, id);
                if (parent) {
                    const index = parent.children.findIndex(c => c.id === id);
                    if (index !== -1) parent.children.splice(index, 1);
                }
            });

            newState.selectedIds = ['root'];
            return newState;
        }

        case 'NAVIGATE': {
            const { direction } = action.payload;
            const currentId = state.selectedIds[state.selectedIds.length - 1] || 'root';

            const newState = deepClone(state);
            const parent = findParent(newState.root, currentId);
            const node = findNode(newState.root, currentId);

            let nextId = currentId;

            if (direction === 'LEFT') {
                if (parent) nextId = parent.id;
            } else if (direction === 'RIGHT') {
                if (node.children && node.children.length > 0 && !node.isCollapsed) {
                    nextId = node.children[0].id;
                }
            } else if (direction === 'UP' || direction === 'DOWN') {
                if (parent) {
                    const index = parent.children.findIndex(c => c.id === currentId);
                    if (direction === 'UP' && index > 0) {
                        nextId = parent.children[index - 1].id;
                    } else if (direction === 'DOWN' && index < parent.children.length - 1) {
                        nextId = parent.children[index + 1].id;
                    }
                }
            }

            return { ...state, selectedIds: [nextId] };
        }

        case 'LOAD_MAP': {
            const loadedState = action.payload;
            // Auto-balance on load if it's a fresh import (we assume LOAD_MAP implies import/open)
            if (loadedState.root) {
                balanceTree(loadedState.root);
            }
            return { ...loadedState, selectedIds: ['root'] };
        }

        case 'UPDATE_NODE_STYLE': {
            const newState = deepClone(state);
            const ids = action.payload.ids;
            const styleUpdates = action.payload.style;

            ids.forEach(id => {
                const node = findNode(newState.root, id);
                if (node) {
                    node.style = { ...node.style, ...styleUpdates };
                }
            });
            return newState;
        }

        case 'ADD_LINK': {
            const { from, to } = action.payload;
            if (state.links.some(l => (l.from === from && l.to === to) || (l.from === to && l.to === from))) {
                return state; // Duplicate
            }
            return {
                ...state,
                links: [...state.links, { id: uuidv4(), from, to, style: 'dashed', color: 'red' }]
            };
        }

        case 'DELETE_LINK':
            return {
                ...state,
                links: state.links.filter(l => l.id !== action.payload)
            };

        case 'SET_ZOOM':
            return { ...state, zoom: action.payload };

        case 'TOGGLE_COLLAPSE': {
            const newState = deepClone(state);
            const node = findNode(newState.root, action.payload);
            if (node) {
                node.isCollapsed = !node.isCollapsed;
            }
            return newState;
        }

        case 'MOVE_NODE': {
            const { dragId, targetId } = action.payload;
            if (dragId === targetId) return state;
            if (dragId === 'root') return state; // Cannot move root

            const newState = deepClone(state);

            // Circular check: is targetId a descendant of dragId?
            const dragNode = findNode(newState.root, dragId);
            if (!dragNode) return state;

            const isDescendant = (parent, id) => {
                if (!parent.children) return false;
                for (let child of parent.children) {
                    if (child.id === id) return true;
                    if (isDescendant(child, id)) return true;
                }
                return false;
            };

            if (isDescendant(dragNode, targetId)) {
                return state;
            }

            const oldParent = findParent(newState.root, dragId);
            if (!oldParent) return state;

            const index = oldParent.children.findIndex(c => c.id === dragId);
            oldParent.children.splice(index, 1);

            const newParent = findNode(newState.root, targetId);
            if (newParent) {
                if (!newParent.children) newParent.children = [];
                newParent.children.push(dragNode);
                newParent.isCollapsed = false;
            }

            return newState;
        }

        case 'SET_EDITING_ID':
            return { ...state, editingId: action.payload };

        case 'SET_VIEW':
            return { ...state, view: action.payload };

        case 'SET_HORIZONTAL_SPREAD':
            return { ...state, horizontalSpread: action.payload };

        default:
            return state;
    }
};

// Helper to load initial state
const loadState = () => {
    try {
        const saved = localStorage.getItem('mindMapData');
        if (saved) return JSON.parse(saved);
    } catch (e) {
        console.error("Failed to load map data", e);
    }
    return initialState;
};

export const MapProvider = ({ children }) => {
    const [state, dispatch] = useReducer(mapReducer, undefined, loadState);

    // Auto-save on change
    React.useEffect(() => {
        const timeout = setTimeout(() => {
            localStorage.setItem('mindMapData', JSON.stringify(state));
        }, 500); // Debounce 500ms
        return () => clearTimeout(timeout);
    }, [state]);

    return (
        <MapContext.Provider value={{ state, dispatch }}>
            {children}
        </MapContext.Provider>
    );
};

export const useMap = () => useContext(MapContext);
