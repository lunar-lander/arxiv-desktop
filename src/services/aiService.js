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

  static async sendMessageStream(message, context = null, onChunk = null) {
    if (!this.apiKey && this.serviceType !== "ollama") {
      throw new Error("AI API key not configured. Please set your API key in settings.");
    }
    
    try {
      let systemPrompt = "You are an AI assistant helping with academic research. You can help users understand papers, suggest research directions, and answer questions about academic content.";
      
      if (context) {
        systemPrompt += `\n\nContext: ${context}`;
      }
      
      // OpenAI-compatible format with streaming
      const requestBody = {
        model: this.model,
        max_tokens: 1000,
        stream: true,
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
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
      };
      
      if (this.serviceType === "openai") {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      } else if (this.serviceType === "anthropic") {
        // For Anthropic, simulate streaming by chunking the response
        const response = await this.sendMessage(message, context);
        if (onChunk) {
          // Simulate streaming by sending chunks with delay
          const words = response.split(' ');
          let accumulated = '';
          for (let i = 0; i < words.length; i++) {
            accumulated += (i > 0 ? ' ' : '') + words[i];
            onChunk(words[i] + (i < words.length - 1 ? ' ' : ''), accumulated);
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        return response;
      } else if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.text();
          console.log('API Error Response:', errorData);
          errorMessage += `: ${errorData}`;
        } catch (e) {
          // Ignore if we can't read the error response
        }
        throw new Error(errorMessage);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullResponse += content;
                if (onChunk) {
                  onChunk(content, fullResponse);
                }
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }

      return fullResponse;
    } catch (error) {
      console.error("AI streaming API error:", error);
      
      // Check for specific HTTP status codes
      if (error.message.includes('401') || (error.response && error.response.status === 401)) {
        throw new Error("Invalid API key. Please check your credentials.");
      } else if (error.message.includes('429') || (error.response && error.response.status === 429)) {
        throw new Error("Rate limit exceeded. Please try again later.");
      } else if (error.message.includes('400') || (error.response && error.response.status === 400)) {
        throw new Error("Invalid request. The content might be too long or malformed.");
      } else if (error.message.includes('500') || (error.response && error.response.status >= 500)) {
        throw new Error("Server error. Please try again later.");
      } else if (error.name === 'TypeError' || error.message.includes('fetch')) {
        throw new Error("Network error. Please check your connection and try again.");
      }
      
      // For debugging, include the actual error message
      console.log("Full error details:", error);
      throw new Error(`AI request failed: ${error.message || 'Unknown error'}`);
    }
  }
  
  static async suggestPapers(query, preferences = {}) {
    const message = `Based on the query "${query}", suggest some relevant academic papers or research topics to explore. Consider the following preferences: ${JSON.stringify(preferences)}. Please provide specific paper titles, authors, or research directions that would be relevant.`;
    
    return await this.sendMessage(message);
  }

  static async suggestPapersStream(query, preferences = {}, onChunk = null) {
    const message = `Based on the query "${query}", suggest some relevant academic papers or research topics to explore. Consider the following preferences: ${JSON.stringify(preferences)}. Please provide specific paper titles, authors, or research directions that would be relevant.`;
    
    if (onChunk) {
      return await this.sendMessageStream(message, null, onChunk);
    } else {
      return await this.sendMessage(message);
    }
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
      
      context += `Instructions: Use the above papers as context for your response. You can reference specific papers by their titles or by "Paper X" (where X is the number). 

IMPORTANT: You currently only have access to the paper metadata and abstracts. If the user asks about:
- Specific methodological details not in the abstract
- Experimental results beyond what's summarized
- Detailed mathematical derivations
- Specific figures, tables, or equations
- Full paper content analysis

Please let them know that you only have access to the abstract and metadata, and suggest they can:
1. Copy and paste specific text from the PDF viewer into the chat for detailed discussion
2. Ask questions about the general concepts, implications, or relationships between papers
3. Request paper recommendations or research directions based on the abstracts`;
    }
    
    return await this.sendMessage(message, context);
  }

  static async chatWithPaperContextStream(message, papers = [], pdfContentMap = null, onChunk = null) {
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
        
        // Add PDF content if available
        const paperId = paper.id || paper.arxivId;
        const pdfContent = pdfContentMap?.get?.(paperId) || pdfContentMap?.[paperId];
        
        if (pdfContent && !pdfContent.error) {
          context += `\n--- FULL PDF CONTENT ---\n`;
          context += `Word Count: ${pdfContent.wordCount || 'Unknown'}\n`;
          context += `Content: ${pdfContent.content}\n`;
        } else if (pdfContent?.error) {
          context += `\n--- PDF CONTENT UNAVAILABLE ---\n`;
          context += `Error: ${pdfContent.error}\n`;
        }
        
        context += "\n" + "=".repeat(80) + "\n\n";
      });
      
      const hasPDFContent = papers.some(paper => {
        const paperId = paper.id || paper.arxivId;
        const pdfContent = pdfContentMap?.get?.(paperId) || pdfContentMap?.[paperId];
        return pdfContent && !pdfContent.error;
      });
      
      if (hasPDFContent) {
        context += `Instructions: You have access to both paper metadata/abstracts AND full PDF content for the papers above. You can:
1. Answer detailed questions about methodologies, experiments, and results
2. Reference specific sections, figures, or equations mentioned in the text
3. Analyze the complete paper content including technical details
4. Compare detailed approaches between papers
5. Provide comprehensive analysis based on the full paper content

When referencing content, please cite it as "Paper X" where X is the paper number.`;
        console.log(`AI context includes PDF content for ${papers.length} papers. Context length: ${context.length} characters`);
      } else {
        context += `Instructions: You currently only have access to paper metadata and abstracts (PDF content extraction not available). For detailed analysis:
1. Copy and paste specific text from the PDF viewer into the chat
2. Ask questions about general concepts and implications
3. Request paper recommendations based on the abstracts available`;
        console.log(`AI context includes only metadata/abstracts for ${papers.length} papers. Context length: ${context.length} characters`);
      }
    }
    
    return await this.sendMessageStream(message, context, onChunk);
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