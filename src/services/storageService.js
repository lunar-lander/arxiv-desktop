// Storage service for persistent data management
class StorageService {
  constructor() {
    this.dataFile = null;
    this.papersDir = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const appDataPath = await window.electronAPI.getAppDataPath();
      this.dataFile = `${appDataPath}/app-data.json`;
      this.papersDir = `${appDataPath}/papers`;
      
      // Ensure directories exist
      await window.electronAPI.ensureDirectory(appDataPath);
      await window.electronAPI.ensureDirectory(this.papersDir);
      
      // Ensure the data file exists
      const exists = await window.electronAPI.fileExists(this.dataFile);
      if (!exists) {
        await this.saveData(this.getDefaultData());
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  getDefaultData() {
    return {
      version: '1.0.0',
      starredPapers: [],
      openPapers: [],
      searchHistory: [],
      pdfViewState: {}, // paperId -> { scale, pageNumber, viewMode, lastViewed }
      theme: 'light',
      lastUpdated: Date.now()
    };
  }

  async loadData() {
    await this.initialize();
    
    try {
      console.log('Attempting to load data from:', this.dataFile);
      const exists = await window.electronAPI.fileExists(this.dataFile);
      console.log('File exists:', exists);
      
      if (!exists) {
        console.log('Data file does not exist, creating default data');
        const defaultData = this.getDefaultData();
        await this.saveData(defaultData);
        return defaultData;
      }
      
      const result = await window.electronAPI.readFile(this.dataFile);
      console.log('Read file result:', result);
      
      if (result.success) {
        // Handle different data formats
        let text;
        if (result.data instanceof ArrayBuffer) {
          text = new TextDecoder().decode(result.data);
        } else if (result.data instanceof Uint8Array) {
          text = new TextDecoder().decode(result.data);
        } else if (typeof result.data === 'string') {
          text = result.data;
        } else {
          text = result.data.toString();
        }
        
        console.log('Raw file content:', text);
        console.log('File content length:', text.length);
        
        if (!text.trim()) {
          console.log('File is empty, using default data');
          const defaultData = this.getDefaultData();
          await this.saveData(defaultData);
          return defaultData;
        }
        
        const data = JSON.parse(text);
        console.log('Successfully parsed data:', data);
        return data;
      } else {
        console.log('File read failed:', result);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      console.error('Error details:', error.message, error.stack);
    }
    
    console.log('Falling back to default data');
    const defaultData = this.getDefaultData();
    await this.saveData(defaultData);
    return defaultData;
  }

  async saveData(data) {
    await this.initialize();
    
    try {
      console.log('saveData called with:', data);
      console.log('Will save to file:', this.dataFile);
      
      data.lastUpdated = Date.now();
      const jsonData = JSON.stringify(data, null, 2);
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(jsonData);
      
      console.log('JSON data to save:', jsonData);
      console.log('Saving data to:', this.dataFile);
      
      const result = await window.electronAPI.writeFile(this.dataFile, uint8Array);
      console.log('Save result:', result);
      
      if (result?.success) {
        console.log('✅ Data saved successfully');
        return true;
      } else {
        console.error('❌ Save failed:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to save data:', error);
      console.error('Error details:', error.message, error.stack);
      return false;
    }
  }

  // Paper management  
  async getStarredPapers() {
    const data = await this.loadData();
    return data.starredPapers || [];
  }

  async addStar(paper) {
    console.log('🌟 addStar called for paper:', paper.id, paper.title?.substring(0, 50));
    const data = await this.loadData();
    const starred = data.starredPapers || [];
    
    console.log('Current starred papers:', starred.length);
    
    // Remove if already exists to avoid duplicates
    const filtered = starred.filter(p => p.id !== paper.id);
    filtered.push({ ...paper, starredAt: Date.now() });
    
    console.log('New starred papers count:', filtered.length);
    
    data.starredPapers = filtered;
    const saveResult = await this.saveData(data);
    console.log('Save result for starred paper:', saveResult);
    
    return filtered;
  }

  async removeStar(paperId) {
    console.log('🗑️ removeStar called for paper:', paperId);
    const data = await this.loadData();
    data.starredPapers = (data.starredPapers || []).filter(p => p.id !== paperId);
    const saveResult = await this.saveData(data);
    console.log('Save result for removing star:', saveResult);
    return data.starredPapers;
  }

  async getOpenedPapers() {
    const data = await this.loadData();
    return data.openPapers || [];
  }

  async addToOpenedPapers(paper) {
    console.log('📂 addToOpenedPapers called for paper:', paper.id);
    const data = await this.loadData();
    const opened = data.openPapers || [];
    
    // Remove if already exists and add to front (most recent)
    const filtered = opened.filter(p => p.id !== paper.id);
    filtered.unshift({ ...paper, openedAt: Date.now() });
    
    // Keep only last 50 opened papers
    data.openPapers = filtered.slice(0, 50);
    const saveResult = await this.saveData(data);
    console.log('Save result for opened paper:', saveResult);
    return data.openPapers;
  }

  async removeFromOpenedPapers(paperId) {
    const data = await this.loadData();
    data.openPapers = (data.openPapers || []).filter(p => p.id !== paperId);
    await this.saveData(data);
    return data.openPapers;
  }

  // PDF view state management
  async getPdfViewState(paperId) {
    const data = await this.loadData();
    return data.pdfViewState[paperId] || null;
  }

  async savePdfViewState(paperId, viewState) {
    const data = await this.loadData();
    data.pdfViewState[paperId] = {
      ...viewState,
      lastViewed: Date.now()
    };
    await this.saveData(data);
  }

  // Search history
  async addSearchHistory(searchData) {
    console.log('🔍 addSearchHistory called:', searchData);
    const data = await this.loadData();
    const history = data.searchHistory || [];
    
    // Remove duplicate searches
    const filtered = history.filter(h => 
      h.query !== searchData.query || h.source !== searchData.source
    );
    
    filtered.unshift({
      ...searchData,
      timestamp: Date.now()
    });
    
    // Keep only last 20 searches
    data.searchHistory = filtered.slice(0, 20);
    const saveResult = await this.saveData(data);
    console.log('Save result for search history:', saveResult);
    return data.searchHistory;
  }

  async getSearchHistory() {
    const data = await this.loadData();
    return data.searchHistory || [];
  }


  // Cleanup old data
  async cleanup(olderThanDays = 30) {
    const data = await this.loadData();
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    // Clean old search history
    data.searchHistory = (data.searchHistory || [])
      .filter(h => h.timestamp > cutoffTime);
    
    // Clean old PDF view states (keep starred papers)
    const keepPaperIds = new Set([
      ...(data.starredPapers || []).map(p => p.id)
    ]);
    
    Object.keys(data.pdfViewState).forEach(paperId => {
      if (!keepPaperIds.has(paperId) && 
          data.pdfViewState[paperId].lastViewed < cutoffTime) {
        delete data.pdfViewState[paperId];
      }
    });
    
    await this.saveData(data);
  }

  // PDF caching methods
  sanitizeFilename(filename) {
    // Remove or replace invalid characters for filenames
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .trim();
  }

  async downloadAndCachePdf(paper) {
    await this.initialize();
    
    try {
      const sanitizedId = this.sanitizeFilename(paper.id);
      const sanitizedTitle = this.sanitizeFilename(paper.title.substring(0, 100));
      const filename = `${sanitizedId}_${sanitizedTitle}.pdf`;
      const localPath = `${this.papersDir}/${filename}`;
      
      // Check if already cached
      const exists = await window.electronAPI.fileExists(localPath);
      if (exists) {
        console.log('PDF already cached:', localPath);
        return localPath;
      }
      
      // Download the PDF
      console.log('Downloading PDF:', paper.pdfUrl, 'to', localPath);
      const result = await window.electronAPI.downloadFile(paper.pdfUrl, filename);
      
      if (result.success) {
        console.log('PDF downloaded successfully:', result.path);
        return result.path;
      } else {
        console.error('Failed to download PDF:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      return null;
    }
  }

  async getPaperCachePath(paper) {
    await this.initialize();
    
    const sanitizedId = this.sanitizeFilename(paper.id);
    const sanitizedTitle = this.sanitizeFilename(paper.title.substring(0, 100));
    const filename = `${sanitizedId}_${sanitizedTitle}.pdf`;
    const localPath = `${this.papersDir}/${filename}`;
    
    const exists = await window.electronAPI.fileExists(localPath);
    return exists ? localPath : null;
  }

  async getPapersDirectory() {
    await this.initialize();
    return this.papersDir;
  }

  // Export/Import
  async exportData() {
    const data = await this.loadData();
    return JSON.stringify(data, null, 2);
  }

  async importData(jsonString) {
    try {
      const importedData = JSON.parse(jsonString);
      // Validate basic structure
      if (importedData.version && importedData.starredPapers) {
        await this.saveData(importedData);
        return true;
      }
    } catch (error) {
      console.error('Failed to import data:', error);
    }
    return false;
  }
}

// Create singleton instance
export const storageService = new StorageService();
export default storageService;