import { useState, useEffect } from "react";
import { AIService } from "../services/aiService";

export function useAIChat() {
  const [apiKey, setApiKey] = useState("");
  const [serviceType, setServiceType] = useState("openai");
  const [endpoint, setEndpoint] = useState("https://api.openai.com/v1/chat/completions");
  const [model, setModel] = useState("gpt-3.5-turbo");
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
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
    localStorage.setItem("ai_api_key", apiKey);
    localStorage.setItem("ai_service_type", serviceType);
    localStorage.setItem("ai_endpoint", endpoint);
    localStorage.setItem("ai_model", model);
    
    AIService.setApiKey(apiKey);
    AIService.setServiceType(serviceType);
    AIService.setEndpoint(endpoint);
    AIService.setModel(model);
  };

  const sendStreamingMessage = async (message, context = null, onChunk = null) => {
    setIsLoading(true);
    try {
      const response = await AIService.sendMessageStream(message, context, onChunk);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendStreamingPaperSuggestion = async (query, preferences = {}, onChunk = null) => {
    setIsLoading(true);
    try {
      const response = await AIService.suggestPapersStream(query, preferences, onChunk);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const chatWithPaperContextStream = async (message, papers = [], pdfContentMap = null, onChunk = null) => {
    setIsLoading(true);
    try {
      const response = await AIService.chatWithPaperContextStream(message, papers, pdfContentMap, onChunk);
      return response;
    } catch (error) {
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
    sendStreamingPaperSuggestion,
    chatWithPaperContextStream,
  };
}