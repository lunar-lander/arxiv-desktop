import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Settings,
  Loader2,
  History,
  Save,
  Plus,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAIChat } from "../hooks/useAIChat";
import { useUISettings } from "../hooks/useUISettings";
import { useChatHistory } from "../hooks/useChatHistory";
import { usePDFContent } from "../hooks/usePDFContent";
import { usePapers } from "../context/PaperContext";
import ChatHistory from "./ChatHistory";
import styles from "./AIChat.module.css";

function AIChat({ isVisible, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPapers, setSelectedPapers] = useState(new Set());
  const [isResizing, setIsResizing] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [paperContextSet, setPaperContextSet] = useState(false);
  const [lastPaperSelection, setLastPaperSelection] = useState(new Set());
  const messagesEndRef = useRef(null);
  const resizeRef = useRef(null);
  const { state, dispatch } = usePapers();
  const { settings, updateSetting } = useUISettings();
  const {
    currentMessages,
    setCurrentMessages,
    loadTemporaryHistory,
    startNewChat,
    currentSessionId,
    saveChatSession,
  } = useChatHistory();
  const {
    extractPDFContent,
    getPDFContent,
    getExtractionStatus,
    isExtracting: isPDFExtracting,
    extractedContent,
  } = usePDFContent();
  const {
    apiKey,
    setApiKey,
    serviceType,
    setServiceType,
    endpoint,
    setEndpoint,
    model,
    setModel,
    handleServiceTypeChange,
    saveSettings,
    isLoading,
    chatWithPaperContextStream,
  } = useAIChat();

  const sidebarWidth = settings.chatSidebarWidth;
  const setSidebarWidth = (width) => updateSetting("chatSidebarWidth", width);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Start with blank chat on app startup
  // Note: Temporary history loading disabled to ensure fresh start
  // useEffect(() => {
  //   const tempHistory = loadTemporaryHistory();
  //   if (tempHistory.length > 0) {
  //     setMessages(tempHistory);
  //   }
  // }, [loadTemporaryHistory]);

  // Auto-save messages to temporary storage
  useEffect(() => {
    if (messages.length > 0) {
      setCurrentMessages(messages);
    }
  }, [messages, setCurrentMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset paper context when selection changes
  useEffect(() => {
    const currentSelection = new Set(selectedPapers);
    const hasChanged =
      currentSelection.size !== lastPaperSelection.size ||
      [...currentSelection].some((id) => !lastPaperSelection.has(id));

    if (hasChanged && messages.length > 0) {
      // Paper selection changed mid-conversation, reset context
      setPaperContextSet(false);
    }

    setLastPaperSelection(currentSelection);
  }, [selectedPapers, lastPaperSelection, messages.length]);

  // Resize functionality
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 300;
      const maxWidth = window.innerWidth * 0.8;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleSaveSettings = () => {
    saveSettings();
    setShowSettings(false);
  };

  const getContextPapers = () => {
    const allPapers = [
      ...(state.openPapers || []),
      ...(state.starredPapers || []),
    ];

    // Remove duplicates based on paper ID
    const uniquePapers = allPapers.filter(
      (paper, index, arr) => arr.findIndex((p) => p.id === paper.id) === index
    );

    return uniquePapers.filter((paper) => selectedPapers.has(paper.id));
  };

  // Extract PDF content for selected papers when they change
  useEffect(() => {
    const contextPapers = getContextPapers();
    if (contextPapers.length > 0) {
      contextPapers.forEach(async (paper) => {
        const paperId = paper.id || paper.arxivId;
        const status = getExtractionStatus(paperId);

        // Only extract if not already extracted or in progress
        if (status === "not_started") {
          console.log(`Starting PDF extraction for: ${paper.title}`);

          try {
            // Download PDF if localPath is missing
            if (!paper.localPath) {
              console.log(
                `No local PDF path, downloading PDF for: ${paper.title}`
              );
              const storageService = (
                await import("../services/storageService")
              ).default;
              const localPath = await storageService.downloadAndCachePdf(paper);

              if (localPath) {
                paper.localPath = localPath;
                console.log(`PDF downloaded successfully: ${localPath}`);

                // Update the paper in context state with the localPath
                await dispatch({
                  type: "UPDATE_PAPER_LOCAL_PATH",
                  payload: { paperId: paper.id, localPath },
                });
              } else {
                console.error(`Failed to download PDF for: ${paper.title}`);
                return;
              }
            }

            console.log(`PDF path: ${paper.localPath}`);
            await extractPDFContent(paper, { maxPages: 30 }); // Limit for LLM context
          } catch (error) {
            console.error(`Failed to extract PDF for ${paper.title}:`, error);
          }
        }
      });
    }
  }, [
    selectedPapers,
    state.openPapers,
    state.starredPapers,
    extractPDFContent,
    getExtractionStatus,
  ]);

  const getAllAvailablePapers = () => {
    const allPapers = [
      ...(state.openPapers || []),
      ...(state.starredPapers || []),
    ];

    // Remove duplicates based on paper ID
    return allPapers.filter(
      (paper, index, arr) => arr.findIndex((p) => p.id === paper.id) === index
    );
  };

  const togglePaperSelection = (paperId) => {
    setSelectedPapers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(paperId)) {
        newSet.delete(paperId);
      } else {
        newSet.add(paperId);
      }
      return newSet;
    });
  };

  const selectAllPapers = () => {
    const allPapers = getAllAvailablePapers();
    setSelectedPapers(new Set(allPapers.map((p) => p.id)));
  };

  const deselectAllPapers = () => {
    setSelectedPapers(new Set());
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");

    // Add user message to chat
    const newUserMessage = {
      id: Date.now(),
      type: "user",
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);

    // Add placeholder AI message for streaming
    const aiMessageId = Date.now() + 1;
    const aiMessage = {
      id: aiMessageId,
      type: "ai",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, aiMessage]);

    try {
      const contextPapers = getContextPapers();

      // Only prepare PDF content if context hasn't been set or papers changed
      const pdfContentMap = new Map();
      let shouldIncludePaperContext = false;

      if (!paperContextSet || messages.length === 0) {
        // First message or context needs to be established
        contextPapers.forEach((paper) => {
          const paperId = paper.id || paper.arxivId;
          const pdfContent = getPDFContent(paperId);
          if (pdfContent) {
            pdfContentMap.set(paperId, pdfContent);
          }
        });
        shouldIncludePaperContext = true;
        setPaperContextSet(true);
      }

      let streamedContent = "";

      await chatWithPaperContextStream(
        userMessage,
        shouldIncludePaperContext ? contextPapers : [],
        shouldIncludePaperContext ? pdfContentMap : new Map(),
        messages, // Pass conversation history
        (chunk, fullContent) => {
          streamedContent = fullContent;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: streamedContent, isStreaming: true }
                : msg
            )
          );
        }
      );

      // Mark streaming as complete
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
        )
      );
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 2,
        type: "error",
        content: error.message,
        timestamp: new Date(),
      };
      // Remove the streaming message and add error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== aiMessageId).concat(errorMessage)
      );
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.aiChatContainer} style={{ width: sidebarWidth }}>
      <div
        className={styles.resizeHandle}
        onMouseDown={handleResizeStart}
        ref={resizeRef}
      />
      <div className={styles.aiChatHeader}>
        <div className={styles.headerLeft}>
          <Bot className={styles.botIcon} />
          <h3>AI Research Assistant</h3>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.newChatButton}
            onClick={() => {
              if (
                messages.length > 0 &&
                window.confirm(
                  "Start a new chat? Current conversation will be saved automatically."
                )
              ) {
                startNewChat();
                setMessages([]);
                setPaperContextSet(false); // Reset paper context for new chat
                setLastPaperSelection(new Set());
              } else if (messages.length === 0) {
                startNewChat();
                setPaperContextSet(false); // Reset paper context for new chat
                setLastPaperSelection(new Set());
              }
            }}
            title="New Chat"
          >
            <Plus size={18} />
          </button>
          <button
            className={styles.historyButton}
            onClick={() => setShowChatHistory(true)}
            title="Chat History"
          >
            <History size={18} />
          </button>
          <button
            className={styles.settingsButton}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={18} />
          </button>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
      </div>

      {showSettings && (
        <div className={styles.settingsPanel}>
          <div className={styles.settingGroup}>
            <label>AI Service:</label>
            <select
              value={serviceType}
              onChange={(e) => handleServiceTypeChange(e.target.value)}
              className={styles.serviceSelect}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="ollama">Ollama (Local)</option>
              <option value="custom">Custom OpenAI-Compatible</option>
            </select>
          </div>

          <div className={styles.settingGroup}>
            <label>API Endpoint:</label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="API endpoint URL"
              className={styles.endpointInput}
            />
          </div>

          <div className={styles.settingGroup}>
            <label>Model:</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Model name"
              className={styles.endpointInput}
            />
          </div>

          <div className={styles.settingGroup}>
            <label>API Key:</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                serviceType === "ollama"
                  ? "Not required for Ollama"
                  : "Enter your API key"
              }
              className={styles.apiKeyInput}
              disabled={serviceType === "ollama"}
            />
          </div>

          <button onClick={handleSaveSettings} className={styles.saveButton}>
            Save Settings
          </button>
        </div>
      )}

      <div className={styles.messagesContainer}>
        {messages.length === 0 && (
          <div className={styles.welcomeMessage}>
            <Bot className={styles.welcomeIcon} />
            <p>Welcome! I can help you with:</p>
            <ul>
              <li>Analyzing paper abstracts and metadata</li>
              <li>Suggesting related research and papers</li>
              <li>Explaining concepts and methodologies</li>
              <li>Finding research directions</li>
              <li>Comparing approaches between papers</li>
            </ul>
            <p>
              <strong>Enhanced with PDF Content:</strong> I can analyze full PDF
              content automatically when you select papers. Look for 📄✓
              indicators showing successful PDF text extraction for deep
              analysis of methodologies, results, and technical details.
            </p>
            <p>
              Select papers above and configure your API key in settings to get
              started.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`${styles.message} ${styles[message.type]}`}
          >
            <div className={styles.messageIcon}>
              {message.type === "user" ? (
                <User size={16} />
              ) : message.type === "ai" ? (
                <Bot size={16} />
              ) : (
                "⚠️"
              )}
            </div>
            <div className={styles.messageContent}>
              <div className={styles.messageText}>
                {message.type === "ai" ? (
                  <div className={styles.markdown}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Improve paragraph spacing
                        p: ({ node, ...props }) => (
                          <p style={{ marginBottom: "0.6em" }} {...props} />
                        ),
                        // Make lists more readable
                        li: ({ node, ...props }) => (
                          <li style={{ marginBottom: "0.1em" }} {...props} />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                    {message.isStreaming && (
                      <span className={styles.streamingCursor}>▌</span>
                    )}
                  </div>
                ) : (
                  message.content
                )}
              </div>
              <div className={styles.messageTime}>
                {message.timestamp.toLocaleTimeString &&
                  message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputContainer}>
        <div className={styles.paperSelection}>
          <div className={styles.paperSelectionHeader}>
            <span className={styles.paperSelectionTitle}>
              Context Papers ({getContextPapers().length} selected)
              {paperContextSet && messages.length > 0 && (
                <span className={styles.contextStatus}> - Context Set ✓</span>
              )}
            </span>
            <div className={styles.paperSelectionControls}>
              <button
                onClick={selectAllPapers}
                className={styles.selectAllButton}
                disabled={getAllAvailablePapers().length === 0}
              >
                All
              </button>
              <button
                onClick={deselectAllPapers}
                className={styles.selectAllButton}
                disabled={selectedPapers.size === 0}
              >
                None
              </button>
            </div>
          </div>

          {getAllAvailablePapers().length > 0 && (
            <div className={styles.paperTags}>
              {getAllAvailablePapers().map((paper) => (
                <button
                  key={paper.id}
                  onClick={() => togglePaperSelection(paper.id)}
                  className={`${styles.paperTag} ${
                    selectedPapers.has(paper.id) ? styles.paperTagSelected : ""
                  }`}
                  title={paper.title}
                >
                  <span className={styles.paperTagText}>
                    {paper.title.length > 40
                      ? `${paper.title.substring(0, 40)}...`
                      : paper.title}
                  </span>
                  <span className={styles.paperTagSource}>
                    {paper.source || "arXiv"}
                    {(() => {
                      const paperId = paper.id || paper.arxivId;
                      const status = getExtractionStatus(paperId);
                      if (status === "extracting") return " 📄...";
                      if (status === "completed") return " 📄✓";
                      if (status === "error") return " 📄✗";
                      return "";
                    })()}
                  </span>
                </button>
              ))}
            </div>
          )}

          {getAllAvailablePapers().length === 0 && (
            <div className={styles.noPapersMessage}>
              No papers available. Open or star some papers to use them as
              context.
            </div>
          )}
        </div>
        <div className={styles.inputRow}>
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about papers, research topics, or get suggestions..."
            className={styles.messageInput}
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className={styles.sendButton}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      <ChatHistory
        isVisible={showChatHistory}
        onClose={() => setShowChatHistory(false)}
        onLoadSession={(session) => {
          setMessages(session.messages);
          setPaperContextSet(false); // Reset context when loading old session
          setLastPaperSelection(new Set());
          setShowChatHistory(false);
        }}
        currentMessages={messages}
      />
    </div>
  );
}

export default AIChat;
