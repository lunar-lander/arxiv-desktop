export class SettingsService {
  static UI_SETTINGS_KEY = "arxiv_ui_settings";
  static CHAT_HISTORY_KEY = "arxiv_chat_history";
  static CHAT_SESSIONS_KEY = "arxiv_chat_sessions";

  // UI Settings Management
  static getUISettings() {
    try {
      const settings = localStorage.getItem(this.UI_SETTINGS_KEY);
      return settings ? JSON.parse(settings) : this.getDefaultUISettings();
    } catch (error) {
      console.error("Error loading UI settings:", error);
      return this.getDefaultUISettings();
    }
  }

  static getDefaultUISettings() {
    return {
      chatSidebarWidth: 400,
      leftSidebarHidden: false,
      chatVisible: false,
      lastSavedAt: new Date().toISOString(),
    };
  }

  static saveUISettings(settings) {
    try {
      const currentSettings = this.getUISettings();
      const newSettings = {
        ...currentSettings,
        ...settings,
        lastSavedAt: new Date().toISOString(),
      };
      localStorage.setItem(this.UI_SETTINGS_KEY, JSON.stringify(newSettings));
      return newSettings;
    } catch (error) {
      console.error("Error saving UI settings:", error);
      return settings;
    }
  }

  static updateUISetting(key, value) {
    const settings = this.getUISettings();
    settings[key] = value;
    return this.saveUISettings(settings);
  }

  // Chat History Management
  static getChatHistory() {
    try {
      const history = localStorage.getItem(this.CHAT_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error("Error loading chat history:", error);
      return [];
    }
  }

  static saveChatHistory(messages) {
    try {
      // Validate and deduplicate messages
      if (!Array.isArray(messages)) {
        console.error("Messages must be an array");
        return false;
      }

      const deduplicatedMessages = this.deduplicateMessages(messages);
      localStorage.setItem(
        this.CHAT_HISTORY_KEY,
        JSON.stringify(deduplicatedMessages)
      );
      return true;
    } catch (error) {
      console.error("Error saving chat history:", error);
      return false;
    }
  }

  static clearChatHistory() {
    try {
      localStorage.removeItem(this.CHAT_HISTORY_KEY);
      return true;
    } catch (error) {
      console.error("Error clearing chat history:", error);
      return false;
    }
  }

  // Chat Sessions Management
  static getChatSessions() {
    try {
      const sessions = localStorage.getItem(this.CHAT_SESSIONS_KEY);
      const parsedSessions = sessions ? JSON.parse(sessions) : [];

      // Validate and sanitize sessions
      const validSessions = parsedSessions.filter((session) => {
        return session.id && Array.isArray(session.messages);
      });

      // Sort by lastUpdated timestamp (newest first)
      validSessions.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));

      return validSessions;
    } catch (error) {
      console.error("Error loading chat sessions:", error);
      // Return empty array and clear corrupted data
      localStorage.removeItem(this.CHAT_SESSIONS_KEY);
      return [];
    }
  }

  static sessionExists(sessionId) {
    const sessions = this.getChatSessions();
    return sessions.some((session) => session.id === sessionId);
  }

  static saveChatSession(
    sessionName,
    messages,
    context = {},
    sessionId = null
  ) {
    try {
      // Validate messages input
      if (!Array.isArray(messages)) {
        console.error("Messages must be an array");
        return null;
      }

      // Deduplicate messages to prevent corruption
      const deduplicatedMessages = this.deduplicateMessages(messages);

      const sessions = this.getChatSessions();
      const newSessionId = sessionId || `session_${Date.now()}`;
      const timestamp = Date.now();

      const sessionIndex = sessions.findIndex(
        (session) => session.id === newSessionId
      );

      if (sessionIndex !== -1) {
        // Update existing session - preserve original createdAt
        const existingSession = sessions[sessionIndex];
        sessions[sessionIndex] = {
          ...existingSession,
          name: sessionName || existingSession.name,
          messages: deduplicatedMessages,
          context: context,
          updatedAt: new Date(timestamp).toISOString(),
          lastUpdated: timestamp,
          messageCount: deduplicatedMessages.length,
        };
      } else {
        // Create new session
        const newSession = {
          id: newSessionId,
          name:
            sessionName || this.generateAutoSessionName(deduplicatedMessages),
          messages: deduplicatedMessages,
          context: context,
          createdAt: new Date(timestamp).toISOString(),
          updatedAt: new Date(timestamp).toISOString(),
          lastUpdated: timestamp,
          messageCount: deduplicatedMessages.length,
        };
        sessions.unshift(newSession); // Add newest first
      }

      // Sort sessions by lastUpdated timestamp (newest first)
      sessions.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));

      // Keep only last 50 sessions to prevent storage bloat
      if (sessions.length > 50) {
        sessions.splice(50);
      }

      // Atomic save operation
      localStorage.setItem(this.CHAT_SESSIONS_KEY, JSON.stringify(sessions));

      // Verify the save was successful
      const savedSessions = this.getChatSessions();
      const savedSession = savedSessions.find((s) => s.id === newSessionId);

      if (!savedSession) {
        console.error("Failed to verify session save");
        return null;
      }

      return savedSession;
    } catch (error) {
      console.error("Error saving chat session:", error);
      return null;
    }
  }

  static deduplicateMessages(messages) {
    if (!Array.isArray(messages)) return [];

    const seen = new Set();
    return messages.filter((msg) => {
      if (!msg.id) {
        // Generate ID for messages without one
        msg.id = `${msg.type}_${msg.timestamp || Date.now()}_${Math.random()}`;
      }

      if (seen.has(msg.id)) {
        console.warn(`Duplicate message ${msg.id} detected, skipping`);
        return false;
      }

      seen.add(msg.id);
      return true;
    });
  }

  static generateAutoSessionName(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return "New Chat";

    // Use the first user message as session name (truncated)
    const firstUserMessage = messages.find((msg) => msg.type === "user");
    if (firstUserMessage && firstUserMessage.content) {
      const name = firstUserMessage.content.trim();
      return name.length > 50 ? `${name.substring(0, 50)}...` : name;
    }

    return `Chat ${new Date().toLocaleDateString()}`;
  }

  static loadChatSession(sessionId) {
    try {
      const sessions = this.getChatSessions();
      return sessions.find((session) => session.id === sessionId) || null;
    } catch (error) {
      console.error("Error loading chat session:", error);
      return null;
    }
  }

  static deleteChatSession(sessionId) {
    try {
      const sessions = this.getChatSessions();
      const filteredSessions = sessions.filter(
        (session) => session.id !== sessionId
      );
      localStorage.setItem(
        this.CHAT_SESSIONS_KEY,
        JSON.stringify(filteredSessions)
      );
      return true;
    } catch (error) {
      console.error("Error deleting chat session:", error);
      return false;
    }
  }

  static exportChatSession(sessionId, format = "json") {
    try {
      const session = this.loadChatSession(sessionId);
      if (!session) return null;

      const fileName = `${session.name.replace(/[^a-z0-9]/gi, "_")}_${sessionId}`;

      switch (format.toLowerCase()) {
        case "json":
          return {
            fileName: `${fileName}.json`,
            content: JSON.stringify(session, null, 2),
            mimeType: "application/json",
          };

        case "txt":
          const textContent = this.formatSessionAsText(session);
          return {
            fileName: `${fileName}.txt`,
            content: textContent,
            mimeType: "text/plain",
          };

        case "md":
          const markdownContent = this.formatSessionAsMarkdown(session);
          return {
            fileName: `${fileName}.md`,
            content: markdownContent,
            mimeType: "text/markdown",
          };

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error("Error exporting chat session:", error);
      return null;
    }
  }

  static formatSessionAsText(session) {
    let content = `Chat Session: ${session.name}\n`;
    content += `Created: ${new Date(session.createdAt).toLocaleString()}\n`;
    content += `Messages: ${session.messageCount}\n`;
    content += `${"=".repeat(50)}\n\n`;

    session.messages.forEach((message, index) => {
      const timestamp = new Date(message.timestamp).toLocaleString();
      const speaker =
        message.type === "user"
          ? "User"
          : message.type === "ai"
            ? "AI Assistant"
            : "System";

      content += `[${timestamp}] ${speaker}:\n`;
      content += `${message.content}\n\n`;
    });

    return content;
  }

  static formatSessionAsMarkdown(session) {
    let content = `# ${session.name}\n\n`;
    content += `**Created:** ${new Date(session.createdAt).toLocaleString()}  \n`;
    content += `**Messages:** ${session.messageCount}  \n\n`;
    content += `---\n\n`;

    session.messages.forEach((message, index) => {
      const timestamp = new Date(message.timestamp).toLocaleString();
      const speaker =
        message.type === "user"
          ? "👤 **User**"
          : message.type === "ai"
            ? "🤖 **AI Assistant**"
            : "⚠️ **System**";

      content += `## ${speaker}\n`;
      content += `*${timestamp}*\n\n`;
      content += `${message.content}\n\n`;
      content += `---\n\n`;
    });

    return content;
  }

  static exportAllChatSessions(format = "json") {
    try {
      const sessions = this.getChatSessions();
      const timestamp = new Date().toISOString().slice(0, 10);

      switch (format.toLowerCase()) {
        case "json":
          return {
            fileName: `arxiv_chat_sessions_${timestamp}.json`,
            content: JSON.stringify(sessions, null, 2),
            mimeType: "application/json",
          };

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error("Error exporting all chat sessions:", error);
      return null;
    }
  }

  static getStorageUsage() {
    try {
      const uiSettings = localStorage.getItem(this.UI_SETTINGS_KEY) || "";
      const chatHistory = localStorage.getItem(this.CHAT_HISTORY_KEY) || "";
      const chatSessions = localStorage.getItem(this.CHAT_SESSIONS_KEY) || "";

      return {
        uiSettings: new Blob([uiSettings]).size,
        chatHistory: new Blob([chatHistory]).size,
        chatSessions: new Blob([chatSessions]).size,
        total: new Blob([uiSettings + chatHistory + chatSessions]).size,
      };
    } catch (error) {
      console.error("Error calculating storage usage:", error);
      return { uiSettings: 0, chatHistory: 0, chatSessions: 0, total: 0 };
    }
  }

  static clearAllData() {
    try {
      localStorage.removeItem(this.UI_SETTINGS_KEY);
      localStorage.removeItem(this.CHAT_HISTORY_KEY);
      localStorage.removeItem(this.CHAT_SESSIONS_KEY);
      return true;
    } catch (error) {
      console.error("Error clearing all data:", error);
      return false;
    }
  }
}
