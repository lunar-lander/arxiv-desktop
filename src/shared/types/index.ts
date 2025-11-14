/**
 * Shared TypeScript type definitions for the ArXiv Desktop application
 */

// ============================================================================
// Domain Types
// ============================================================================

/**
 * Represents an academic paper from arXiv or bioRxiv
 */
export interface Paper {
  id: string;
  title: string;
  authors: Author[];
  abstract: string;
  publishedDate: string;
  updatedDate?: string;
  categories: string[];
  pdfUrl: string;
  source: PaperSource;
  doi?: string;
  comments?: string;
  journalRef?: string;
}

/**
 * Author information
 */
export interface Author {
  name: string;
  affiliation?: string;
}

/**
 * Paper source (arXiv or bioRxiv)
 */
export type PaperSource = "arxiv" | "biorxiv";

/**
 * User information
 */
export interface User {
  username: string;
  email?: string;
  authenticated: boolean;
  source?: PaperSource;
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * Search filters for paper queries
 */
export interface SearchFilters {
  author?: string;
  title?: string;
  abstract?: string;
  categories?: string[];
  startDate?: string;
  endDate?: string;
}

/**
 * Search query with metadata
 */
export interface SearchQuery {
  query: string;
  source: PaperSource;
  filters?: SearchFilters;
  timestamp?: number;
}

/**
 * Sort options for search results
 */
export type SortType = "relevance" | "date" | "citations";

// ============================================================================
// Application State Types
// ============================================================================

/**
 * Application state managed by PaperContext
 */
export interface AppState {
  openPapers: Paper[];
  bookmarkedPapers: Paper[];
  starredPapers: Paper[];
  user: User | null;
  searchHistory: SearchQuery[];
  currentView: ViewType;
}

/**
 * View types for navigation
 */
export type ViewType = "home" | "bookmarks" | "starred" | "settings";

/**
 * Action types for state reducer
 */
export type ActionType =
  | "ADD_OPEN_PAPER"
  | "REMOVE_OPEN_PAPER"
  | "TOGGLE_BOOKMARK"
  | "TOGGLE_STAR"
  | "SET_USER"
  | "LOGOUT"
  | "SET_CURRENT_VIEW"
  | "ADD_SEARCH_HISTORY"
  | "LOAD_STATE";

/**
 * State action
 */
export interface StateAction {
  type: ActionType;
  payload?: unknown;
}

// ============================================================================
// PDF Viewer Types
// ============================================================================

/**
 * PDF view state
 */
export interface PdfViewState {
  scale: number;
  currentPage: number;
  scrollPosition: number;
}

/**
 * PDF view states by paper ID
 */
export interface PdfViewStates {
  [paperId: string]: PdfViewState;
}

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Stored application data
 */
export interface StorageData {
  openPapers: Paper[];
  bookmarkedPapers: Paper[];
  starredPapers: Paper[];
  user: User | null;
  searchHistory: SearchQuery[];
  pdfViewStates: PdfViewStates;
}

/**
 * Download options for papers
 */
export interface DownloadOptions {
  force?: boolean;
}

/**
 * Download result
 */
export interface DownloadResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

// ============================================================================
// Citation Types
// ============================================================================

/**
 * Citation formats
 */
export type CitationFormat =
  | "apa"
  | "mla"
  | "chicago"
  | "bibtex"
  | "ris"
  | "endnote";

// ============================================================================
// Theme Types
// ============================================================================

/**
 * Available theme names
 */
export type ThemeName =
  | "light"
  | "dark"
  | "cyberpunk"
  | "brogrammer"
  | "bearded"
  | "neon"
  | "forest"
  | "ocean"
  | "sunset"
  | "midnight"
  | "matrix"
  | "vampire"
  | "synthwave"
  | "terminal"
  | "arctic"
  | "autumn"
  | "cherry"
  | "galaxy"
  | "vintage"
  | "monochrome"
  | "pastel"
  | "coffee"
  | "lavender"
  | "emerald"
  | "ruby"
  | "copper"
  | "slate"
  | "coral"
  | "ninja"
  | "royal";

/**
 * Theme context value
 */
export interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  cycleTheme: () => void;
}

// ============================================================================
// Electron IPC Types
// ============================================================================

/**
 * Electron API exposed via preload script
 */
export interface ElectronAPI {
  // File operations
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, data: string) => Promise<FileOperationResult>;
  fileExists: (filePath: string) => Promise<boolean>;
  ensureDir: (dirPath: string) => Promise<void>;

  // Dialog operations
  showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>;
  showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogResult>;

  // Application operations
  getAppPath: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;

  // Download operations
  downloadFile: (url: string, savePath: string) => Promise<DownloadFileResult>;
}

/**
 * File operation result
 */
export interface FileOperationResult {
  success: boolean;
  error?: string;
}

/**
 * Save dialog options
 */
export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
}

/**
 * Save dialog result
 */
export interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

/**
 * Open dialog options
 */
export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
  properties?: Array<
    "openFile" | "openDirectory" | "multiSelections" | "showHiddenFiles"
  >;
}

/**
 * Open dialog result
 */
export interface OpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

/**
 * File filter for dialogs
 */
export interface FileFilter {
  name: string;
  extensions: string[];
}

/**
 * Download file result
 */
export interface DownloadFileResult {
  success: boolean;
  path?: string;
  error?: string;
}

// ============================================================================
// Window Types
// ============================================================================

/**
 * Extended Window interface with Electron API
 */
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for HomePage component
 */
export interface HomePageProps {
  onPaperOpen: (paper: Paper) => void;
  searchResults: Paper[];
  onSearchResults: (results: Paper[]) => void;
  lastSearchQuery: SearchQuery | null;
  onSearchQuery: (query: SearchQuery) => void;
}

/**
 * Props for PaperViewer component
 */
export interface PaperViewerProps {
  paper: Paper;
}

/**
 * Props for Sidebar component
 */
export interface SidebarProps {
  onNavigate: (view: ViewType) => void;
  onPaperSelect: (paper: Paper) => void;
  currentView: ViewType;
  onToggleSidebar: () => void;
}

/**
 * Props for SearchFilters component
 */
export interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  source: PaperSource;
}

/**
 * Props for CitationModal component
 */
export interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  paper: Paper;
}

/**
 * Props for LoginModal component
 */
export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

/**
 * Props for ThemeToggle component
 */
export interface ThemeToggleProps {
  className?: string;
}

/**
 * Props for MathJaxRenderer component
 */
export interface MathJaxRendererProps {
  children: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Application error
 */
export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Result type for operations that can fail
 */
export type Result<T> = SuccessResult<T> | ErrorResult;

export interface SuccessResult<T> {
  success: true;
  data: T;
}

export interface ErrorResult {
  success: false;
  error: AppError;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;
