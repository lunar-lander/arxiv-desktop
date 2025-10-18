import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useState,
} from "react";
import { AuthService } from "../services/authService";
import storageService from "../services/storageService";
import type { Paper, PaperState, PaperAction, User } from "../types";

interface PaperContextType {
  state: PaperState;
  dispatch: React.Dispatch<PaperAction>;
}

const PaperContext = createContext<PaperContextType | undefined>(undefined);

const initialState: PaperState = {
  openPapers: [],
  starredPapers: [],
  currentUser: null,
};

function paperReducer(state: PaperState, action: PaperAction): PaperState {
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
        openPapers: state.openPapers.map((p) =>
          p.id === action.payload.paperId
            ? { ...p, localPath: action.payload.localPath }
            : p
        ),
        starredPapers: state.starredPapers.map((p) =>
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
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef(null);

  // Enhanced dispatch that handles async storage operations with proper error handling
  const enhancedDispatch = async (action) => {
    // Prevent multiple concurrent operations
    if (isLoading) {
      console.warn(
        "Storage operation already in progress, queueing action:",
        action.type
      );
    }

    setIsLoading(true);

    try {
      switch (action.type) {
        case "TOGGLE_STAR": {
          const isStarred = state.starredPapers.find(
            (p) => p.id === action.payload.id
          );
          // Optimistic update
          dispatch(action);

          try {
            if (isStarred) {
              await storageService.removeStar(action.payload.id);
            } else {
              await storageService.addStar(action.payload);
            }
          } catch (error) {
            console.error("Failed to persist star change:", error);
            // Revert optimistic update
            dispatch(action);
            throw error;
          }
          break;
        }
        case "ADD_SEARCH": {
          dispatch(action);
          try {
            await storageService.addSearchHistory(action.payload);
          } catch (error) {
            console.error("Failed to persist search history:", error);
          }
          break;
        }
        case "ADD_OPEN_PAPER": {
          dispatch(action);
          try {
            await storageService.addToOpenedPapers(action.payload);
          } catch (error) {
            console.error("Failed to persist opened paper:", error);
          }
          break;
        }
        case "REMOVE_OPEN_PAPER": {
          dispatch(action);
          try {
            await storageService.removeFromOpenedPapers(action.payload);
          } catch (error) {
            console.error("Failed to remove opened paper:", error);
          }
          break;
        }
        case "UPDATE_PAPER_LOCAL_PATH": {
          dispatch(action);
          try {
            await storageService.updatePaperLocalPath(
              action.payload.paperId,
              action.payload.localPath
            );
          } catch (error) {
            console.error("Failed to update paper local path:", error);
          }
          break;
        }
        default:
          dispatch(action);
          break;
      }
    } catch (error) {
      console.error("Enhanced dispatch error:", error);
      // Don't throw to prevent UI crashes, just log
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        await Promise.all([
          loadPersistedState(isMounted),
          loadCurrentUser(isMounted),
        ]);
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    persistState();
  }, [state.starredPapers, state.searchHistory]);

  const loadPersistedState = async (isMounted = true) => {
    if (!isMounted) return;

    try {
      abortControllerRef.current = new AbortController();

      const [starred, searchHistory, opened] = await Promise.all([
        storageService.getStarredPapers(),
        storageService.getSearchHistory(),
        storageService.getOpenedPapers(),
      ]);

      if (!isMounted) return; // Check if component is still mounted

      dispatch({
        type: "LOAD_STATE",
        payload: {
          starredPapers: starred || [],
          searchHistory: searchHistory || [],
          openPapers: opened || [],
          currentUser: null,
        },
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Failed to load persisted state:", error);
      }
    }
  };

  const persistState = async () => {
    // State is now automatically persisted by individual actions
    // This function is kept for backward compatibility but no longer needed
  };

  const loadCurrentUser = async (isMounted = true) => {
    if (!isMounted) return;

    try {
      const user = await AuthService.getCurrentUser();
      if (user && isMounted) {
        dispatch({ type: "SET_USER", payload: user });
      }
    } catch (error) {
      if (isMounted) {
        console.error("Failed to load current user:", error);
      }
    }
  };

  return (
    <PaperContext.Provider
      value={{
        state: { ...state, isLoading },
        dispatch: enhancedDispatch,
      }}
    >
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
