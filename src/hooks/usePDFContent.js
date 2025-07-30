import { useState, useCallback, useRef } from "react";
import { PDFExtractionService } from "../services/pdfExtractionService";

export function usePDFContent() {
  const [extractedContent, setExtractedContent] = useState(new Map());
  const [extractionStatus, setExtractionStatus] = useState(new Map());
  const [isExtracting, setIsExtracting] = useState(false);
  const abortControllerRef = useRef(null);

  // Extract PDF content for a paper
  const extractPDFContent = useCallback(async (paper, options = {}) => {
    if (!paper || !paper.localPath) {
      console.warn('No local PDF path available for paper:', paper?.title);
      return null;
    }

    const paperId = paper.id || paper.arxivId;
    if (!paperId) {
      console.warn('No paper ID available for extraction');
      return null;
    }

    // Check if already extracted
    if (extractedContent.has(paperId)) {
      return extractedContent.get(paperId);
    }

    // Check if currently extracting
    if (extractionStatus.get(paperId) === 'extracting') {
      return null;
    }

    try {
      setIsExtracting(true);
      setExtractionStatus(prev => new Map(prev).set(paperId, 'extracting'));

      // Create abort controller for this extraction
      abortControllerRef.current = new AbortController();

      const defaultOptions = {
        maxPages: 50, // Limit pages for LLM context
        includeMetadata: true,
        chunkSize: 15000,
        cleanText: true,
        ...options
      };

      // Try to extract from local path first, fallback to URL if that fails
      let content;
      try {
        content = await PDFExtractionService.extractText(paper.localPath, defaultOptions);
      } catch (localError) {
        console.warn(`Local PDF extraction failed for ${paper.title}, trying URL:`, localError.message);
        if (paper.pdfUrl) {
          content = await PDFExtractionService.extractText(paper.pdfUrl, defaultOptions);
        } else {
          throw localError;
        }
      }
      
      const extractedData = {
        paperId,
        title: paper.title,
        authors: paper.authors,
        content,
        extractedAt: new Date().toISOString(),
        wordCount: content.split(/\s+/).length,
        charCount: content.length
      };

      // Store in state
      setExtractedContent(prev => new Map(prev).set(paperId, extractedData));
      setExtractionStatus(prev => new Map(prev).set(paperId, 'completed'));

      return extractedData;

    } catch (error) {
      console.error('PDF extraction failed:', error);
      setExtractionStatus(prev => new Map(prev).set(paperId, 'error'));
      
      const errorData = {
        paperId,
        title: paper.title,
        error: error.message,
        extractedAt: new Date().toISOString()
      };

      setExtractedContent(prev => new Map(prev).set(paperId, errorData));
      return errorData;

    } finally {
      setIsExtracting(false);
      abortControllerRef.current = null;
    }
  }, [extractedContent, extractionStatus]);

  // Extract PDF summary (first few pages only)
  const extractPDFSummary = useCallback(async (paper) => {
    if (!paper || !paper.localPath) return null;

    const paperId = paper.id || paper.arxivId;
    if (!paperId) return null;

    try {
      const summary = await PDFExtractionService.extractSummary(paper.localPath);
      
      const summaryData = {
        paperId,
        title: paper.title,
        summary: summary.preview,
        totalPages: summary.totalPages,
        extractedPages: summary.extractedPages,
        isPartial: summary.isPartial,
        extractedAt: new Date().toISOString()
      };

      return summaryData;

    } catch (error) {
      console.error('PDF summary extraction failed:', error);
      return {
        paperId,
        title: paper.title,
        error: error.message,
        extractedAt: new Date().toISOString()
      };
    }
  }, []);

  // Get extracted content for multiple papers
  const extractMultiplePDFs = useCallback(async (papers, options = {}) => {
    const results = new Map();
    
    for (const paper of papers) {
      try {
        const content = await extractPDFContent(paper, options);
        if (content) {
          results.set(paper.id || paper.arxivId, content);
        }
      } catch (error) {
        console.error(`Failed to extract PDF for ${paper.title}:`, error);
      }
    }
    
    return results;
  }, [extractPDFContent]);

  // Get content for a specific paper
  const getPDFContent = useCallback((paperId) => {
    return extractedContent.get(paperId) || null;
  }, [extractedContent]);

  // Check extraction status
  const getExtractionStatus = useCallback((paperId) => {
    return extractionStatus.get(paperId) || 'not_started';
  }, [extractionStatus]);

  // Clear extracted content
  const clearPDFContent = useCallback((paperId) => {
    if (paperId) {
      setExtractedContent(prev => {
        const newMap = new Map(prev);
        newMap.delete(paperId);
        return newMap;
      });
      setExtractionStatus(prev => {
        const newMap = new Map(prev);
        newMap.delete(paperId);
        return newMap;
      });
    } else {
      // Clear all
      setExtractedContent(new Map());
      setExtractionStatus(new Map());
      PDFExtractionService.clearCache();
    }
  }, []);

  // Cancel ongoing extraction
  const cancelExtraction = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsExtracting(false);
    }
  }, []);

  // Format PDF content for LLM context
  const formatForLLMContext = useCallback((papers) => {
    let context = "";
    let totalContentLength = 0;
    const maxTotalLength = 100000; // Limit total context to prevent token overflow

    papers.forEach((paper, index) => {
      const paperId = paper.id || paper.arxivId;
      const pdfContent = extractedContent.get(paperId);
      
      if (pdfContent && !pdfContent.error) {
        const paperContext = `\n\n=== PAPER ${index + 1}: ${pdfContent.title} ===\n`;
        const authorInfo = paper.authors ? `Authors: ${paper.authors.join(", ")}\n` : "";
        const contentInfo = `Word Count: ${pdfContent.wordCount || 'Unknown'}\n\n`;
        
        const paperHeader = paperContext + authorInfo + contentInfo;
        const remainingLength = maxTotalLength - totalContentLength - paperHeader.length;
        
        if (remainingLength > 1000) { // Only add if we have meaningful space left
          let contentToAdd = pdfContent.content;
          
          if (contentToAdd.length > remainingLength) {
            contentToAdd = contentToAdd.substring(0, remainingLength - 100) + "\n\n[Content truncated due to length limit...]";
          }
          
          context += paperHeader + contentToAdd;
          totalContentLength += paperHeader.length + contentToAdd.length;
        }
      } else if (pdfContent && pdfContent.error) {
        context += `\n\n=== PAPER ${index + 1}: ${paper.title} ===\n[PDF content extraction failed: ${pdfContent.error}]\n`;
      }
    });

    return {
      context,
      totalLength: totalContentLength,
      truncated: totalContentLength >= maxTotalLength
    };
  }, [extractedContent]);

  // Get extraction statistics
  const getExtractionStats = useCallback(() => {
    const completed = Array.from(extractionStatus.values()).filter(status => status === 'completed').length;
    const extracting = Array.from(extractionStatus.values()).filter(status => status === 'extracting').length;
    const errors = Array.from(extractionStatus.values()).filter(status => status === 'error').length;
    const total = extractionStatus.size;

    return {
      completed,
      extracting,
      errors,
      total,
      cached: extractedContent.size
    };
  }, [extractionStatus, extractedContent]);

  return {
    // Core extraction functions
    extractPDFContent,
    extractPDFSummary,
    extractMultiplePDFs,
    
    // Content access
    getPDFContent,
    formatForLLMContext,
    
    // Status and management
    getExtractionStatus,
    getExtractionStats,
    clearPDFContent,
    cancelExtraction,
    
    // State
    isExtracting,
    extractedContent: Object.fromEntries(extractedContent),
    extractionStatus: Object.fromEntries(extractionStatus)
  };
}