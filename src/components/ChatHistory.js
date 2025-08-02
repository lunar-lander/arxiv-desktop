import React, { useState, useEffect } from "react";
import {
  History,
  Save,
  Trash2,
  Download,
  MessageSquare,
  Calendar,
  Search,
  X,
  FileText,
  FileJson,
  Hash,
} from "lucide-react";
import { useChatHistory } from "../hooks/useChatHistory";
import styles from "./ChatHistory.module.css";

function ChatHistory({ isVisible, onClose, onLoadSession, currentMessages }) {
  const {
    chatSessions,
    saveChatSession,
    deleteChatSession,
    exportAndDownloadSession,
    exportAndDownloadAllSessions,
    isLoading,
    getStorageUsage,
    refreshChatSessions,
  } = useChatHistory();

  useEffect(() => {
    if (isVisible) {
      refreshChatSessions();
    }
  }, [isVisible, refreshChatSessions]);

  const [searchTerm, setSearchTerm] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [selectedSessions, setSelectedSessions] = useState(new Set());

  const filteredSessions = chatSessions.filter(
    (session) =>
      session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.messages.some((msg) =>
        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const handleSaveCurrentChat = async () => {
    if (!sessionName.trim()) {
      alert("Please enter a session name");
      return;
    }

    try {
      await saveChatSession(sessionName.trim());
      setSessionName("");
      setSaveDialogOpen(false);
      alert("Chat session saved successfully!");
    } catch (error) {
      alert(`Error saving chat: ${error.message}`);
    }
  };

  const handleDeleteSession = (sessionId, sessionName) => {
    if (window.confirm(`Are you sure you want to delete "${sessionName}"?`)) {
      const success = deleteChatSession(sessionId);
      if (!success) {
        alert("Error deleting chat session");
      }
    }
  };

  const handleLoadSession = (session) => {
    if (onLoadSession) {
      onLoadSession(session);
    }
    onClose();
  };

  const toggleSessionSelection = (sessionId) => {
    setSelectedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const handleBulkExport = (format) => {
    if (selectedSessions.size === 0) {
      // Export all if none selected
      exportAndDownloadAllSessions(format);
    } else {
      // Export selected sessions
      selectedSessions.forEach((sessionId) => {
        exportAndDownloadSession(sessionId, format);
      });
    }
  };

  const storageUsage = getStorageUsage();
  const storageUsageMB = (storageUsage.total / 1024 / 1024).toFixed(2);

  if (!isVisible) return null;

  return (
    <div className={styles.chatHistoryOverlay}>
      <div className={styles.chatHistoryModal}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <History className={styles.headerIcon} />
            <h2>Chat History</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchSection}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.actions}>
            <div className={styles.exportButtons}>
              <button
                className={styles.exportButton}
                onClick={() => handleBulkExport("json")}
                title="Export as JSON"
              >
                <FileJson size={16} />
              </button>
              <button
                className={styles.exportButton}
                onClick={() => handleBulkExport("txt")}
                title="Export as Text"
              >
                <FileText size={16} />
              </button>
              <button
                className={styles.exportButton}
                onClick={() => handleBulkExport("md")}
                title="Export as Markdown"
              >
                <Hash size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.sessionsList}>
          {filteredSessions.length === 0 ? (
            <div className={styles.emptyState}>
              <MessageSquare className={styles.emptyIcon} />
              <p>No chat sessions found</p>
              {searchTerm && (
                <p className={styles.emptySubtext}>
                  Try adjusting your search terms
                </p>
              )}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div key={session.id} className={styles.sessionItem}>
                <div className={styles.sessionCheckbox}>
                  <input
                    type="checkbox"
                    checked={selectedSessions.has(session.id)}
                    onChange={() => toggleSessionSelection(session.id)}
                  />
                </div>

                <div
                  className={styles.sessionContent}
                  onClick={() => handleLoadSession(session)}
                >
                  <div className={styles.sessionHeader}>
                    <h3 className={styles.sessionName}>{session.name}</h3>
                    <div className={styles.sessionMeta}>
                      <Calendar size={12} />
                      <span>
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                      <MessageSquare size={12} />
                      <span>{session.messageCount} messages</span>
                    </div>
                  </div>
                </div>

                <div className={styles.sessionActions}>
                  <button
                    className={styles.actionButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      exportAndDownloadSession(session.id, "json");
                    }}
                    title="Export as JSON"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.id, session.name);
                    }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.storageInfo}>
            <span className={styles.storageText}>
              Storage used: {storageUsageMB} MB • {chatSessions.length} sessions
            </span>
          </div>

          {selectedSessions.size > 0 && (
            <div className={styles.selectionInfo}>
              <span>{selectedSessions.size} selected</span>
            </div>
          )}
        </div>

        {saveDialogOpen && (
          <div className={styles.saveDialog}>
            <div className={styles.saveDialogContent}>
              <h3>Save Current Chat</h3>
              <input
                type="text"
                placeholder="Enter session name..."
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className={styles.sessionNameInput}
                autoFocus
              />
              <div className={styles.saveDialogActions}>
                <button
                  className={styles.cancelButton}
                  onClick={() => {
                    setSaveDialogOpen(false);
                    setSessionName("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className={styles.confirmButton}
                  onClick={handleSaveCurrentChat}
                  disabled={!sessionName.trim() || isLoading}
                >
                  {isLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatHistory;
