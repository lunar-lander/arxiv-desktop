// Storage service for persistent data management
class StorageService {
  constructor() {
    this.dataFile = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const appDataPath = await window.electronAPI.getAppDataPath();
      this.dataFile = `${appDataPath}/app-data.json`;
      
      // Ensure the file exists
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
      papers: {
        bookmarked: [],
        starred: [],
        opened: [],
        searchHistory: []
      },
      pdfViewState: {}, // paperId -> { scale, pageNumber, viewMode, lastViewed }
      preferences: {
        defaultZoom: 1.0,
        defaultViewMode: 'single',
        theme: 'light'
      },
      lastUpdated: Date.now()
    };
  }

  async loadData() {
    await this.initialize();
    
    try {
      const result = await window.electronAPI.readFile(this.dataFile);
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
        
        console.log('Loading data from:', this.dataFile);
        const data = JSON.parse(text);
        console.log('Loaded data:', data);
        return data;
      } else {
        console.log('File read failed:', result);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    
    console.log('Returning default data');
    return this.getDefaultData();
  }

  async saveData(data) {
    await this.initialize();
    
    try {
      data.lastUpdated = Date.now();
      const jsonData = JSON.stringify(data, null, 2);
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(jsonData);
      
      console.log('Saving data to:', this.dataFile);
      console.log('Data to save:', data);
      
      const result = await window.electronAPI.writeFile(this.dataFile, uint8Array);
      console.log('Save result:', result);
      
      return result?.success !== false;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  }

  // Paper management
  async getBookmarkedPapers() {
    const data = await this.loadData();
    return data.papers.bookmarked || [];
  }

  async addBookmark(paper) {
    const data = await this.loadData();
    const bookmarks = data.papers.bookmarked || [];
    
    // Remove if already exists to avoid duplicates
    const filtered = bookmarks.filter(p => p.id !== paper.id);
    filtered.push({ ...paper, bookmarkedAt: Date.now() });
    
    data.papers.bookmarked = filtered;
    await this.saveData(data);
    return filtered;
  }

  async removeBookmark(paperId) {
    const data = await this.loadData();
    data.papers.bookmarked = (data.papers.bookmarked || []).filter(p => p.id !== paperId);
    await this.saveData(data);
    return data.papers.bookmarked;
  }

  async getStarredPapers() {
    const data = await this.loadData();
    return data.papers.starred || [];
  }

  async addStar(paper) {
    const data = await this.loadData();
    const starred = data.papers.starred || [];
    
    // Remove if already exists to avoid duplicates
    const filtered = starred.filter(p => p.id !== paper.id);
    filtered.push({ ...paper, starredAt: Date.now() });
    
    data.papers.starred = filtered;
    await this.saveData(data);
    return filtered;
  }

  async removeStar(paperId) {
    const data = await this.loadData();
    data.papers.starred = (data.papers.starred || []).filter(p => p.id !== paperId);
    await this.saveData(data);
    return data.papers.starred;
  }

  async addToOpenedPapers(paper) {
    const data = await this.loadData();
    const opened = data.papers.opened || [];
    
    // Remove if already exists and add to front (most recent)
    const filtered = opened.filter(p => p.id !== paper.id);
    filtered.unshift({ ...paper, openedAt: Date.now() });
    
    // Keep only last 50 opened papers
    data.papers.opened = filtered.slice(0, 50);
    await this.saveData(data);
    return data.papers.opened;
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
    const data = await this.loadData();
    const history = data.papers.searchHistory || [];
    
    // Remove duplicate searches
    const filtered = history.filter(h => 
      h.query !== searchData.query || h.source !== searchData.source
    );
    
    filtered.unshift({
      ...searchData,
      timestamp: Date.now()
    });
    
    // Keep only last 20 searches
    data.papers.searchHistory = filtered.slice(0, 20);
    await this.saveData(data);
    return data.papers.searchHistory;
  }

  async getSearchHistory() {
    const data = await this.loadData();
    return data.papers.searchHistory || [];
  }

  // Preferences
  async getPreferences() {
    const data = await this.loadData();
    return data.preferences || this.getDefaultData().preferences;
  }

  async updatePreferences(preferences) {
    const data = await this.loadData();
    data.preferences = { ...data.preferences, ...preferences };
    await this.saveData(data);
    return data.preferences;
  }

  // Cleanup old data
  async cleanup(olderThanDays = 30) {
    const data = await this.loadData();
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    // Clean old search history
    data.papers.searchHistory = (data.papers.searchHistory || [])
      .filter(h => h.timestamp > cutoffTime);
    
    // Clean old PDF view states (keep starred/bookmarked papers)
    const keepPaperIds = new Set([
      ...(data.papers.bookmarked || []).map(p => p.id),
      ...(data.papers.starred || []).map(p => p.id)
    ]);
    
    Object.keys(data.pdfViewState).forEach(paperId => {
      if (!keepPaperIds.has(paperId) && 
          data.pdfViewState[paperId].lastViewed < cutoffTime) {
        delete data.pdfViewState[paperId];
      }
    });
    
    await this.saveData(data);
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
      if (importedData.version && importedData.papers) {
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