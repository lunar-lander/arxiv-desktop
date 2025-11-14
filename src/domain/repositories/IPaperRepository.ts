/**
 * Paper Repository Interface
 * Defines contract for paper data access
 */

import { Paper } from "../entities/Paper";
import { Result } from "../../shared/errors";

export interface SearchCriteria {
  query?: string;
  author?: string;
  title?: string;
  categories?: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Repository interface for paper persistence
 */
export interface IPaperRepository {
  /**
   * Find paper by ID
   */
  findById(id: string): Promise<Result<Paper | null>>;

  /**
   * Find all papers matching criteria
   */
  findAll(criteria?: SearchCriteria): Promise<Result<Paper[]>>;

  /**
   * Save a paper
   */
  save(paper: Paper): Promise<Result<Paper>>;

  /**
   * Save multiple papers
   */
  saveMany(papers: Paper[]): Promise<Result<Paper[]>>;

  /**
   * Delete a paper
   */
  delete(id: string): Promise<Result<void>>;

  /**
   * Check if paper exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Get all starred papers
   */
  findStarred(): Promise<Result<Paper[]>>;

  /**
   * Add paper to starred list
   */
  star(paper: Paper): Promise<Result<void>>;

  /**
   * Remove paper from starred list
   */
  unstar(paperId: string): Promise<Result<void>>;

  /**
   * Check if paper is starred
   */
  isStarred(paperId: string): Promise<boolean>;

  /**
   * Get all open papers
   */
  findOpen(): Promise<Result<Paper[]>>;

  /**
   * Add paper to open list
   */
  addToOpen(paper: Paper): Promise<Result<void>>;

  /**
   * Remove paper from open list
   */
  removeFromOpen(paperId: string): Promise<Result<void>>;

  /**
   * Update paper's local path
   */
  updateLocalPath(paperId: string, localPath: string): Promise<Result<void>>;

  /**
   * Find papers by local availability
   */
  findDownloaded(): Promise<Result<Paper[]>>;

  /**
   * Clear all cached data
   */
  clear(): Promise<Result<void>>;
}
