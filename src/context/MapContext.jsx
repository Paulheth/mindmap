import React, { createContext, useReducer, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';
import { balanceTree } from '../utils/treeBalancer';

const MapContext = createContext();

export const initialNode = {
    id: 'root',
    text: 'Central Topic',
    date: null,
    style: {},
    x: null, // Manual Layout Override X
    y: null, // Manual Layout Override Y
    isCollapsed: false,
    children: []
};

export const initialState = {
    mapId: null, // Database ID
    hasCheckedCloud: false, // Critical for race condition
    isStartupModalOpen: false,
    saveStatus: 'saved', // 'saving', 'saved', 'error'
    saveError: null,
    cloudMapMetadata: null, // { id, last_modified, title }
    root: initialNode,
    nodePositions: {}, // Global layout state
    selectedIds: ['root'],
    editingId: null, // Track which node is being edited
    editingNoteId: null, // Track which node's note is being edited
    links: [],
    pan: { x: 0, y: 0 },
    zoom: 1,
    view: 'map',
    isSaveModalOpen: false,
    filename: 'mindmap', // Default filename
    horizontalSpread: 0, // 0 (Vertical) to 5 (Wide) -- Deprecated but kept for compatibility?
    layoutSpacing: 0, // 0 (Vertical) to 10 (Wide / Wall Fill)
    autoSave: true, // Default to on
    editingStyleLevel: null, // For StyleEditor modal
    levelStyles: (() => {
        try {
            const saved = localStorage.getItem('userDefaultStyles');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error("Failed to load user default styles", e);
        }
        return {
            0: { backgroundColor: '#2563eb', color: '#ffffff', fontSize: 24, fontWeight: 'bold', borderRadius: 4 },
            1: { backgroundColor: '#ef4444', color: '#ffffff', fontSize: 18, fontWeight: 'normal', borderRadius: 4 },
            2: { backgroundColor: '#22c55e', color: '#ffffff', fontSize: 16, fontWeight: 'normal', borderRadius: 4 },
            3: { backgroundColor: '#3b82f6', color: '#ffffff', fontSize: 14, fontWeight: 'normal', borderRadius: 25 },
            4: { backgroundColor: '#f59e0b', color: '#000000', fontSize: 14, fontWeight: 'normal', borderRadius: 25 },
            5: { backgroundColor: '#64748b', color: '#ffffff', fontSize: 12, fontWeight: 'normal', borderRadius: 25 }
        };
    })()
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

// Helper to sanitize corrupt dates (e.g. 202601-02-05 -> 2026-02-05)
const sanitizeDate = (dateStr) => {
    if (!dateStr) return null;
    if (typeof dateStr !== 'string') return null;

    // Standard ISO: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // Known corrupt format: YYYYXX-MM-DD (12 chars). 
    // We strip the extra 2 digits after year.
    if (/^\d{6}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr.substring(0, 4) + dateStr.substring(6);
    }

    return dateStr;
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
            const { ids, id, updates } = action.payload;
            const targets = ids || [id];

            // Pre-sanitize date if present
            if (updates.date) {
                updates.date = sanitizeDate(updates.date);
            }

            targets.forEach(targetId => {
                if (!targetId) return;
                const node = findNode(newState.root, targetId);
                if (node) {
                    Object.assign(node, updates);
                }
            });
            return newState;
        }

        case 'UPDATE_NODE_POSITION': {
            const newState = deepClone(state);
            const { id, x, y } = action.payload;
            const node = findNode(newState.root, id);
            if (node) {
                node.x = x;
                node.y = y;
            }
            return newState;
        }

        case 'UPDATE_ALL_NODE_POSITIONS': {
            // Bulk update for layout engine results
            return { ...state, nodePositions: action.payload };
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
                    style: {}, // Empty to inherit level style
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
                style: {}, // Empty to inherit level style
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

            // Merge loaded state on top of initialState
            const newState = {
                ...initialState,
                ...loadedState,
                hasCheckedCloud: true // Ensure verification passes so autosave works
            };

            // Intelligent Merge of Level Styles
            // We want to preserve user customizations (colors) but adopt new structure defaults (borderRadius)
            // if the user hasn't explicitly defined them (which they couldn't have before today).
            const defaultStyles = initialState.levelStyles || {};
            const loadedStyles = newState.levelStyles || {};

            const mergedLevelStyles = {};
            // Level 0 to 5
            for (let i = 0; i <= 5; i++) {
                mergedLevelStyles[i] = {
                    ...defaultStyles[i], // Start with new defaults (inc. borderRadius 25)
                    ...(loadedStyles[i] || {}) // Overwrite with user saved overrides (colors)
                };
            }
            newState.levelStyles = mergedLevelStyles;

            // Sanitize all dates in the tree
            if (newState.root) {
                const traverseAndSanitize = (node) => {
                    if (node.date) {
                        node.date = sanitizeDate(node.date);
                    }
                    if (node.children) node.children.forEach(traverseAndSanitize);
                };
                traverseAndSanitize(newState.root);

                // Auto-balance on load if it's a fresh import (and maybe after sanitization?)
                balanceTree(newState.root);
            }

            // Reset interaction state
            newState.selectedIds = ['root'];
            newState.editingId = null;
            newState.editingStyleLevel = null;

            return newState;
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
            const existingIndex = state.links.findIndex(l => (l.from === from && l.to === to) || (l.from === to && l.to === from));

            if (existingIndex >= 0) {
                // Remove existing link (Toggle OFF)
                const newLinks = [...state.links];
                newLinks.splice(existingIndex, 1);
                return { ...state, links: newLinks };
            }

            // Add new link (Toggle ON)
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

        case 'SET_PAN':
            return { ...state, pan: action.payload };

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

        case 'SET_EXPANSION_LEVEL': {
            const newState = deepClone(state);
            const targetLevel = action.payload; // Number or Infinity

            const traverse = (node, currentLevel) => {
                if (!node) return;

                // Leaf nodes don't need collapse state managed really, but standardizing is good.
                // If currentLevel < targetLevel, we want it EXPANDED (isCollapsed = false)
                // If currentLevel >= targetLevel, we want it COLLAPSED (isCollapsed = true)
                // Exception: Root usually stays expanded? Logic implies we expand UP TO level X.
                // So if I say "Level 1", Root (L0) is expanded, its children (L1) are collapsed?
                // Or Root (L0) expanded, Children (L1) expanded, Grandchildren (L2) collapsed?
                // Usually "Expand to Level 1" means Level 1 nodes are visible.

                if (node.children && node.children.length > 0) {
                    if (currentLevel < targetLevel) {
                        node.isCollapsed = false;
                    } else {
                        node.isCollapsed = true;
                    }
                    node.children.forEach(child => traverse(child, currentLevel + 1));
                }
            };

            traverse(newState.root, 0); // Root is level 0
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

        case 'SET_EDITING_NOTE_ID':
            return { ...state, editingNoteId: action.payload };

        case 'SET_VIEW':
            return { ...state, view: action.payload };

        case 'SET_HORIZONTAL_SPREAD':
            return { ...state, horizontalSpread: action.payload };

        case 'SET_LAYOUT_SPACING':
            return { ...state, layoutSpacing: action.payload };

        case 'UPDATE_LEVEL_STYLE': {
            const { level, style } = action.payload;
            return {
                ...state,
                levelStyles: {
                    ...state.levelStyles,
                    [level]: { ...state.levelStyles[level], ...style }
                }
            };
        }

        case 'SET_EDITING_STYLE_LEVEL':
            return { ...state, editingStyleLevel: action.payload };

        case 'SET_SAVE_MODAL_OPEN':
            return { ...state, isSaveModalOpen: action.payload };

        case 'SET_FILENAME':
            return { ...state, filename: action.payload };

        case 'RESET_ALL_NODE_STYLES': {
            const newState = deepClone(state);
            const traverseAndReset = (node) => {
                if (!node) return;
                node.style = {}; // Clear manual overrides
                if (node.children) node.children.forEach(traverseAndReset);
            };
            traverseAndReset(newState.root);
            return newState;
        }

        case 'SET_MAP_ID':
            return { ...state, mapId: action.payload };

        case 'FOUND_CLOUD_MAP':
            return {
                ...state,
                isStartupModalOpen: true,
                hasCheckedCloud: true,
                cloudMapMetadata: action.payload
            };

        case 'Check_COMPLETE_NO_MAP':
            // If no map found, we just mark checked so auto-save can effectively "start" a new one
            return {
                ...state,
                hasCheckedCloud: true
            };

        case 'CLOSE_STARTUP_MODAL':
            return {
                ...state,
                isStartupModalOpen: false,
                cloudMapMetadata: null
            };

        case 'SET_SAVE_STATUS': {
            const status = typeof action.payload === 'string' ? action.payload : action.payload.status;
            const error = typeof action.payload === 'object' ? action.payload.error : null;
            return {
                ...state,
                saveStatus: status, // 'saving', 'saved', 'error'
                saveError: error
            };
        }

        default:
            return state;
    }
};

// Helper to load initial state (Moved logic inside effect or reducer initiation if needed, but we'll use effect for user switching)
// We default to initialState on first render, then load user data.

export const MapProvider = ({ children, userId }) => {
    const [state, dispatch] = useReducer(mapReducer, initialState);

    const loadMapFromCloud = async (mapId) => {
        try {
            const { data, error } = await supabase
                .from('maps')
                .select('*')
                .eq('id', mapId)
                .single();

            if (data && data.content) {
                dispatch({ type: 'LOAD_MAP', payload: data.content });
                dispatch({ type: 'SET_MAP_ID', payload: data.id });
                dispatch({ type: 'CLOSE_STARTUP_MODAL' });
            }
        } catch (e) {
            console.error("Failed to load map:", e);
        }
    };

    const startNewMap = () => {
        dispatch({ type: 'LOAD_MAP', payload: initialState });
        dispatch({ type: 'CLOSE_STARTUP_MODAL' });
    };

    // Load data when userId changes (Switch to Cloud)
    React.useEffect(() => {
        if (!userId) return;

        const checkCloudForMaps = async () => {
            console.log("Checking cloud for maps...");
            try {
                // Fetch ONLY metadata first to see if a map exists
                const { data, error } = await supabase
                    .from('maps')
                    .select('id, last_modified, title')
                    .eq('user_id', userId)
                    .order('last_modified', { ascending: false })
                    .limit(1)
                    .single();

                if (data) {
                    console.log("Map found:", data);

                    // Check for Deep Link (Focus)
                    const params = new URLSearchParams(window.location.search);
                    if (params.get('focus')) {
                        console.log("Deep link (focus) detected. Auto-loading map...");
                        loadMapFromCloud(data.id);
                    } else {
                        // Map found! Ask user what to do
                        dispatch({
                            type: 'FOUND_CLOUD_MAP',
                            payload: {
                                id: data.id,
                                last_modified: data.last_modified,
                                title: data.title
                            }
                        });
                    }
                } else {
                    console.log("No maps found.");
                    // No map found, start fresh
                    dispatch({ type: 'Check_COMPLETE_NO_MAP' }); // Just mark checked, allow auto-save to start
                }
            } catch (e) {
                console.log("Error checking maps (likely new user):", e);
                // .single() returns error if 0 rows, which is fine (new user)
                dispatch({ type: 'Check_COMPLETE_NO_MAP' });
            }
        };

        checkCloudForMaps();
    }, [userId]);

    // Ref to track last saved content to prevent infinite loops and redundant saves
    const lastSavedContent = React.useRef(null);

    // Auto-save to Supabase (Debounced)
    React.useEffect(() => {
        if (!userId) return;

        // CRITICAL: Block saving until we have checked for existing maps
        // This prevents overwriting the "Last Map" with a blank default map on startup
        if (!state.hasCheckedCloud) {
            console.log("Auto-save blocked: Cloud check not complete.");
            return;
        }

        // Don't save if the modal is still open (user hasn't decided yet)
        if (state.isStartupModalOpen) {
            console.log("Auto-save blocked: Startup modal is open.");
            return;
        }

        const saveToCloud = async () => {
            // Prevent saving if we haven't loaded yet or if state is empty
            if (!state.root) {
                console.log("Auto-save blocked: State root is empty.");
                return;
            }

            const mapContent = { ...state };

            // Clean up transient state before saving/comparing
            delete mapContent.isStartupModalOpen;
            delete mapContent.cloudMapMetadata;
            delete mapContent.saveStatus;
            delete mapContent.hasCheckedCloud; // Don't save this

            // Check if content actually changed
            const contentString = JSON.stringify(mapContent);
            if (lastSavedContent.current === contentString) {
                console.log("Auto-save skipped: No changes detected.");
                return; // Nothing changed, skip save
            }

            console.log("Initiating auto-save to cloud...");
            dispatch({ type: 'SET_SAVE_STATUS', payload: 'saving' });

            try {
                const mapData = {
                    user_id: userId,
                    title: state.filename || 'Untitled Map',
                    content: mapContent,
                    last_modified: new Date().toISOString()
                };

                // If we have an ID, update existing. If not, insert new.
                if (state.mapId) {
                    mapData.id = state.mapId;
                }

                const { data, error } = await supabase
                    .from('maps')
                    .upsert(mapData)
                    .select()
                    .single();

                if (error) throw error;

                if (data && !state.mapId) {
                    // We just created a new map, save its ID so future updates go to the same row
                    dispatch({ type: 'SET_MAP_ID', payload: data.id });
                }

                // Update ref to current content so we don't save again
                lastSavedContent.current = contentString;
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
                console.log("Auto-save successful.");
            } catch (e) {
                console.error("Auto-save failed:", e);
                const errorMessage = e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
                dispatch({ type: 'SET_SAVE_STATUS', payload: { status: 'error', error: errorMessage } });
            }
        };

        const timeout = setTimeout(saveToCloud, 2000); // 2s Debounce
        return () => clearTimeout(timeout);
    }, [state, userId]);

    return (
        <MapContext.Provider value={{ state, dispatch, loadMapFromCloud, startNewMap }}>
            {children}
        </MapContext.Provider>
    );
};

export const useMap = () => useContext(MapContext);
