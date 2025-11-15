/**
 * Settings Repository Implementation
 * Handles application settings, PDF view states, chat sessions, and UI settings
 */

import {
  ISettingsRepository,
  PdfViewState,
  ChatSession,
  ChatMessage,
  UISettings,
} from "../../domain/repositories/ISettingsRepository";
import { SearchCriteria } from "../../domain/repositories/IPaperRepository";
import { Result, success, failure, StorageError } from "../../shared/errors";
import { LoggerFactory } from "../logging/Logger";
import { SecureFileSystem } from "../ipc/SecureFileSystem";
import * as path from "path";
import * as os from "os";

const logger = LoggerFactory.getLogger("SettingsRepository");

interface StoredSettings {
  version: string;
  settings: Record<string, unknown>;
  pdfViewStates: Record<string, PdfViewState>;
  searchHistory: SearchCriteria[];
  chatSessions: ChatSession[];
  uiSettings: UISettings;
}

/**
 * Settings repository implementation using local file storage
 */
export class SettingsRepository implements ISettingsRepository {
  private readonly fileSystem: SecureFileSystem;
  private readonly dataFilePath: string;
  private cache: StoredSettings | null = null;
  private readonly CURRENT_VERSION = "1.0.0";
  private readonly MAX_SEARCH_HISTORY = 50;
  private readonly MAX_CHAT_SESSIONS = 50;

  constructor(fileSystem: SecureFileSystem) {
    this.fileSystem = fileSystem;
    const appDataPath = path.join(os.homedir(), "ArxivDesktop");
    this.dataFilePath = path.join(appDataPath, "settings-data.json");
    logger.info("SettingsRepository initialized", {
      dataFilePath: this.dataFilePath,
    });
  }

  /**
   * Get all settings
   */
  public async getAll(): Promise<Result<Record<string, unknown>>> {
    logger.debug("getAll called");

    try {
      const data = await this.loadData();
      return success(data.settings);
    } catch (error) {
      logger.error("getAll failed", error as Error);
      return failure(new StorageError("Failed to get all settings", { error }));
    }
  }

  /**
   * Get a specific setting
   */
  public async get<T>(key: string): Promise<Result<T | null>> {
    logger.debug("get called", { key });

    try {
      const data = await this.loadData();
      const value = data.settings[key];
      return success(value !== undefined ? (value as T) : null);
    } catch (error) {
      logger.error("get failed", error as Error, { key });
      return failure(new StorageError("Failed to get setting", { key, error }));
    }
  }

  /**
   * Save a setting
   */
  public async set<T>(key: string, value: T): Promise<Result<void>> {
    logger.debug("set called", { key });

    try {
      const data = await this.loadData();
      data.settings[key] = value;

      await this.saveData(data);
      this.cache = data;

      logger.info("Setting saved", { key });
      return success(undefined);
    } catch (error) {
      logger.error("set failed", error as Error, { key });
      return failure(
        new StorageError("Failed to save setting", { key, error })
      );
    }
  }

  /**
   * Delete a setting
   */
  public async delete(key: string): Promise<Result<void>> {
    logger.debug("delete called", { key });

    try {
      const data = await this.loadData();
      delete data.settings[key];

      await this.saveData(data);
      this.cache = data;

      logger.info("Setting deleted", { key });
      return success(undefined);
    } catch (error) {
      logger.error("delete failed", error as Error, { key });
      return failure(
        new StorageError("Failed to delete setting", { key, error })
      );
    }
  }

  /**
   * Clear all settings
   */
  public async clear(): Promise<Result<void>> {
    logger.debug("clear called");

    try {
      const emptyData = this.getDefaultData();
      await this.saveData(emptyData);
      this.cache = emptyData;

      logger.info("Settings repository cleared");
      return success(undefined);
    } catch (error) {
      logger.error("clear failed", error as Error);
      return failure(
        new StorageError("Failed to clear settings repository", { error })
      );
    }
  }

  /**
   * Get PDF view state for a paper
   */
  public async getPdfViewState(
    paperId: string
  ): Promise<Result<PdfViewState | null>> {
    logger.debug("getPdfViewState called", { paperId });

    try {
      const data = await this.loadData();
      const state = data.pdfViewStates[paperId];
      return success(state || null);
    } catch (error) {
      logger.error("getPdfViewState failed", error as Error, { paperId });
      return failure(
        new StorageError("Failed to get PDF view state", { paperId, error })
      );
    }
  }

  /**
   * Save PDF view state for a paper
   */
  public async savePdfViewState(
    paperId: string,
    state: PdfViewState
  ): Promise<Result<void>> {
    logger.debug("savePdfViewState called", { paperId });

    try {
      const data = await this.loadData();
      data.pdfViewStates[paperId] = state;

      await this.saveData(data);
      this.cache = data;

      logger.info("PDF view state saved", { paperId });
      return success(undefined);
    } catch (error) {
      logger.error("savePdfViewState failed", error as Error, { paperId });
      return failure(
        new StorageError("Failed to save PDF view state", { paperId, error })
      );
    }
  }

  /**
   * Get search history
   */
  public async getSearchHistory(): Promise<Result<SearchCriteria[]>> {
    logger.debug("getSearchHistory called");

    try {
      const data = await this.loadData();
      return success(data.searchHistory);
    } catch (error) {
      logger.error("getSearchHistory failed", error as Error);
      return failure(
        new StorageError("Failed to get search history", { error })
      );
    }
  }

  /**
   * Add to search history
   */
  public async addToSearchHistory(
    search: SearchCriteria
  ): Promise<Result<void>> {
    logger.debug("addToSearchHistory called");

    try {
      const data = await this.loadData();

      // Add to beginning and limit size
      data.searchHistory.unshift(search);
      data.searchHistory = data.searchHistory.slice(0, this.MAX_SEARCH_HISTORY);

      await this.saveData(data);
      this.cache = data;

      logger.info("Search added to history");
      return success(undefined);
    } catch (error) {
      logger.error("addToSearchHistory failed", error as Error);
      return failure(
        new StorageError("Failed to add to search history", { error })
      );
    }
  }

  /**
   * Clear search history
   */
  public async clearSearchHistory(): Promise<Result<void>> {
    logger.debug("clearSearchHistory called");

    try {
      const data = await this.loadData();
      data.searchHistory = [];

      await this.saveData(data);
      this.cache = data;

      logger.info("Search history cleared");
      return success(undefined);
    } catch (error) {
      logger.error("clearSearchHistory failed", error as Error);
      return failure(
        new StorageError("Failed to clear search history", { error })
      );
    }
  }

  /**
   * Get all chat sessions
   */
  public async getChatSessions(): Promise<Result<ChatSession[]>> {
    logger.debug("getChatSessions called");

    try {
      const data = await this.loadData();
      return success(data.chatSessions);
    } catch (error) {
      logger.error("getChatSessions failed", error as Error);
      return failure(
        new StorageError("Failed to get chat sessions", { error })
      );
    }
  }

  /**
   * Get a specific chat session
   */
  public async getChatSession(
    sessionId: string
  ): Promise<Result<ChatSession | null>> {
    logger.debug("getChatSession called", { sessionId });

    try {
      const data = await this.loadData();
      const session = data.chatSessions.find((s) => s.id === sessionId);
      return success(session || null);
    } catch (error) {
      logger.error("getChatSession failed", error as Error, { sessionId });
      return failure(
        new StorageError("Failed to get chat session", { sessionId, error })
      );
    }
  }

  /**
   * Save a chat session
   */
  public async saveChatSession(session: ChatSession): Promise<Result<void>> {
    logger.debug("saveChatSession called", { sessionId: session.id });

    try {
      const data = await this.loadData();

      // Find existing session index
      const existingIndex = data.chatSessions.findIndex(
        (s) => s.id === session.id
      );

      if (existingIndex !== -1) {
        // Update existing
        data.chatSessions[existingIndex] = session;
      } else {
        // Add new session
        data.chatSessions.unshift(session);
        // Limit total sessions
        data.chatSessions = data.chatSessions.slice(0, this.MAX_CHAT_SESSIONS);
      }

      await this.saveData(data);
      this.cache = data;

      logger.info("Chat session saved", { sessionId: session.id });
      return success(undefined);
    } catch (error) {
      logger.error("saveChatSession failed", error as Error, {
        sessionId: session.id,
      });
      return failure(
        new StorageError("Failed to save chat session", {
          sessionId: session.id,
          error,
        })
      );
    }
  }

  /**
   * Delete a chat session
   */
  public async deleteChatSession(sessionId: string): Promise<Result<void>> {
    logger.debug("deleteChatSession called", { sessionId });

    try {
      const data = await this.loadData();
      data.chatSessions = data.chatSessions.filter((s) => s.id !== sessionId);

      await this.saveData(data);
      this.cache = data;

      logger.info("Chat session deleted", { sessionId });
      return success(undefined);
    } catch (error) {
      logger.error("deleteChatSession failed", error as Error, { sessionId });
      return failure(
        new StorageError("Failed to delete chat session", { sessionId, error })
      );
    }
  }

  /**
   * Clear all chat sessions
   */
  public async clearChatSessions(): Promise<Result<void>> {
    logger.debug("clearChatSessions called");

    try {
      const data = await this.loadData();
      data.chatSessions = [];

      await this.saveData(data);
      this.cache = data;

      logger.info("Chat sessions cleared");
      return success(undefined);
    } catch (error) {
      logger.error("clearChatSessions failed", error as Error);
      return failure(
        new StorageError("Failed to clear chat sessions", { error })
      );
    }
  }

  /**
   * Get UI settings
   */
  public async getUISettings(): Promise<Result<UISettings>> {
    logger.debug("getUISettings called");

    try {
      const data = await this.loadData();
      return success(data.uiSettings);
    } catch (error) {
      logger.error("getUISettings failed", error as Error);
      return failure(new StorageError("Failed to get UI settings", { error }));
    }
  }

  /**
   * Save UI settings
   */
  public async saveUISettings(settings: UISettings): Promise<Result<void>> {
    logger.debug("saveUISettings called");

    try {
      const data = await this.loadData();
      data.uiSettings = { ...data.uiSettings, ...settings };

      await this.saveData(data);
      this.cache = data;

      logger.info("UI settings saved");
      return success(undefined);
    } catch (error) {
      logger.error("saveUISettings failed", error as Error);
      return failure(new StorageError("Failed to save UI settings", { error }));
    }
  }

  /**
   * Load data from file
   */
  private async loadData(): Promise<StoredSettings> {
    // Return cached data if available
    if (this.cache) {
      return this.cache;
    }

    logger.debug("Loading settings data from file", {
      path: this.dataFilePath,
    });

    try {
      // Ensure directory exists
      const dirPath = path.dirname(this.dataFilePath);
      await this.fileSystem.ensureDirectory(dirPath);

      // Check if file exists
      const exists = await this.fileSystem.fileExists(this.dataFilePath);
      if (!exists) {
        logger.debug("Settings data file not found, creating new");
        const defaultData = this.getDefaultData();
        await this.saveData(defaultData);
        return defaultData;
      }

      // Read and parse file
      const readResult = await this.fileSystem.readFile(this.dataFilePath);
      if (!readResult.success) {
        throw new Error(readResult.error.message);
      }

      const data: StoredSettings = JSON.parse(readResult.data);

      // Validate and migrate
      const validatedData = this.validateAndMigrate(data);

      this.cache = validatedData;
      logger.debug("Settings data loaded successfully");

      return validatedData;
    } catch (error) {
      logger.error(
        "Failed to load settings data, using defaults",
        error as Error
      );
      return this.getDefaultData();
    }
  }

  /**
   * Save data to file
   */
  private async saveData(data: StoredSettings): Promise<void> {
    logger.debug("Saving settings data to file", { path: this.dataFilePath });

    const jsonData = JSON.stringify(data, null, 2);
    const writeResult = await this.fileSystem.writeFile(
      this.dataFilePath,
      jsonData
    );

    if (!writeResult.success) {
      throw new Error(writeResult.error.message);
    }

    logger.debug("Settings data saved successfully");
  }

  /**
   * Get default data structure
   */
  private getDefaultData(): StoredSettings {
    return {
      version: this.CURRENT_VERSION,
      settings: {},
      pdfViewStates: {},
      searchHistory: [],
      chatSessions: [],
      uiSettings: {
        theme: "light",
      },
    };
  }

  /**
   * Validate and migrate data
   */
  private validateAndMigrate(data: any): StoredSettings {
    // Add version if missing
    if (!data.version) {
      data.version = this.CURRENT_VERSION;
    }

    // Ensure objects/arrays exist
    if (typeof data.settings !== "object") {
      data.settings = {};
    }
    if (typeof data.pdfViewStates !== "object") {
      data.pdfViewStates = {};
    }
    if (!Array.isArray(data.searchHistory)) {
      data.searchHistory = [];
    }
    if (!Array.isArray(data.chatSessions)) {
      data.chatSessions = [];
    }
    if (typeof data.uiSettings !== "object") {
      data.uiSettings = { theme: "light" };
    }

    // Limit array sizes
    data.searchHistory = data.searchHistory.slice(0, this.MAX_SEARCH_HISTORY);
    data.chatSessions = data.chatSessions.slice(0, this.MAX_CHAT_SESSIONS);

    return data as StoredSettings;
  }
}
