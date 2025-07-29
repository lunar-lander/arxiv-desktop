import React, { useState } from "react";
import { Home, FileText, Star, User, X, LogIn, LogOut, Bot } from "lucide-react";
import { usePapers } from "../context/PaperContext";
import { AuthService } from "../services/authService";
import LoginModal from "./LoginModal";
import ThemeToggle from "./ThemeToggle";
import styles from "./Sidebar.module.css";

function Sidebar({ onNavigate, onPaperSelect, currentView, onToggleAIChat, isAIChatVisible }) {
  const { state, dispatch } = usePapers();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleNavigation = (view) => {
    onNavigate(view);
  };

  const handlePaperSelect = (paper) => {
    onPaperSelect(paper);
    onNavigate("paper");
  };

  const handleClosePaper = (paperId, e) => {
    e.stopPropagation();
    dispatch({ type: "REMOVE_OPEN_PAPER", payload: paperId });
  };

  const handleToggleStar = (paper, e) => {
    e.stopPropagation();
    dispatch({ type: "TOGGLE_STAR", payload: paper });
  };

  const handleLogin = (user) => {
    dispatch({ type: "SET_USER", payload: user });
  };

  const handleLogout = async () => {
    if (state.currentUser) {
      await AuthService.logout(state.currentUser.source);
      dispatch({ type: "SET_USER", payload: null });
    }
  };

  return (
    <div className={styles.sidebarContainer}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.appTitle}>ArXiv Desktop</h2>
        <ThemeToggle />
      </div>

      <div className={styles.navigation}>
        <button
          className={`${styles.navItem} ${
            currentView === "home" ? styles.active : ""
          }`}
          onClick={() => handleNavigation("home")}
        >
          <Home size={18} />
          Home
        </button>
        <button
          className={`${styles.navItem} ${
            isAIChatVisible ? styles.active : ""
          }`}
          onClick={onToggleAIChat}
        >
          <Bot size={18} />
          AI Assistant
        </button>
      </div>

      <div className={styles.papersList}>
        {state.openPapers.length > 0 && (
          <>
            <h3 className={styles.sectionTitle}>
              Open Papers ({state.openPapers.length})
            </h3>
            {state.openPapers.map((paper) => (
              <div
                key={`open-${paper.id}`}
                className={styles.paperItem}
                onClick={() => handlePaperSelect(paper)}
              >
                <div className={styles.paperInfo}>
                  <div className={styles.paperTitle}>{paper.title}</div>
                  <div className={styles.paperSource}>{paper.source}</div>
                </div>
                <button
                  className={styles.closeButton}
                  onClick={(e) => handleClosePaper(paper.id, e)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </>
        )}

        {state.starredPapers.length > 0 && (
          <>
            <h3 className={styles.sectionTitle}>
              Starred ({state.starredPapers.length})
            </h3>
            {state.starredPapers.map((paper) => (
              <div
                key={`starred-${paper.id}`}
                className={styles.paperItem}
                onClick={() => handlePaperSelect(paper)}
              >
                <div className={styles.paperInfo}>
                  <div className={styles.paperTitle}>{paper.title}</div>
                  <div className={styles.paperSource}>{paper.source}</div>
                </div>
                <button
                  className={styles.closeButton}
                  onClick={(e) => handleToggleStar(paper, e)}
                >
                  <Star size={14} fill="#f39c12" />
                </button>
              </div>
            ))}
          </>
        )}

        {state.openPapers.length === 0 && state.starredPapers.length === 0 && (
          <div className={styles.emptyState}>
            No papers yet. Search and open papers to see them here.
          </div>
        )}
      </div>

      <div className={styles.userSection}>
        <div className={styles.userInfo}>
          <div className={styles.userDetails}>
            <User size={16} />
            <span className={styles.username}>
              {state.currentUser
                ? `${state.currentUser.username} (${state.currentUser.source})`
                : "Not logged in"}
            </span>
          </div>
          <button
            className={styles.authButton}
            onClick={
              state.currentUser ? handleLogout : () => setShowLoginModal(true)
            }
            title={state.currentUser ? "Logout" : "Login"}
          >
            {state.currentUser ? <LogOut size={16} /> : <LogIn size={16} />}
          </button>
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}

export default Sidebar;
