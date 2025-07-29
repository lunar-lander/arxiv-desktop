import React, { useState, useEffect } from "react";
import HomePage from "./components/HomePage";
import Sidebar from "./components/Sidebar";
import PaperViewer from "./components/PaperViewer";
import AIChat from "./components/AIChat";
import { PaperProvider, usePapers } from "./context/PaperContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import styles from "./components/App.module.css";

function AppContent() {
  const [currentView, setCurrentView] = useState("home");
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [lastSearchQuery, setLastSearchQuery] = useState("");
  const [isAIChatVisible, setIsAIChatVisible] = useState(false);
  const { currentTheme } = useTheme();
  const { dispatch } = usePapers();

  // Handle menu actions from Electron
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onMenuAction((action, data) => {
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
        window.electronAPI.removeMenuActionListener();
      };
    }
  }, []);

  const handlePaperSelect = (paper) => {
    setSelectedPaper(paper);
    dispatch({ type: "SET_CURRENT_PAPER", payload: paper });
    setCurrentView("paper");
  };

  return (
    <div className={`${styles.appContainer} ${styles[currentTheme]}`}>
      <Sidebar
        onNavigate={setCurrentView}
        onPaperSelect={handlePaperSelect}
        currentView={currentView}
        onToggleAIChat={() => setIsAIChatVisible(!isAIChatVisible)}
        isAIChatVisible={isAIChatVisible}
      />
      <div className={styles.mainContent}>
        {currentView === "home" && (
          <HomePage
            onPaperOpen={handlePaperSelect}
            searchResults={searchResults}
            onSearchResults={setSearchResults}
            lastSearchQuery={lastSearchQuery}
            onSearchQuery={setLastSearchQuery}
          />
        )}
        {currentView === "paper" && selectedPaper && (
          <PaperViewer paper={selectedPaper} />
        )}
      </div>
      <AIChat
        isVisible={isAIChatVisible}
        onClose={() => setIsAIChatVisible(false)}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <PaperProvider>
        <AppContent />
      </PaperProvider>
    </ThemeProvider>
  );
}

export default App;
