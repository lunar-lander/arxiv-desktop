/**
 * API Client Factory
 * Provides unified interface for creating API clients based on paper source
 */

import { ArxivApiClient } from "./ArxivApiClient";
import { BiorxivApiClient } from "./BiorxivApiClient";
import { Paper } from "../../domain/entities/Paper";
import { SearchCriteria } from "../../domain/repositories/IPaperRepository";
import { Result } from "../../shared/errors";
import { LoggerFactory } from "../logging/Logger";

const logger = LoggerFactory.getLogger("ApiClientFactory");

/**
 * Common interface for all API clients
 */
export interface IPaperApiClient {
  /**
   * Search papers with criteria
   */
  search(criteria: SearchCriteria): Promise<Result<Paper[]>>;

  /**
   * Get paper by identifier (ID for arXiv, DOI for BioRxiv)
   */
  getPaperById?(id: string): Promise<Result<Paper | null>>;

  /**
   * Get paper by DOI
   */
  getPaperByDoi?(doi: string): Promise<Result<Paper | null>>;
}

/**
 * Paper source types
 */
export type PaperSource = "arxiv" | "biorxiv";

/**
 * Factory for creating API clients based on paper source
 */
export class ApiClientFactory {
  private static arxivClient: ArxivApiClient | null = null;
  private static biorxivClient: BiorxivApiClient | null = null;

  /**
   * Get API client for specific paper source
   */
  public static getClient(source: PaperSource): IPaperApiClient {
    logger.debug("getClient called", { source });

    switch (source) {
      case "arxiv":
        if (!this.arxivClient) {
          this.arxivClient = new ArxivApiClient();
          logger.info("ArXiv API client created");
        }
        return this.arxivClient;

      case "biorxiv":
        if (!this.biorxivClient) {
          this.biorxivClient = new BiorxivApiClient();
          logger.info("BioRxiv API client created");
        }
        return this.biorxivClient;

      default:
        const exhaustiveCheck: never = source;
        throw new Error(`Unknown paper source: ${exhaustiveCheck}`);
    }
  }

  /**
   * Get all available API clients
   */
  public static getAllClients(): IPaperApiClient[] {
    return [this.getClient("arxiv"), this.getClient("biorxiv")];
  }

  /**
   * Search across all sources
   */
  public static async searchAll(
    criteria: SearchCriteria
  ): Promise<Result<Paper[]>> {
    logger.debug("searchAll called", { criteria });

    const clients = this.getAllClients();
    const results = await Promise.allSettled(
      clients.map((client) => client.search(criteria))
    );

    const papers: Paper[] = [];
    const errors: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const source: PaperSource = i === 0 ? "arxiv" : "biorxiv";

      if (result.status === "fulfilled") {
        const searchResult = result.value;
        if (searchResult.success) {
          papers.push(...searchResult.data);
          logger.debug(`Search successful for ${source}`, {
            count: searchResult.data.length,
          });
        } else {
          errors.push(`${source}: ${searchResult.error.message}`);
          logger.warn(`Search failed for ${source}`, {
            error: searchResult.error.message,
          });
        }
      } else {
        errors.push(`${source}: ${result.reason}`);
        logger.error(`Search rejected for ${source}`, new Error(result.reason));
      }
    }

    if (papers.length === 0 && errors.length > 0) {
      logger.error("All searches failed", new Error(errors.join("; ")));
      return {
        success: false,
        error: {
          name: "SearchError",
          message: "All searches failed",
          code: "SEARCH_FAILED",
          statusCode: 500,
          details: { errors },
        },
      };
    }

    logger.info("Multi-source search completed", {
      totalResults: papers.length,
      errors: errors.length,
    });

    return {
      success: true,
      data: papers,
    };
  }

  /**
   * Clear all cached clients (useful for testing)
   */
  public static clearCache(): void {
    this.arxivClient = null;
    this.biorxivClient = null;
    logger.debug("API client cache cleared");
  }
}

/**
 * Helper function to get client by source
 */
export function getApiClient(source: PaperSource): IPaperApiClient {
  return ApiClientFactory.getClient(source);
}

/**
 * Helper function to search all sources
 */
export async function searchAllSources(
  criteria: SearchCriteria
): Promise<Result<Paper[]>> {
  return ApiClientFactory.searchAll(criteria);
}
