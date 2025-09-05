import { useState, useEffect } from "react";
import { AIService } from "../services/aiService";

export function useAIChat() {
  const [apiKey, setApiKey] = useState("");
  const [serviceType, setServiceType] = useState("openai");
  const [endpoint, setEndpoint] = useState(
    "https://api.openai.com/v1/chat/completions"
  );
  const [model, setModel] = useState("gpt-3.5-turbo");
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem("ai_api_key");
    const savedServiceType = localStorage.getItem("ai_service_type");
    const savedEndpoint = localStorage.getItem("ai_endpoint");
    const savedModel = localStorage.getItem("ai_model");

    if (savedApiKey && savedApiKey.trim()) {
      setApiKey(savedApiKey);
      AIService.setApiKey(savedApiKey);
    }
    if (savedServiceType && savedServiceType.trim()) {
      setServiceType(savedServiceType);
      AIService.setServiceType(savedServiceType);
    }
    if (savedEndpoint && savedEndpoint.trim()) {
      setEndpoint(savedEndpoint);
      AIService.setEndpoint(savedEndpoint);
    }
    if (savedModel && savedModel.trim()) {
      setModel(savedModel);
      AIService.setModel(savedModel);
    }
  }, []);

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

  const saveSettings = () => {
    try {
      localStorage.setItem("ai_api_key", apiKey || "");
      localStorage.setItem("ai_service_type", serviceType || "openai");
      localStorage.setItem(
        "ai_endpoint",
        endpoint || "https://api.openai.com/v1/chat/completions"
      );
      localStorage.setItem("ai_model", model || "gpt-3.5-turbo");

      // Only set API key if it's not empty
      if (apiKey && apiKey.trim()) {
        AIService.setApiKey(apiKey);
      } else {
        AIService.clearApiKey();
      }
      AIService.setServiceType(serviceType);
      AIService.setEndpoint(endpoint);
      AIService.setModel(model);

      console.log("AI settings saved successfully");
    } catch (error) {
      console.error("Failed to save AI settings:", error);
      throw new Error("Failed to save settings. Please try again.");
    }
  };

  const sendStreamingMessage = async (
    message,
    context = null,
    onChunk = null
  ) => {
    if (isLoading) {
      throw new Error("Another message is already being processed");
    }

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      throw new Error("Message cannot be empty");
    }

    if (message.length > 50000) {
      throw new Error(
        "Message is too long. Maximum 50,000 characters allowed."
      );
    }

    setIsLoading(true);
    try {
      const response = await AIService.sendMessageStream(
        message,
        context,
        [],
        onChunk
      );

      if (!response || typeof response !== "string") {
        throw new Error("Invalid response from AI service");
      }

      return response;
    } catch (error) {
      console.error("AI streaming message failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const chatWithPaperContextStream = async (
    message,
    papers = [],
    pdfContentMap = null,
    conversationHistory = [],
    onChunk = null
  ) => {
    if (isLoading) {
      throw new Error("Another message is already being processed");
    }

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      throw new Error("Message cannot be empty");
    }

    if (message.length > 50000) {
      throw new Error(
        "Message is too long. Maximum 50,000 characters allowed."
      );
    }

    if (!Array.isArray(papers)) {
      throw new Error("Papers must be an array");
    }

    if (!Array.isArray(conversationHistory)) {
      throw new Error("Conversation history must be an array");
    }

    setIsLoading(true);
    try {
      const response = await AIService.chatWithPaperContextStream(
        message,
        papers,
        pdfContentMap,
        conversationHistory,
        onChunk
      );

      if (!response || typeof response !== "string") {
        throw new Error("Invalid response from AI service");
      }

      return response;
    } catch (error) {
      console.error("AI chat with context failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // Settings
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

    // State
    isLoading,

    // Methods
    sendStreamingMessage,
    chatWithPaperContextStream,
  };
}
