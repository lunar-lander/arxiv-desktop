import React, { useState } from "react";
import { Bot, Send, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { AIService } from "../services/aiService";
import styles from "./AISearchHelper.module.css";

function AISearchHelper({ onSuggestion }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastSuggestion, setLastSuggestion] = useState("");

  const handleGetSuggestion = async () => {
    if (!inputMessage.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const suggestion = await AIService.suggestPapers(inputMessage.trim());
      setLastSuggestion(suggestion);
    } catch (error) {
      setLastSuggestion(`Error: ${error.message}`);
    }
    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGetSuggestion();
    }
  };

  const applySuggestionAsSearch = (text) => {
    // Extract potential search terms from AI suggestion
    const lines = text.split('\n');
    const searchTerms = [];
    
    lines.forEach(line => {
      // Look for quoted terms or paper titles
      const quotes = line.match(/"([^"]+)"/g);
      if (quotes) {
        quotes.forEach(quote => {
          searchTerms.push(quote.replace(/"/g, ''));
        });
      }
      
      // Look for "search for: " patterns
      const searchPattern = line.match(/search for:?\s*(.+)/i);
      if (searchPattern) {
        searchTerms.push(searchPattern[1].trim());
      }
    });
    
    if (searchTerms.length > 0) {
      onSuggestion(searchTerms[0]);
    }
  };

  return (
    <div className={styles.aiSearchHelper}>
      <button
        className={styles.toggleButton}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Bot size={16} />
        <span>Search with AI</span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className={styles.expandedContent}>
          <div className={styles.inputSection}>
            <input
              type="text"
              placeholder="Ask AI for paper suggestions..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className={styles.suggestionInput}
            />
            <button
              onClick={handleGetSuggestion}
              disabled={!inputMessage.trim() || isLoading}
              className={styles.sendButton}
            >
              {isLoading ? <Loader2 className={styles.spinning} size={16} /> : <Send size={16} />}
            </button>
          </div>

          {lastSuggestion && (
            <div className={styles.suggestionResult}>
              <div className={styles.suggestionText}>
                {lastSuggestion}
              </div>
              {!lastSuggestion.startsWith('Error:') && (
                <button
                  className={styles.applyButton}
                  onClick={() => applySuggestionAsSearch(lastSuggestion)}
                >
                  Apply as Search
                </button>
              )}
            </div>
          )}

          <div className={styles.helpText}>
            <p>💡 Try asking:</p>
            <ul>
              <li>"Papers about neural networks in computer vision"</li>
              <li>"Recent research on climate change modeling"</li>
              <li>"Machine learning papers by Yann LeCun"</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default AISearchHelper;