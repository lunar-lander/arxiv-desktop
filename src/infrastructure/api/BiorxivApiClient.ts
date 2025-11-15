/**
 * BioRxiv API Client
 * Handles all communication with the bioRxiv API
 */

import axios, { AxiosInstance } from "axios";
import { Paper } from "../../domain/entities/Paper";
import { SearchCriteria } from "../../domain/repositories/IPaperRepository";
import {
  Result,
  success,
  failure,
  ApiError,
  TimeoutError,
  NetworkError,
} from "../../shared/errors";
import { LoggerFactory } from "../logging/Logger";
import { config } from "../../shared/config";
import { IPaperApiClient } from "./ApiClientFactory";

const logger = LoggerFactory.getLogger("BiorxivApiClient");

interface BiorxivPaper {
  doi: string;
  title: string;
  authors: string;
  author_corresponding: string;
  author_corresponding_institution: string;
  date: string;
  version: string;
  type: string;
  license: string;
  category: string;
  jatsxml: string;
  abstract: string;
  published: string;
  server: string;
}

interface BiorxivResponse {
  messages: Array<{
    status: string;
    count: string;
    total: string;
  }>;
  collection: BiorxivPaper[];
}

/**
 * BioRxiv API client implementation
 */
export class BiorxivApiClient implements IPaperApiClient {
  private readonly apiClient: AxiosInstance;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxResults: number;

  constructor() {
    const apiConfig = config.get<any>("api.biorxiv");

    this.baseUrl = apiConfig.baseUrl;
    this.timeout = apiConfig.timeout;
    this.maxResults = apiConfig.maxResults;

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });

    logger.info("BiorxivApiClient initialized", {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
    });
  }

  /**
   * Search papers with criteria
   */
  public async search(criteria: SearchCriteria): Promise<Result<Paper[]>> {
    logger.debug("search called", { criteria });

    try {
      // BioRxiv API uses date range searches
      const startDate = criteria.startDate || this.getDefaultStartDate();
      const endDate = criteria.endDate || this.getCurrentDate();

      const url = `/${startDate}/${endDate}`;

      logger.debug("Fetching from bioRxiv API", { url });

      const response = await this.apiClient.get<BiorxivResponse>(url);

      if (!response.data || !response.data.collection) {
        logger.warn("Empty response from bioRxiv");
        return success([]);
      }

      // Parse and filter papers
      let papers = response.data.collection.map((item) =>
        this.parsePaper(item)
      );

      // Apply client-side filters
      papers = this.applyFilters(papers, criteria);

      // Limit results
      const limit = criteria.limit || this.maxResults;
      const offset = criteria.offset || 0;
      papers = papers.slice(offset, offset + limit);

      logger.info("BioRxiv search completed", {
        startDate,
        endDate,
        resultsCount: papers.length,
      });

      return success(papers);
    } catch (error) {
      return this.handleError(error, "search");
    }
  }

  /**
   * Get paper by DOI
   */
  public async getPaperByDoi(doi: string): Promise<Result<Paper | null>> {
    logger.debug("getPaperByDoi called", { doi });

    try {
      const url = `/doi/${doi}`;
      const response = await this.apiClient.get<BiorxivResponse>(url);

      if (
        !response.data ||
        !response.data.collection ||
        response.data.collection.length === 0
      ) {
        return success(null);
      }

      const paper = this.parsePaper(response.data.collection[0]);

      logger.info("BioRxiv paper fetched", { doi });
      return success(paper);
    } catch (error) {
      return this.handleError(error, "getPaperByDoi");
    }
  }

  /**
   * Parse BioRxiv paper to domain Paper entity
   */
  private parsePaper(item: BiorxivPaper): Paper {
    // Parse authors (comma-separated string)
    const authorNames = item.authors
      .split(";")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    const authors = authorNames.map((name) => ({
      name,
      affiliation:
        name === item.author_corresponding
          ? item.author_corresponding_institution
          : undefined,
    }));

    // Extract ID from DOI
    const id = item.doi.replace("10.1101/", "");

    // Construct PDF URL
    const pdfUrl = `https://www.biorxiv.org/content/${item.doi}v${item.version}.full.pdf`;

    return new Paper({
      id,
      title: item.title,
      authors,
      abstract: item.abstract || "No abstract available",
      publishedDate: item.date,
      updatedDate: item.published || item.date,
      categories: [item.category],
      pdfUrl,
      source: "biorxiv",
      doi: item.doi,
      comments: item.type,
      journalRef: item.license,
    });
  }

  /**
   * Apply client-side filters to papers
   */
  private applyFilters(papers: Paper[], criteria: SearchCriteria): Paper[] {
    return papers.filter((paper) => {
      // Filter by query (search in title and abstract)
      if (criteria.query) {
        const query = criteria.query.toLowerCase();
        const titleMatch = paper.title.toLowerCase().includes(query);
        const abstractMatch = paper.abstract.toLowerCase().includes(query);
        if (!titleMatch && !abstractMatch) {
          return false;
        }
      }

      // Filter by author
      if (criteria.author) {
        const authorQuery = criteria.author.toLowerCase();
        const hasAuthor = paper.authors.some((author) =>
          author.name.toLowerCase().includes(authorQuery)
        );
        if (!hasAuthor) {
          return false;
        }
      }

      // Filter by title
      if (criteria.title) {
        const titleQuery = criteria.title.toLowerCase();
        if (!paper.title.toLowerCase().includes(titleQuery)) {
          return false;
        }
      }

      // Filter by categories
      if (criteria.categories && criteria.categories.length > 0) {
        const hasCategory = criteria.categories.some((cat) =>
          paper.categories.includes(cat)
        );
        if (!hasCategory) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get default start date (30 days ago)
   */
  private getDefaultStartDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return this.formatDate(date);
  }

  /**
   * Get current date
   */
  private getCurrentDate(): string {
    return this.formatDate(new Date());
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Handle errors from API calls
   */
  private handleError<T>(error: unknown, operation: string): Result<T> {
    logger.error(`${operation} failed`, error as Error);

    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return failure(new TimeoutError(operation, this.timeout));
      }

      if (!error.response) {
        return failure(
          new NetworkError("Network request failed - no response", {
            operation,
            error: error.message,
          })
        );
      }

      return failure(
        new ApiError(
          `BioRxiv API error: ${error.response.statusText}`,
          error.response.status,
          {
            operation,
            data: error.response.data,
          }
        )
      );
    }

    return failure(
      new ApiError(`BioRxiv API error: ${String(error)}`, 500, {
        operation,
        error,
      })
    );
  }
}
