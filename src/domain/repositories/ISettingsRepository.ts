/**
 * Settings Repository Interface
 * Defines contract for application settings persistence
 */

import { Result } from "../../shared/errors";
import { SearchCriteria } from "./IPaperRepository";

export interface PdfViewState {
  scale: number;
  currentPage: number;
  scrollPosition: number;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface UISettings {
  theme: string;
  sidebarWidth?: number;
  sidebarVisible?: boolean;
  chatSidebarWidth?: number;
  chatVisible?: boolean;
}

/**
 * Repository interface for application settings
 */
export interface ISettingsRepository {
  /**
   * Get all settings
   */
  getAll(): Promise<Result<Record<string, unknown>>>;

  /**
   * Get a specific setting
   */
  get<T>(key: string): Promise<Result<T | null>>;

  /**
   * Save a setting
   */
  set<T>(key: string, value: T): Promise<Result<void>>;

  /**
   * Delete a setting
   */
  delete(key: string): Promise<Result<void>>;

  /**
   * Clear all settings
   */
  clear(): Promise<Result<void>>;

  // PDF view states
  getPdfViewState(paperId: string): Promise<Result<PdfViewState | null>>;
  savePdfViewState(paperId: string, state: PdfViewState): Promise<Result<void>>;

  // Search history
  getSearchHistory(): Promise<Result<SearchCriteria[]>>;
  addToSearchHistory(search: SearchCriteria): Promise<Result<void>>;
  clearSearchHistory(): Promise<Result<void>>;

  // Chat sessions
  getChatSessions(): Promise<Result<ChatSession[]>>;
  getChatSession(sessionId: string): Promise<Result<ChatSession | null>>;
  saveChatSession(session: ChatSession): Promise<Result<void>>;
  deleteChatSession(sessionId: string): Promise<Result<void>>;
  clearChatSessions(): Promise<Result<void>>;

  // UI settings
  getUISettings(): Promise<Result<UISettings>>;
  saveUISettings(settings: UISettings): Promise<Result<void>>;
}
