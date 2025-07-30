import React, { createContext, useContext, useReducer, useEffect } from "react";
import { AuthService } from "../services/authService";
import storageService from "../services/storageService";

const PaperContext = createContext();

const initialState = {
  openPapers: [],
  starredPapers: [],
  searchHistory: [],
  currentUser: null,
  currentPaper: null,
  isLoading: false,
};

function paperReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_USER":
      return { ...state, currentUser: action.payload };

    case "SET_CURRENT_PAPER":
      return { ...state, currentPaper: action.payload };

    case "ADD_OPEN_PAPER":
      const exists = state.openPapers.find((p) => p.id === action.payload.id);
      if (exists) return state;
      return {
        ...state,
        openPapers: [...state.openPapers, action.payload],
      };

    case "REMOVE_OPEN_PAPER":
      return {
        ...state,
        openPapers: state.openPapers.filter((p) => p.id !== action.payload),
      };

    case "TOGGLE_STAR":
      const isStarred = state.starredPapers.find(
        (p) => p.id === action.payload.id
      );
      if (isStarred) {
        return {
          ...state,
          starredPapers: state.starredPapers.filter(
            (p) => p.id !== action.payload.id
          ),
        };
      } else {
        return {
          ...state,
          starredPapers: [...state.starredPapers, action.payload],
        };
      }

    case "ADD_SEARCH":
      return {
        ...state,
        searchHistory: [action.payload, ...state.searchHistory.slice(0, 9)],
      };

    case "LOAD_STATE":
      return { ...state, ...action.payload };

    case "UPDATE_PAPER_LOCAL_PATH":
      return {
        ...state,
        openPapers: state.openPapers.map(p => 
          p.id === action.payload.paperId 
            ? { ...p, localPath: action.payload.localPath }
            : p
        ),
        starredPapers: state.starredPapers.map(p => 
          p.id === action.payload.paperId 
            ? { ...p, localPath: action.payload.localPath }
            : p
        ),
      };

    default:
      return state;
  }
}

export function PaperProvider({ children }) {
  const [state, dispatch] = useReducer(paperReducer, initialState);

  // Enhanced dispatch that handles async storage operations
  const enhancedDispatch = async (action) => {
    switch (action.type) {
      case "TOGGLE_STAR":
        const isStarred = state.starredPapers.find(
          (p) => p.id === action.payload.id
        );
        dispatch(action);
        if (isStarred) {
          await storageService.removeStar(action.payload.id);
        } else {
          await storageService.addStar(action.payload);
        }
        break;
      case "ADD_SEARCH":
        dispatch(action);
        await storageService.addSearchHistory(action.payload);
        break;
      case "ADD_OPEN_PAPER":
        dispatch(action);
        await storageService.addToOpenedPapers(action.payload);
        break;
      case "REMOVE_OPEN_PAPER":
        dispatch(action);
        await storageService.removeFromOpenedPapers(action.payload);
        break;
      case "UPDATE_PAPER_LOCAL_PATH":
        dispatch(action);
        // Update both opened and starred papers in storage
        await storageService.updatePaperLocalPath(action.payload.paperId, action.payload.localPath);
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
  }, [state.starredPapers, state.searchHistory]);

  const loadPersistedState = async () => {
    try {
      const [starred, searchHistory, opened] = await Promise.all([
        storageService.getStarredPapers(),
        storageService.getSearchHistory(),
        storageService.getOpenedPapers(),
      ]);

      dispatch({
        type: "LOAD_STATE",
        payload: {
          starredPapers: starred,
          searchHistory: searchHistory,
          openPapers: opened,
        },
      });
    } catch (error) {
      console.error("Failed to load persisted state:", error);
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
        dispatch({ type: "SET_USER", payload: user });
      }
    } catch (error) {
      console.error("Failed to load current user:", error);
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
    throw new Error("usePapers must be used within a PaperProvider");
  }
  return context;
}
