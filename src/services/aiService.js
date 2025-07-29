import axios from "axios";

export class AIService {
  static apiKey = null;
  static apiEndpoint = "https://api.openai.com/v1/chat/completions";
  static serviceType = "openai"; // openai, anthropic, ollama, etc.
  static model = "gpt-3.5-turbo";
  
  static setApiKey(key) {
    this.apiKey = key;
  }
  
  static setEndpoint(endpoint) {
    this.apiEndpoint = endpoint;
  }
  
  static setServiceType(type) {
    this.serviceType = type;
  }
  
  static setModel(model) {
    this.model = model;
  }
  
  static async sendMessage(message, context = null) {
    if (!this.apiKey && this.serviceType !== "ollama") {
      throw new Error("AI API key not configured. Please set your API key in settings.");
    }
    
    try {
      let systemPrompt = "You are an AI assistant helping with academic research. You can help users understand papers, suggest research directions, and answer questions about academic content.";
      
      if (context) {
        systemPrompt += `\n\nContext: ${context}`;
      }
      
      // OpenAI-compatible format
      const requestBody = {
        model: this.model,
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: message
          }
        ]
      };
      
      // Headers for different services
      const headers = {
        "Content-Type": "application/json"
      };
      
      if (this.serviceType === "openai") {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      } else if (this.serviceType === "anthropic") {
        headers["x-api-key"] = this.apiKey;
        headers["anthropic-version"] = "2023-06-01";
        // Convert to Anthropic format if needed
        requestBody.system = systemPrompt;
        requestBody.messages = [{ role: "user", content: message }];
      } else if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }
      
      const response = await axios.post(this.apiEndpoint, requestBody, { headers });
      
      // Handle different response formats
      if (this.serviceType === "anthropic") {
        return response.data.content[0].text;
      } else {
        // OpenAI-compatible format
        return response.data.choices[0].message.content;
      }
    } catch (error) {
      console.error("AI API error:", error);
      if (error.response?.status === 401) {
        throw new Error("Invalid API key. Please check your credentials.");
      } else if (error.response?.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      throw new Error("Failed to get AI response. Please check your settings and try again.");
    }
  }
  
  static async suggestPapers(query, preferences = {}) {
    const message = `Based on the query "${query}", suggest some relevant academic papers or research topics to explore. Consider the following preferences: ${JSON.stringify(preferences)}. Please provide specific paper titles, authors, or research directions that would be relevant.`;
    
    return await this.sendMessage(message);
  }
  
  static async chatWithPaperContext(message, papers = []) {
    let context = "";
    
    if (papers.length > 0) {
      context = "Available papers for context:\n";
      papers.forEach((paper, index) => {
        context += `${index + 1}. Title: ${paper.title}\n`;
        context += `   Authors: ${paper.authors?.join(", ") || "Unknown"}\n`;
        context += `   Abstract: ${paper.summary || "No abstract available"}\n\n`;
      });
    }
    
    return await this.sendMessage(message, context);
  }
}