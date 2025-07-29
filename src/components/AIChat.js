import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Settings, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIService } from "../services/aiService";
import { usePapers } from "../context/PaperContext";
import styles from "./AIChat.module.css";

function AIChat({ isVisible, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPapers, setSelectedPapers] = useState(new Set());
  const [serviceType, setServiceType] = useState("openai");
  const [endpoint, setEndpoint] = useState("https://api.openai.com/v1/chat/completions");
  const [model, setModel] = useState("gpt-3.5-turbo");
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef(null);
  const resizeRef = useRef(null);
  const { state } = usePapers();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    // Load settings from localStorage
    const savedApiKey = localStorage.getItem("ai_api_key");
    const savedServiceType = localStorage.getItem("ai_service_type");
    const savedEndpoint = localStorage.getItem("ai_endpoint");
    const savedModel = localStorage.getItem("ai_model");
    
    if (savedApiKey) {
      setApiKey(savedApiKey);
      AIService.setApiKey(savedApiKey);
    }
    if (savedServiceType) {
      setServiceType(savedServiceType);
      AIService.setServiceType(savedServiceType);
    }
    if (savedEndpoint) {
      setEndpoint(savedEndpoint);
      AIService.setEndpoint(savedEndpoint);
    }
    if (savedModel) {
      setModel(savedModel);
      AIService.setModel(savedModel);
    }
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem("ai_api_key", apiKey);
    localStorage.setItem("ai_service_type", serviceType);
    localStorage.setItem("ai_endpoint", endpoint);
    localStorage.setItem("ai_model", model);
    
    AIService.setApiKey(apiKey);
    AIService.setServiceType(serviceType);
    AIService.setEndpoint(endpoint);
    AIService.setModel(model);
    
    setShowSettings(false);
  };

  const handleServiceTypeChange = (newServiceType) => {
    setServiceType(newServiceType);
    
    // Set default endpoints and models based on service type
    if (newServiceType === "openai") {
      setEndpoint("https://api.openai.com/v1/chat/completions");
      setModel("gpt-3.5-turbo");
    } else if (newServiceType === "anthropic") {
      setEndpoint("https://api.anthropic.com/v1/messages");
      setModel("claude-3-sonnet-20240229");
    } else if (newServiceType === "ollama") {
      setEndpoint("http://localhost:11434/v1/chat/completions");
      setModel("llama2");
    }
  };

  const getContextPapers = () => {
    const allPapers = [
      ...(state.openPapers || []),
      ...(state.starredPapers || [])
    ];
    
    // Remove duplicates based on paper ID
    const uniquePapers = allPapers.filter((paper, index, arr) => 
      arr.findIndex(p => p.id === paper.id) === index
    );
    
    return uniquePapers.filter(paper => selectedPapers.has(paper.id));
  };

  const getAllAvailablePapers = () => {
    const allPapers = [
      ...(state.openPapers || []),
      ...(state.starredPapers || [])
    ];
    
    // Remove duplicates based on paper ID
    return allPapers.filter((paper, index, arr) => 
      arr.findIndex(p => p.id === paper.id) === index
    );
  };

  const togglePaperSelection = (paperId) => {
    setSelectedPapers(prev => {
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
    setSelectedPapers(new Set(allPapers.map(p => p.id)));
  };

  const deselectAllPapers = () => {
    setSelectedPapers(new Set());
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);

    // Add user message to chat
    const newUserMessage = {
      id: Date.now(),
      type: "user",
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);

    // Add initial AI message that will be updated with streaming content
    const aiMessageId = Date.now() + 1;
    const aiMessage = {
      id: aiMessageId,
      type: "ai",
      content: "",
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => [...prev, aiMessage]);

    try {
      const contextPapers = getContextPapers();
      
      await AIService.chatWithPaperContext(
        userMessage, 
        contextPapers,
        (chunk, fullContent) => {
          // Update the AI message with streaming content
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: fullContent }
              : msg
          ));
        }
      );

      // Mark streaming as complete
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, isStreaming: false }
          : msg
      ));
    } catch (error) {
      // Replace the streaming message with error
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? {
              ...msg,
              type: "error",
              content: error.message,
              isStreaming: false
            }
          : msg
      ));
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className={styles.aiChatContainer}
      style={{ width: sidebarWidth }}
    >
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
              placeholder={serviceType === "ollama" ? "Not required for Ollama" : "Enter your API key"}
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
            <p><strong>Note:</strong> I work with paper abstracts and metadata. For detailed content analysis, copy and paste specific text from the PDF viewer.</p>
            <p>Select papers above and configure your API key in settings to get started.</p>
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
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    className={styles.markdown}
                  >
                    {message.content || (message.isStreaming ? "..." : "")}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
                {message.isStreaming && (
                  <span className={styles.streamingIndicator}>▊</span>
                )}
              </div>
              <div className={styles.messageTime}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className={`${styles.message} ${styles.ai}`}>
            <div className={styles.messageIcon}>
              <Loader2 className={styles.spinning} size={16} />
            </div>
            <div className={styles.messageContent}>
              <div className={styles.messageText}>Thinking...</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputContainer}>
        <div className={styles.paperSelection}>
          <div className={styles.paperSelectionHeader}>
            <span className={styles.paperSelectionTitle}>
              Context Papers ({getContextPapers().length} selected)
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
                      : paper.title
                    }
                  </span>
                  <span className={styles.paperTagSource}>
                    {paper.source || 'arXiv'}
                  </span>
                </button>
              ))}
            </div>
          )}
          
          {getAllAvailablePapers().length === 0 && (
            <div className={styles.noPapersMessage}>
              No papers available. Open or star some papers to use them as context.
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
    </div>
  );
}

export default AIChat;