import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthService } from '../services/authService';
import storageService from '../services/storageService';

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

  // Enhanced dispatch that handles async storage operations
  const enhancedDispatch = async (action) => {
    switch (action.type) {
      case 'ADD_BOOKMARK':
        dispatch(action);
        await storageService.addBookmark(action.payload);
        break;
      case 'REMOVE_BOOKMARK':
        dispatch(action);
        await storageService.removeBookmark(action.payload);
        break;
      case 'TOGGLE_STAR':
        const isStarred = state.starredPapers.find(p => p.id === action.payload.id);
        dispatch(action);
        if (isStarred) {
          await storageService.removeStar(action.payload.id);
        } else {
          await storageService.addStar(action.payload);
        }
        break;
      case 'ADD_SEARCH':
        dispatch(action);
        await storageService.addSearchHistory(action.payload);
        break;
      case 'ADD_OPEN_PAPER':
        dispatch(action);
        await storageService.addToOpenedPapers(action.payload);
        break;
      case 'REMOVE_OPEN_PAPER':
        dispatch(action);
        await storageService.removeFromOpenedPapers(action.payload);
        break;
      default:
        dispatch(action);
        break;
    }
  };

  useEffect(() => {
    loadPersistedState();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    persistState();
  }, [state.bookmarkedPapers, state.starredPapers, state.searchHistory]);

  const loadPersistedState = async () => {
    try {
      const [bookmarked, starred, searchHistory, opened] = await Promise.all([
        storageService.getBookmarkedPapers(),
        storageService.getStarredPapers(),
        storageService.getSearchHistory(),
        storageService.getOpenedPapers()
      ]);

      dispatch({ 
        type: 'LOAD_STATE', 
        payload: { 
          bookmarkedPapers: bookmarked,
          starredPapers: starred,
          searchHistory: searchHistory,
          openPapers: opened
        } 
      });
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  };

  const persistState = async () => {
    // State is now automatically persisted by individual actions
    // This function is kept for backward compatibility but no longer needed
  };

  const loadCurrentUser = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      if (user) {
        dispatch({ type: 'SET_USER', payload: user });
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  return (
    <PaperContext.Provider value={{ state, dispatch: enhancedDispatch }}>
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