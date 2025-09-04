import { useState, useEffect, useCallback } from "react";
import { SettingsService } from "../services/settingsService";

export function useChatHistory() {
  const [currentMessages, setCurrentMessages] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Load chat sessions on mount
  useEffect(() => {
    const sessions = SettingsService.getChatSessions();
    setChatSessions(sessions);
  }, []);

  // Save current chat as a session
  const saveChatSession = useCallback(
    async (sessionName, context = {}) => {
      if (currentMessages.length === 0) {
        throw new Error("No messages to save");
      }

      setIsLoading(true);
      try {
        const newSession = SettingsService.saveChatSession(
          sessionName,
          currentMessages,
          context
        );
        if (newSession) {
          setChatSessions((prev) => [newSession, ...prev]);
          return newSession;
        } else {
          throw new Error("Failed to save chat session");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [currentMessages]
  );

  // Load a chat session with proper state synchronization
  const loadChatSession = useCallback((sessionId) => {
    try {
      const session = SettingsService.loadChatSession(sessionId);
      if (session && Array.isArray(session.messages)) {
        // Update all related state atomically
        setCurrentSessionId(sessionId);
        setCurrentMessages(session.messages);
        setIsAutoSaving(false);

        // Update temporary storage with loaded messages
        SettingsService.saveChatHistory(session.messages);

        return session;
      }
    } catch (error) {
      console.error("Error loading chat session:", error);
    }
    return null;
  }, []);

  // Delete a chat session
  const deleteChatSession = useCallback((sessionId) => {
    const success = SettingsService.deleteChatSession(sessionId);
    if (success) {
      setChatSessions((prev) =>
        prev.filter((session) => session.id !== sessionId)
      );
    }
    return success;
  }, []);

  // Export a chat session
  const exportChatSession = useCallback((sessionId, format = "json") => {
    return SettingsService.exportChatSession(sessionId, format);
  }, []);

  // Export all chat sessions
  const exportAllChatSessions = useCallback((format = "json") => {
    return SettingsService.exportAllChatSessions(format);
  }, []);

  // Clear current chat
  const clearCurrentChat = useCallback(() => {
    setCurrentMessages([]);
  }, []);

  // Start a new chat session with proper cleanup
  const startNewChat = useCallback(() => {
    // Clear current state
    setCurrentMessages([]);
    setCurrentSessionId(null); // Let it be set when first message is sent
    setIsAutoSaving(false);

    // Clear temporary storage
    SettingsService.clearChatHistory();
  }, []);

  // Auto-save current messages with proper state synchronization
  const saveCurrentMessages = useCallback(
    async (messages) => {
      try {
        // Update UI state immediately to avoid race conditions
        setCurrentMessages(messages);

        // Save to temporary storage immediately
        SettingsService.saveChatHistory(messages);

        // Auto-save to session only if we have meaningful content
        if (messages.length >= 2 && !isAutoSaving) {
          // At least user + AI message
          setIsAutoSaving(true);

          const autoName = SettingsService.generateAutoSessionName(messages);
          const sessionIdToUse = currentSessionId || `session_${Date.now()}`;

          // Ensure we have a session ID set
          if (!currentSessionId) {
            setCurrentSessionId(sessionIdToUse);
          }

          const session = SettingsService.saveChatSession(
            autoName,
            messages,
            {},
            sessionIdToUse
          );

          if (session) {
            // Update local state with proper synchronization
            setChatSessions((prevSessions) => {
              const existingIndex = prevSessions.findIndex(
                (s) => s.id === session.id
              );

              if (existingIndex !== -1) {
                // Update existing session
                const updatedSessions = [...prevSessions];
                updatedSessions[existingIndex] = session;
                // Re-sort by lastUpdated
                return updatedSessions.sort(
                  (a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0)
                );
              } else {
                // Add new session at the beginning
                return [session, ...prevSessions];
              }
            });
          } else {
            console.warn("Failed to save session, reloading from storage");
            // Fallback: reload sessions from storage
            const sessions = SettingsService.getChatSessions();
            setChatSessions(sessions);
          }

          setIsAutoSaving(false);
        }
      } catch (error) {
        console.error("Error in saveCurrentMessages:", error);
        setIsAutoSaving(false);
        // Fallback: reload from storage
        const sessions = SettingsService.getChatSessions();
        setChatSessions(sessions);
      }
    },
    [currentSessionId, isAutoSaving, chatSessions]
  );

  // Load temporary chat history
  const loadTemporaryHistory = useCallback(() => {
    const history = SettingsService.getChatHistory();
    setCurrentMessages(history);
    return history;
  }, []);

  // Download file helper
  const downloadFile = useCallback((fileName, content, mimeType) => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error("Error downloading file:", error);
      return false;
    }
  }, []);

  // Export and download a session
  const exportAndDownloadSession = useCallback(
    (sessionId, format = "json") => {
      const exportData = exportChatSession(sessionId, format);
      if (exportData) {
        return downloadFile(
          exportData.fileName,
          exportData.content,
          exportData.mimeType
        );
      }
      return false;
    },
    [exportChatSession, downloadFile]
  );

  // Export and download all sessions
  const exportAndDownloadAllSessions = useCallback(
    (format = "json") => {
      const exportData = exportAllChatSessions(format);
      if (exportData) {
        return downloadFile(
          exportData.fileName,
          exportData.content,
          exportData.mimeType
        );
      }
      return false;
    },
    [exportAllChatSessions, downloadFile]
  );

  // Get storage usage statistics
  const getStorageUsage = useCallback(() => {
    return SettingsService.getStorageUsage();
  }, []);

  // Refresh chat sessions from storage with error handling
  const refreshChatSessions = useCallback(() => {
    try {
      const sessions = SettingsService.getChatSessions();
      setChatSessions(sessions);
    } catch (error) {
      console.error("Error refreshing chat sessions:", error);
      setChatSessions([]);
    }
  }, []);

  return {
    // Current chat state
    currentMessages,
    setCurrentMessages: saveCurrentMessages,
    clearCurrentChat,
    startNewChat,
    loadTemporaryHistory,
    currentSessionId,
    isAutoSaving,

    // Chat sessions
    chatSessions,
    saveChatSession,
    loadChatSession,
    deleteChatSession,
    refreshChatSessions,

    // Export functionality
    exportChatSession,
    exportAllChatSessions,
    exportAndDownloadSession,
    exportAndDownloadAllSessions,
    downloadFile,

    // Utility
    isLoading,
    getStorageUsage,
  };
}
