// Storage service for persistent data management
class StorageService {
  dataFile: string | null = null;
  papersDir: string | null = null;
  initialized: boolean = false;
  initPromise: Promise<void> | null = null;
  operationQueue: Array<() => Promise<any>> = [];
  isProcessingQueue: boolean = false;
  cache: Map<string, any> = new Map();

  constructor() {
    // Properties initialized above
  }

  async initialize() {
    if (this.initialized) return;

    // Prevent multiple initialization attempts
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    await this.initPromise;
  }

  async _doInitialize() {
    try {
      if (!window.electronAPI) {
        throw new Error("Electron API not available");
      }

      const appDataPath = await window.electronAPI.getAppDataPath();
      this.dataFile = `${appDataPath}/app-data.json`;
      this.papersDir = `${appDataPath}/papers`;

      // Ensure directories exist
      await Promise.all([
        window.electronAPI.ensureDirectory(appDataPath),
        window.electronAPI.ensureDirectory(this.papersDir),
      ]);

      // Ensure the data file exists
      const exists = await window.electronAPI.fileExists(this.dataFile);
      if (!exists) {
        await this._saveDataDirect(this.getDefaultData());
      }

      this.initialized = true;
      console.log("StorageService initialized successfully");
    } catch (error) {
      console.error("Failed to initialize storage:", error);
      this.initialized = false;
      this.initPromise = null;
      throw error;
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

    // Check memory cache first
    const cacheKey = "app-data";
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      // Cache for 5 minutes
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      const exists = await window.electronAPI.fileExists(this.dataFile);

      if (!exists) {
        const defaultData = this.getDefaultData();
        await this._saveDataDirect(defaultData);
        this.cache.set(cacheKey, { data: defaultData, timestamp: Date.now() });
        return defaultData;
      }

      const result = await window.electronAPI.readFile(this.dataFile);

      if (result.success && result.data) {
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
          throw new Error("Empty data file");
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          throw new Error(`JSON parse error: ${parseError.message}`);
        }

        // Validate data structure
        if (!data || typeof data !== "object") {
          throw new Error("Invalid data structure");
        }

        // Ensure required properties exist
        const validatedData = {
          ...this.getDefaultData(),
          ...data,
        };

        this.cache.set(cacheKey, {
          data: validatedData,
          timestamp: Date.now(),
        });
        return validatedData;
      } else {
        throw new Error(
          "Failed to read data file: " + (result.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Failed to load data:", error);

      // Create backup and return default data
      const defaultData = this.getDefaultData();
      try {
        await this._saveDataDirect(defaultData);
      } catch (saveError) {
        console.error("Failed to save default data:", saveError);
      }

      this.cache.set(cacheKey, { data: defaultData, timestamp: Date.now() });
      return defaultData;
    }
  }

  async saveData(data) {
    return new Promise((resolve) => {
      this.operationQueue.push(async () => {
        try {
          const result = await this._saveDataDirect(data);
          resolve(result);
        } catch (error) {
          console.error("Queued save operation failed:", error);
          resolve(false);
        }
      });

      this.processQueue();
    });
  }

  async _saveDataDirect(data) {
    await this.initialize();

    try {
      // Validate data before saving
      if (!data || typeof data !== "object") {
        throw new Error("Invalid data to save");
      }

      const dataToSave = {
        ...data,
        lastUpdated: Date.now(),
        version: data.version || "1.0.0",
      };

      const jsonData = JSON.stringify(dataToSave, null, 2);

      // Validate JSON size (prevent extremely large files)
      if (jsonData.length > 50 * 1024 * 1024) {
        // 50MB limit
        throw new Error("Data file too large");
      }

      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(jsonData);

      const result = await window.electronAPI.writeFile(
        this.dataFile,
        uint8Array
      );

      if (result?.success) {
        // Update cache
        const cacheKey = "app-data";
        this.cache.set(cacheKey, { data: dataToSave, timestamp: Date.now() });
        return true;
      } else {
        throw new Error(
          `Write operation failed: ${result?.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Failed to save data:", error);
      return false;
    }
  }

  async processQueue() {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift();
      try {
        await operation();
      } catch (error) {
        console.error("Queue operation failed:", error);
      }
    }

    this.isProcessingQueue = false;
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
      data.openPapers = data.openPapers.map((paper) =>
        paper.id === paperId ? { ...paper, localPath } : paper
      );
    }

    // Update localPath in starred papers
    if (data.starredPapers) {
      data.starredPapers = data.starredPapers.map((paper) =>
        paper.id === paperId ? { ...paper, localPath } : paper
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
    if (!filename || typeof filename !== "string") {
      return "unknown";
    }

    // Remove or replace invalid characters for filenames
    return (
      filename
        .replace(/[<>:"/\\|?*]/g, "_")
        .replace(/[^\u0020-\u007E]/g, "_") // Replace non-printable characters
        .replace(/\s+/g, "_")
        .replace(/_{2,}/g, "_")
        .replace(/^[._]+|[._]+$/g, "") // Remove leading/trailing dots and underscores
        .substring(0, 200) // Limit length
        .trim() || "unknown"
    );
  }

  async downloadAndCachePdf(paper, options = {}) {
    await this.initialize();

    try {
      // Input validation
      if (!paper || !paper.id || !paper.pdfUrl) {
        throw new Error("Invalid paper object");
      }

      const sanitizedId = this.sanitizeFilename(paper.id);
      const sanitizedTitle = this.sanitizeFilename(
        (paper.title || "untitled").substring(0, 100)
      );
      const filename = `${sanitizedId}_${sanitizedTitle}.pdf`;
      const localPath = `${this.papersDir}/${filename}`;

      // Check if already cached
      const exists = await window.electronAPI.fileExists(localPath);
      if (exists && !options.force) {
        console.log("PDF already cached:", localPath);
        return localPath;
      }

      // Validate PDF URL
      if (!paper.pdfUrl.startsWith("http")) {
        throw new Error("Invalid PDF URL");
      }

      // Download the PDF
      console.log("Downloading PDF:", paper.pdfUrl, "to", filename);

      const result = await window.electronAPI.downloadFile(
        paper.pdfUrl,
        filename
      );

      if (result && result.success) {
        console.log("PDF downloaded successfully:", result.path);
        return result.path;
      } else {
        const errorMsg = result?.error || "Unknown download error";
        console.error("Failed to download PDF:", errorMsg);
        throw new Error(`Download failed: ${errorMsg}`);
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
