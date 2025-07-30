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
      console.error("Failed to initialize storage:", error);
    }
  }

  getDefaultData() {
    return {
      version: "1.0.0",
      starredPapers: [],
      openPapers: [],
      searchHistory: [],
      pdfViewState: {}, // paperId -> { scale, pageNumber, viewMode, lastViewed }
      theme: "light",
      lastUpdated: Date.now(),
    };
  }

  async loadData() {
    await this.initialize();

    try {
      const exists = await window.electronAPI.fileExists(this.dataFile);

      if (!exists) {
        const defaultData = this.getDefaultData();
        await this.saveData(defaultData);
        return defaultData;
      }

      const result = await window.electronAPI.readFile(this.dataFile);

      if (result.success) {
        // Handle different data formats
        let text;
        if (result.data instanceof ArrayBuffer) {
          text = new TextDecoder().decode(result.data);
        } else if (result.data instanceof Uint8Array) {
          text = new TextDecoder().decode(result.data);
        } else if (typeof result.data === "string") {
          text = result.data;
        } else {
          text = result.data.toString();
        }

        if (!text.trim()) {
          const defaultData = this.getDefaultData();
          await this.saveData(defaultData);
          return defaultData;
        }

        const data = JSON.parse(text);
        return data;
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }

    const defaultData = this.getDefaultData();
    await this.saveData(defaultData);
    return defaultData;
  }

  async saveData(data) {
    await this.initialize();

    try {
      data.lastUpdated = Date.now();
      const jsonData = JSON.stringify(data, null, 2);
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(jsonData);

      const result = await window.electronAPI.writeFile(
        this.dataFile,
        uint8Array
      );

      if (result?.success) {
        return true;
      } else {
        console.error("Failed to save data:", result);
        return false;
      }
    } catch (error) {
      console.error("Failed to save data:", error);
      return false;
    }
  }

  // Paper management
  async getStarredPapers() {
    const data = await this.loadData();
    return data.starredPapers || [];
  }

  async addStar(paper) {
    const data = await this.loadData();
    const starred = data.starredPapers || [];

    // Remove if already exists to avoid duplicates
    const filtered = starred.filter((p) => p.id !== paper.id);
    filtered.push({ ...paper, starredAt: Date.now() });

    data.starredPapers = filtered;
    await this.saveData(data);

    return filtered;
  }

  async removeStar(paperId) {
    const data = await this.loadData();
    data.starredPapers = (data.starredPapers || []).filter(
      (p) => p.id !== paperId
    );
    await this.saveData(data);
    return data.starredPapers;
  }

  async getOpenedPapers() {
    const data = await this.loadData();
    return data.openPapers || [];
  }

  async addToOpenedPapers(paper) {
    const data = await this.loadData();
    const opened = data.openPapers || [];

    // Remove if already exists and add to front (most recent)
    const filtered = opened.filter((p) => p.id !== paper.id);
    filtered.unshift({ ...paper, openedAt: Date.now() });

    // Keep only last 50 opened papers
    data.openPapers = filtered.slice(0, 50);
    await this.saveData(data);
    return data.openPapers;
  }

  async removeFromOpenedPapers(paperId) {
    const data = await this.loadData();
    data.openPapers = (data.openPapers || []).filter((p) => p.id !== paperId);
    await this.saveData(data);
    return data.openPapers;
  }

  async updatePaperLocalPath(paperId, localPath) {
    const data = await this.loadData();
    
    // Update localPath in opened papers
    if (data.openPapers) {
      data.openPapers = data.openPapers.map(paper => 
        paper.id === paperId 
          ? { ...paper, localPath }
          : paper
      );
    }
    
    // Update localPath in starred papers
    if (data.starredPapers) {
      data.starredPapers = data.starredPapers.map(paper => 
        paper.id === paperId 
          ? { ...paper, localPath }
          : paper
      );
    }
    
    await this.saveData(data);
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
      lastViewed: Date.now(),
    };
    await this.saveData(data);
  }

  // Search history
  async addSearchHistory(searchData) {
    const data = await this.loadData();
    const history = data.searchHistory || [];

    // Remove duplicate searches
    const filtered = history.filter(
      (h) => h.query !== searchData.query || h.source !== searchData.source
    );

    filtered.unshift({
      ...searchData,
      timestamp: Date.now(),
    });

    // Keep only last 20 searches
    data.searchHistory = filtered.slice(0, 20);
    await this.saveData(data);
    return data.searchHistory;
  }

  async getSearchHistory() {
    const data = await this.loadData();
    return data.searchHistory || [];
  }

  // Cleanup old data
  async cleanup(olderThanDays = 30) {
    const data = await this.loadData();
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    // Clean old search history
    data.searchHistory = (data.searchHistory || []).filter(
      (h) => h.timestamp > cutoffTime
    );

    // Clean old PDF view states (keep starred papers)
    const keepPaperIds = new Set([
      ...(data.starredPapers || []).map((p) => p.id),
    ]);

    Object.keys(data.pdfViewState).forEach((paperId) => {
      if (
        !keepPaperIds.has(paperId) &&
        data.pdfViewState[paperId].lastViewed < cutoffTime
      ) {
        delete data.pdfViewState[paperId];
      }
    });

    await this.saveData(data);
  }

  // PDF caching methods
  sanitizeFilename(filename) {
    // Remove or replace invalid characters for filenames
    return filename
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_{2,}/g, "_")
      .trim();
  }

  async downloadAndCachePdf(paper) {
    await this.initialize();

    try {
      const sanitizedId = this.sanitizeFilename(paper.id);
      const sanitizedTitle = this.sanitizeFilename(
        paper.title.substring(0, 100)
      );
      const filename = `${sanitizedId}_${sanitizedTitle}.pdf`;
      const localPath = `${this.papersDir}/${filename}`;

      // Check if already cached
      const exists = await window.electronAPI.fileExists(localPath);
      if (exists) {
        console.log("PDF already cached:", localPath);
        return localPath;
      }

      // Download the PDF
      console.log("Downloading PDF:", paper.pdfUrl, "to", localPath);
      const result = await window.electronAPI.downloadFile(
        paper.pdfUrl,
        filename
      );

      if (result.success) {
        console.log("PDF downloaded successfully:", result.path);
        return result.path;
      } else {
        console.error("Failed to download PDF:", result.error);
        return null;
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
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
      console.error("Failed to import data:", error);
    }
    return false;
  }
}

// Create singleton instance
export const storageService = new StorageService();

// Initialize immediately when imported
if (typeof window !== "undefined" && window.electronAPI) {
  storageService.initialize().catch((error) => {
    console.error("Failed to auto-initialize storage service:", error);
  });
}

export default storageService;
