import React, { useState, useEffect } from "react";
import HomePage from "./components/HomePage";
import Sidebar from "./components/Sidebar";
import PaperViewer from "./components/PaperViewer";
import { PaperProvider } from "./context/PaperContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import styles from "./components/App.module.css";

function AppContent() {
  const [currentView, setCurrentView] = useState("home");
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [lastSearchQuery, setLastSearchQuery] = useState("");
  const { currentTheme } = useTheme();

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

  return (
    <div className={`${styles.appContainer} ${styles[currentTheme]}`}>
      <Sidebar
        onNavigate={setCurrentView}
        onPaperSelect={setSelectedPaper}
        currentView={currentView}
      />
      <div className={styles.mainContent}>
        {currentView === "home" && (
          <HomePage
            onPaperOpen={(paper) => {
              setSelectedPaper(paper);
              setCurrentView("paper");
            }}
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
