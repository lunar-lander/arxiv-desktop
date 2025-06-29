import React, { createContext, useContext, useReducer, useEffect } from 'react';

const PaperContext = createContext();

const initialState = {
  openPapers: [],
  bookmarkedPapers: [],
  starredPapers: [],
  searchHistory: [],
  currentUser: null,
  isLoading: false
};

function paperReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    
    case 'ADD_OPEN_PAPER':
      const exists = state.openPapers.find(p => p.id === action.payload.id);
      if (exists) return state;
      return { 
        ...state, 
        openPapers: [...state.openPapers, action.payload] 
      };
    
    case 'REMOVE_OPEN_PAPER':
      return {
        ...state,
        openPapers: state.openPapers.filter(p => p.id !== action.payload)
      };
    
    case 'ADD_BOOKMARK':
      const bookmarkExists = state.bookmarkedPapers.find(p => p.id === action.payload.id);
      if (bookmarkExists) return state;
      return {
        ...state,
        bookmarkedPapers: [...state.bookmarkedPapers, action.payload]
      };
    
    case 'REMOVE_BOOKMARK':
      return {
        ...state,
        bookmarkedPapers: state.bookmarkedPapers.filter(p => p.id !== action.payload)
      };
    
    case 'TOGGLE_STAR':
      const isStarred = state.starredPapers.find(p => p.id === action.payload.id);
      if (isStarred) {
        return {
          ...state,
          starredPapers: state.starredPapers.filter(p => p.id !== action.payload.id)
        };
      } else {
        return {
          ...state,
          starredPapers: [...state.starredPapers, action.payload]
        };
      }
    
    case 'ADD_SEARCH':
      return {
        ...state,
        searchHistory: [action.payload, ...state.searchHistory.slice(0, 9)]
      };
    
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    
    default:
      return state;
  }
}

export function PaperProvider({ children }) {
  const [state, dispatch] = useReducer(paperReducer, initialState);

  useEffect(() => {
    loadPersistedState();
  }, []);

  useEffect(() => {
    persistState();
  }, [state.bookmarkedPapers, state.starredPapers, state.searchHistory]);

  const loadPersistedState = async () => {
    try {
      const appDataPath = await window.electronAPI.getAppDataPath();
      const stateFile = `${appDataPath}/app-state.json`;
      const exists = await window.electronAPI.fileExists(stateFile);
      
      if (exists) {
        const result = await window.electronAPI.readFile(stateFile);
        if (result.success) {
          const savedState = JSON.parse(result.data.toString());
          dispatch({ type: 'LOAD_STATE', payload: savedState });
        }
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  };

  const persistState = async () => {
    try {
      const appDataPath = await window.electronAPI.getAppDataPath();
      await window.electronAPI.ensureDirectory(appDataPath);
      
      const stateToSave = {
        bookmarkedPapers: state.bookmarkedPapers,
        starredPapers: state.starredPapers,
        searchHistory: state.searchHistory
      };
      
      const stateFile = `${appDataPath}/app-state.json`;
      await window.electronAPI.writeFile(stateFile, JSON.stringify(stateToSave, null, 2));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  };

  return (
    <PaperContext.Provider value={{ state, dispatch }}>
      {children}
    </PaperContext.Provider>
  );
}

export function usePapers() {
  const context = useContext(PaperContext);
  if (!context) {
    throw new Error('usePapers must be used within a PaperProvider');
  }
  return context;
}