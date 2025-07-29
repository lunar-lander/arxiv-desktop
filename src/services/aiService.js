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
      context = `Available papers for reference (${papers.length} papers):\n\n`;
      papers.forEach((paper, index) => {
        context += `Paper ${index + 1}:\n`;
        context += `Title: ${paper.title}\n`;
        context += `Authors: ${paper.authors?.join(", ") || "Unknown"}\n`;
        context += `Published: ${paper.published || paper.date || "Unknown date"}\n`;
        context += `Source: ${paper.source || "Unknown"}\n`;
        
        if (paper.categories && paper.categories.length > 0) {
          context += `Categories: ${paper.categories.join(", ")}\n`;
        }
        
        if (paper.summary) {
          context += `Abstract: ${paper.summary}\n`;
        }
        
        if (paper.doi) {
          context += `DOI: ${paper.doi}\n`;
        }
        
        if (paper.arxivId) {
          context += `ArXiv ID: ${paper.arxivId}\n`;
        }
        
        context += "\n---\n\n";
      });
      
      context += `Instructions: Use the above papers as context for your response. You can reference specific papers by their titles or by "Paper X" (where X is the number). If the user asks about content not covered in the abstracts, mention that you would need the full paper text for more detailed analysis.`;
    }
    
    return await this.sendMessage(message, context);
  }
  
  static async extractKeywords(papers = []) {
    if (papers.length === 0) return [];
    
    const titles = papers.map(p => p.title).join(" ");
    const abstracts = papers.map(p => p.summary || "").join(" ");
    const text = `${titles} ${abstracts}`;
    
    // Simple keyword extraction (can be enhanced with NLP libraries later)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !["the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "this", "that", "these", "those", "they", "their", "them", "from", "into", "through", "during", "before", "after", "above", "below", "between", "among", "under", "over", "about", "against", "within", "without", "upon", "across", "behind", "beyond", "since", "until", "while", "where", "when", "what", "which", "who", "whom", "whose", "why", "how", "paper", "papers", "study", "studies", "research", "using", "used", "based", "approach", "method", "methods", "results", "analysis", "show", "shows", "present", "presents", "propose", "proposed", "develop", "developed", "model", "models", "data", "dataset", "datasets", "algorithm", "algorithms", "performance", "evaluation", "experimental", "experiments"].includes(word));
    
    // Count frequency and return top keywords
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }
}