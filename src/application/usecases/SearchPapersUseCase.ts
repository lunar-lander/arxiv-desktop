/**
 * Search Papers Use Case
 * Orchestrates paper search across multiple sources
 */

import { Paper } from "../../domain/entities/Paper";
import { SearchCriteria } from "../../domain/repositories/IPaperRepository";
import { IPaperRepository } from "../../domain/repositories/IPaperRepository";
import { Result, success, failure, AppError } from "../../shared/errors";
import { LoggerFactory } from "../../infrastructure/logging/Logger";
import { ApiClientFactory, PaperSource } from "../../infrastructure/api";

const logger = LoggerFactory.getLogger("SearchPapersUseCase");

export interface SearchPapersInput {
  criteria: SearchCriteria;
  sources?: PaperSource[]; // If not provided, search all sources
  saveToRepository?: boolean; // If true, save found papers to local repository
}

export interface SearchPapersOutput {
  papers: Paper[];
  totalCount: number;
  sources: PaperSource[];
}

/**
 * Use case for searching papers across multiple sources
 */
export class SearchPapersUseCase {
  constructor(private readonly paperRepository: IPaperRepository) {
    logger.info("SearchPapersUseCase initialized");
  }

  /**
   * Execute search operation
   */
  public async execute(
    input: SearchPapersInput
  ): Promise<Result<SearchPapersOutput>> {
    logger.debug("execute called", { input });

    try {
      const { criteria, sources, saveToRepository = false } = input;

      let papers: Paper[] = [];
      let usedSources: PaperSource[] = [];

      // If specific sources are requested, search only those
      if (sources && sources.length > 0) {
        for (const source of sources) {
          const sourceResult = await this.searchSource(source, criteria);
          if (sourceResult.success) {
            papers.push(...sourceResult.data);
            usedSources.push(source);
          } else {
            logger.warn(`Search failed for source: ${source}`, {
              error: sourceResult.error.message,
            });
          }
        }
      } else {
        // Search all sources
        const allSourcesResult = await ApiClientFactory.searchAll(criteria);
        if (allSourcesResult.success) {
          papers = allSourcesResult.data;
          usedSources = ["arxiv", "biorxiv"];
        } else {
          return allSourcesResult;
        }
      }

      // Remove duplicates based on DOI or ID
      papers = this.deduplicatePapers(papers);

      // Apply sorting if needed
      papers = this.sortPapers(papers, criteria);

      // Save to repository if requested
      if (saveToRepository && papers.length > 0) {
        await this.savePapersToRepository(papers);
      }

      logger.info("Search completed successfully", {
        totalResults: papers.length,
        sources: usedSources,
      });

      return success({
        papers,
        totalCount: papers.length,
        sources: usedSources,
      });
    } catch (error) {
      logger.error("execute failed", error as Error);
      return failure(
        new AppError("Search failed", "SEARCH_FAILED", 500, { error })
      );
    }
  }

  /**
   * Search a specific source
   */
  private async searchSource(
    source: PaperSource,
    criteria: SearchCriteria
  ): Promise<Result<Paper[]>> {
    logger.debug("searchSource called", { source, criteria });

    try {
      const client = ApiClientFactory.getClient(source);
      return await client.search(criteria);
    } catch (error) {
      logger.error(`searchSource failed for ${source}`, error as Error);
      return failure(
        new AppError(
          `Search failed for ${source}`,
          "SOURCE_SEARCH_FAILED",
          500,
          { source, error }
        )
      );
    }
  }

  /**
   * Remove duplicate papers based on DOI or ID
   */
  private deduplicatePapers(papers: Paper[]): Paper[] {
    const seen = new Set<string>();
    const uniquePapers: Paper[] = [];

    for (const paper of papers) {
      // Use DOI if available, otherwise use ID
      const identifier = paper.doi || paper.id;

      if (!seen.has(identifier)) {
        seen.add(identifier);
        uniquePapers.push(paper);
      } else {
        logger.debug("Duplicate paper filtered", { identifier });
      }
    }

    logger.debug("Deduplication completed", {
      original: papers.length,
      unique: uniquePapers.length,
    });

    return uniquePapers;
  }

  /**
   * Sort papers based on criteria
   */
  private sortPapers(papers: Paper[], criteria: SearchCriteria): Paper[] {
    // Default: sort by published date (newest first)
    return papers.sort((a, b) => {
      const dateA = new Date(a.publishedDate).getTime();
      const dateB = new Date(b.publishedDate).getTime();
      return dateB - dateA; // Descending order
    });
  }

  /**
   * Save papers to local repository
   */
  private async savePapersToRepository(papers: Paper[]): Promise<void> {
    logger.debug("Saving papers to repository", { count: papers.length });

    try {
      const saveResult = await this.paperRepository.saveMany(papers);
      if (saveResult.success) {
        logger.info("Papers saved to repository", { count: papers.length });
      } else {
        logger.warn("Failed to save papers to repository", {
          error: saveResult.error.message,
        });
      }
    } catch (error) {
      logger.error("savePapersToRepository failed", error as Error);
      // Don't throw - this is a non-critical operation
    }
  }
}
