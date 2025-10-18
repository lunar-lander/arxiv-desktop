// Core application types

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract?: string;
  summary?: string;
  published?: string;
  updated?: string;
  date?: string;
  source: "arxiv" | "biorxiv";
  url: string;
  pdfUrl: string;
  categories?: string[];
  doi?: string;
  arxivId?: string;
  localPath?: string;
}

export interface User {
  username: string;
  source: "arxiv" | "biorxiv";
  token?: string;
}

export interface PaperState {
  openPapers: Paper[];
  starredPapers: Paper[];
  currentUser: User | null;
}

export type PaperAction =
  | { type: "ADD_OPEN_PAPER"; payload: Paper }
  | { type: "REMOVE_OPEN_PAPER"; payload: string }
  | { type: "TOGGLE_STAR"; payload: Paper }
  | { type: "SET_USER"; payload: User | null }
  | { type: "LOAD_STATE"; payload: PaperState }
  | {
      type: "UPDATE_PAPER_LOCAL_PATH";
      payload: { paperId: string; localPath: string };
    }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_CURRENT_PAPER"; payload: Paper | null }
  | { type: "ADD_SEARCH"; payload: string };

export interface SearchFilters {
  author?: string;
  title?: string;
  categories?: string[];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "relevance" | "submittedDate" | "lastUpdatedDate";
}

export interface SearchResult {
  papers: Paper[];
  totalResults: number;
}

export type ViewType = "home" | "paper";
