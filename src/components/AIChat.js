import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Settings, Loader2 } from "lucide-react";
import { AIService } from "../services/aiService";
import { usePapers } from "../context/PaperContext";
import styles from "./AIChat.module.css";

function AIChat({ isVisible, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [contextMode, setContextMode] = useState("none");
  const [serviceType, setServiceType] = useState("openai");
  const [endpoint, setEndpoint] = useState("https://api.openai.com/v1/chat/completions");
  const [model, setModel] = useState("gpt-3.5-turbo");
  const messagesEndRef = useRef(null);
  const { state } = usePapers();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    switch (contextMode) {
      case "current":
        return state.currentPaper ? [state.currentPaper] : [];
      case "open":
        return state.openPapers || [];
      case "starred":
        return state.starredPapers || [];
      default:
        return [];
    }
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

    try {
      const contextPapers = getContextPapers();
      const response = await AIService.chatWithPaperContext(userMessage, contextPapers);

      // Add AI response to chat
      const aiMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: "error",
        content: error.message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
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
    <div className={styles.aiChatContainer}>
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
          
          <div className={styles.settingGroup}>
            <label>Context Mode:</label>
            <select
              value={contextMode}
              onChange={(e) => setContextMode(e.target.value)}
              className={styles.contextSelect}
            >
              <option value="none">No Context</option>
              <option value="current">Current Paper</option>
              <option value="open">All Open Papers</option>
              <option value="starred">Starred Papers</option>
            </select>
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
              <li>Understanding research papers</li>
              <li>Suggesting related work</li>
              <li>Explaining concepts</li>
              <li>Finding research directions</li>
            </ul>
            <p>Configure your API key in settings to get started.</p>
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
              <div className={styles.messageText}>{message.content}</div>
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
        <div className={styles.contextIndicator}>
          {contextMode !== "none" && (
            <span className={styles.contextBadge}>
              Context: {contextMode} ({getContextPapers().length} papers)
            </span>
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