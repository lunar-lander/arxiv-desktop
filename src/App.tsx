import { useState, useEffect } from "react";
import HomePage from "./components/HomePage";
import Sidebar from "./components/Sidebar";
import PaperViewer from "./components/PaperViewer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PaperProvider, usePapers } from "./context/PaperContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import styles from "./App.module.css";

function AppContent() {
  const [currentView, setCurrentView] = useState("home");
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [lastSearchQuery, setLastSearchQuery] = useState("");
  const { currentTheme } = useTheme();
  const { dispatch } = usePapers();
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // Handle menu actions from Electron
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onMenuAction((action, _data) => {
        switch (action) {
          case "new-search":
            setCurrentView("home");
            break;
          case "show-starred":
            // Could add a starred view here
            break;
          case "clear-cache":
            // Handle cache clearing
            break;
          default:
            break;
        }
      });

      return () => {
        if (window.electronAPI) {
          window.electronAPI.removeMenuActionListener();
        }
      };
    }
    return undefined;
  }, []);

  const handlePaperSelect = (paper: any) => {
    setSelectedPaper(paper);
    dispatch({ type: "SET_CURRENT_PAPER", payload: paper });
    setCurrentView("paper");
  };

  return (
    <div className={`${styles.appContainer} ${styles[currentTheme]}`}>
      {isSidebarVisible && (
        <ErrorBoundary>
          <Sidebar
            onNavigate={setCurrentView}
            onPaperSelect={handlePaperSelect}
            currentView={currentView}
            onToggleSidebar={() => setIsSidebarVisible(false)}
          />
        </ErrorBoundary>
      )}
      <div
        className={`${styles.mainContent} ${!isSidebarVisible ? styles.fullWidth : ""}`}
      >
        {!isSidebarVisible && (
          <button
            className={styles.showSidebarButton}
            onClick={() => setIsSidebarVisible(true)}
            title="Show sidebar"
          >
            ☰
          </button>
        )}
        {currentView === "home" && (
          <ErrorBoundary>
            <HomePage
              onPaperOpen={handlePaperSelect}
              searchResults={searchResults}
              onSearchResults={setSearchResults}
              lastSearchQuery={lastSearchQuery}
              onSearchQuery={setLastSearchQuery}
            />
          </ErrorBoundary>
        )}
        {currentView === "paper" && selectedPaper && (
          <ErrorBoundary>
            <PaperViewer paper={selectedPaper} />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <PaperProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </PaperProvider>
    </ThemeProvider>
  );
}

export default App;
