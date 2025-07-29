import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - try multiple possible locations
if (typeof window !== 'undefined') {
  // Try to use the worker from node_modules first
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
  } catch (e) {
    // Fallback to local worker if available
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }
}

export class PDFExtractionService {
  static cache = new Map(); // Cache extracted text by file path
  static maxCacheSize = 50; // Limit cache to prevent memory issues
  
  /**
   * Extract full text content from a PDF file
   * @param {string} filePath - Path to the PDF file
   * @param {Object} options - Extraction options
   * @returns {Promise<string>} - Extracted text content
   */
  static async extractText(filePath, options = {}) {
    const {
      maxPages = 100, // Limit pages to prevent overwhelming LLM
      includeMetadata = true,
      chunkSize = 10000, // Character limit per chunk
      cleanText = true
    } = options;

    // Check cache first
    const cacheKey = `${filePath}_${maxPages}_${includeMetadata}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      console.log('Attempting to extract PDF text from:', filePath);
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument(filePath);
      const pdf = await loadingTask.promise;
      
      console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
      
      let fullText = '';
      let metadata = {};
      
      // Extract metadata if requested
      if (includeMetadata) {
        const pdfMetadata = await pdf.getMetadata();
        metadata = {
          title: pdfMetadata.info?.Title || '',
          author: pdfMetadata.info?.Author || '',
          subject: pdfMetadata.info?.Subject || '',
          creator: pdfMetadata.info?.Creator || '',
          producer: pdfMetadata.info?.Producer || '',
          creationDate: pdfMetadata.info?.CreationDate || '',
          modificationDate: pdfMetadata.info?.ModDate || '',
          pages: pdf.numPages
        };
      }
      
      // Limit the number of pages to process
      const pagesToProcess = Math.min(pdf.numPages, maxPages);
      
      // Extract text from each page
      for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Combine text items from the page
          let pageText = textContent.items.map(item => item.str).join(' ');
          
          if (cleanText) {
            pageText = this.cleanExtractedText(pageText);
          }
          
          if (pageText.trim()) {
            fullText += `\n\n--- Page ${pageNum} ---\n${pageText}`;
          }
        } catch (pageError) {
          console.warn(`Error extracting text from page ${pageNum}:`, pageError);
          fullText += `\n\n--- Page ${pageNum} ---\n[Error extracting text from this page]`;
        }
      }
      
      // Prepare the final result
      let result = '';
      
      if (includeMetadata && Object.keys(metadata).length > 0) {
        result += this.formatMetadata(metadata) + '\n\n';
      }
      
      result += fullText;
      
      // Truncate if too long
      if (result.length > chunkSize * 10) {
        result = result.substring(0, chunkSize * 10) + '\n\n[Content truncated due to length...]';
      }
      
      // Cache the result
      this.cacheResult(cacheKey, result);
      
      console.log(`PDF extraction completed. Content length: ${result.length} characters`);
      console.log('First 200 chars:', result.substring(0, 200));
      
      return result;
      
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }
  
  /**
   * Extract text in chunks for better LLM processing
   * @param {string} filePath - Path to the PDF file
   * @param {Object} options - Extraction options
   * @returns {Promise<Array>} - Array of text chunks
   */
  static async extractTextInChunks(filePath, options = {}) {
    const {
      chunkSize = 8000, // Characters per chunk
      overlapSize = 200, // Overlap between chunks
      ...extractOptions
    } = options;
    
    const fullText = await this.extractText(filePath, extractOptions);
    
    if (fullText.length <= chunkSize) {
      return [fullText];
    }
    
    const chunks = [];
    let startIndex = 0;
    
    while (startIndex < fullText.length) {
      const endIndex = Math.min(startIndex + chunkSize, fullText.length);
      let chunk = fullText.substring(startIndex, endIndex);
      
      // Try to break at word boundaries
      if (endIndex < fullText.length) {
        const lastSpaceIndex = chunk.lastIndexOf(' ');
        if (lastSpaceIndex > chunkSize * 0.8) {
          chunk = chunk.substring(0, lastSpaceIndex);
        }
      }
      
      chunks.push(chunk);
      startIndex = endIndex - overlapSize;
    }
    
    return chunks;
  }
  
  /**
   * Get a summary/preview of the PDF content
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<Object>} - PDF summary with first few pages
   */
  static async extractSummary(filePath) {
    try {
      const summary = await this.extractText(filePath, {
        maxPages: 3, // Only extract first 3 pages for summary
        includeMetadata: true,
        chunkSize: 5000
      });
      
      const loadingTask = pdfjsLib.getDocument(filePath);
      const pdf = await loadingTask.promise;
      
      return {
        totalPages: pdf.numPages,
        extractedPages: Math.min(3, pdf.numPages),
        preview: summary,
        isPartial: pdf.numPages > 3
      };
    } catch (error) {
      console.error('Error extracting PDF summary:', error);
      return {
        totalPages: 0,
        extractedPages: 0,
        preview: 'Error extracting PDF content',
        isPartial: false,
        error: error.message
      };
    }
  }
  
  /**
   * Clean and normalize extracted text
   * @param {string} text - Raw extracted text
   * @returns {string} - Cleaned text
   */
  static cleanExtractedText(text) {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove isolated single characters (often OCR artifacts)
      .replace(/\s[a-zA-Z]\s/g, ' ')
      // Remove page headers/footers patterns
      .replace(/^\d+\s*$|^Page \d+.*$/gm, '')
      // Remove URLs
      .replace(/https?:\/\/[^\s]+/g, '[URL]')
      // Remove email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      // Normalize line breaks
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }
  
  /**
   * Format PDF metadata for display
   * @param {Object} metadata - PDF metadata object
   * @returns {string} - Formatted metadata string
   */
  static formatMetadata(metadata) {
    const parts = ['=== PDF METADATA ==='];
    
    if (metadata.title) parts.push(`Title: ${metadata.title}`);
    if (metadata.author) parts.push(`Author: ${metadata.author}`);
    if (metadata.subject) parts.push(`Subject: ${metadata.subject}`);
    if (metadata.pages) parts.push(`Total Pages: ${metadata.pages}`);
    if (metadata.creationDate) {
      try {
        const date = new Date(metadata.creationDate).toLocaleDateString();
        parts.push(`Created: ${date}`);
      } catch (e) {
        parts.push(`Created: ${metadata.creationDate}`);
      }
    }
    
    return parts.join('\n');
  }
  
  /**
   * Cache management
   */
  static cacheResult(key, result) {
    // Implement LRU cache behavior
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, result);
  }
  
  static clearCache() {
    this.cache.clear();
  }
  
  static getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      keys: Array.from(this.cache.keys())
    };
  }
  
  /**
   * Check if PDF text extraction is supported for a file
   * @param {string} filePath - Path to check
   * @returns {boolean} - Whether extraction is supported
   */
  static isSupported(filePath) {
    return filePath && filePath.toLowerCase().endsWith('.pdf');
  }
  
  /**
   * Estimate extraction time based on file size
   * @param {number} fileSize - File size in bytes
   * @returns {string} - Estimated time description
   */
  static estimateExtractionTime(fileSize) {
    const sizeMB = fileSize / (1024 * 1024);
    
    if (sizeMB < 5) return 'Less than 10 seconds';
    if (sizeMB < 20) return '10-30 seconds';
    if (sizeMB < 50) return '30-60 seconds';
    return 'Over 1 minute (large file)';
  }
}