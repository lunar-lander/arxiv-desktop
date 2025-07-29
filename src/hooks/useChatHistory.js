import { useState, useEffect, useCallback } from "react";
import { SettingsService } from "../services/settingsService";

export function useChatHistory() {
  const [currentMessages, setCurrentMessages] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load chat sessions on mount
  useEffect(() => {
    const sessions = SettingsService.getChatSessions();
    setChatSessions(sessions);
  }, []);

  // Save current chat as a session
  const saveChatSession = useCallback(async (sessionName, context = {}) => {
    if (currentMessages.length === 0) {
      throw new Error("No messages to save");
    }

    setIsLoading(true);
    try {
      const newSession = SettingsService.saveChatSession(sessionName, currentMessages, context);
      if (newSession) {
        setChatSessions(prev => [newSession, ...prev]);
        return newSession;
      } else {
        throw new Error("Failed to save chat session");
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentMessages]);

  // Load a chat session
  const loadChatSession = useCallback((sessionId) => {
    const session = SettingsService.loadChatSession(sessionId);
    if (session) {
      setCurrentMessages(session.messages);
      return session;
    }
    return null;
  }, []);

  // Delete a chat session
  const deleteChatSession = useCallback((sessionId) => {
    const success = SettingsService.deleteChatSession(sessionId);
    if (success) {
      setChatSessions(prev => prev.filter(session => session.id !== sessionId));
    }
    return success;
  }, []);

  // Export a chat session
  const exportChatSession = useCallback((sessionId, format = 'json') => {
    return SettingsService.exportChatSession(sessionId, format);
  }, []);

  // Export all chat sessions
  const exportAllChatSessions = useCallback((format = 'json') => {
    return SettingsService.exportAllChatSessions(format);
  }, []);

  // Clear current chat
  const clearCurrentChat = useCallback(() => {
    setCurrentMessages([]);
  }, []);

  // Start a new chat session
  const startNewChat = useCallback(() => {
    setCurrentMessages([]);
    setCurrentSessionId(null);
    SettingsService.clearChatHistory();
  }, []);

  // Auto-save current messages to both temporary storage and session
  const saveCurrentMessages = useCallback((messages) => {
    setCurrentMessages(messages);
    SettingsService.saveChatHistory(messages);
    
    // Auto-save to session after 3 messages (user + AI + user)
    if (messages.length >= 3 && !currentSessionId) {
      const autoName = SettingsService.generateAutoSessionName(messages);
      const newSession = SettingsService.saveChatSession(autoName, messages);
      if (newSession) {
        setCurrentSessionId(newSession.id);
        setChatSessions(prev => [newSession, ...prev]);
      }
    } else if (currentSessionId && messages.length > 0) {
      // Update existing session
      const updatedSession = SettingsService.updateChatSession(currentSessionId, messages);
      if (updatedSession) {
        setChatSessions(prev => prev.map(session => 
          session.id === currentSessionId ? updatedSession : session
        ));
      }
    }
  }, [currentSessionId]);

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
      const link = document.createElement('a');
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
  const exportAndDownloadSession = useCallback((sessionId, format = 'json') => {
    const exportData = exportChatSession(sessionId, format);
    if (exportData) {
      return downloadFile(exportData.fileName, exportData.content, exportData.mimeType);
    }
    return false;
  }, [exportChatSession, downloadFile]);

  // Export and download all sessions
  const exportAndDownloadAllSessions = useCallback((format = 'json') => {
    const exportData = exportAllChatSessions(format);
    if (exportData) {
      return downloadFile(exportData.fileName, exportData.content, exportData.mimeType);
    }
    return false;
  }, [exportAllChatSessions, downloadFile]);

  // Get storage usage statistics
  const getStorageUsage = useCallback(() => {
    return SettingsService.getStorageUsage();
  }, []);

  return {
    // Current chat state
    currentMessages,
    setCurrentMessages: saveCurrentMessages,
    clearCurrentChat,
    startNewChat,
    loadTemporaryHistory,
    currentSessionId,
    
    // Chat sessions
    chatSessions,
    saveChatSession,
    loadChatSession,
    deleteChatSession,
    
    // Export functionality
    exportChatSession,
    exportAllChatSessions,
    exportAndDownloadSession,
    exportAndDownloadAllSessions,
    downloadFile,
    
    // Utility
    isLoading,
    getStorageUsage
  };
}