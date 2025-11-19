/**
 * ArXiv API Client
 * Handles all communication with the arXiv API
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

const logger = LoggerFactory.getLogger("ArxivApiClient");

/**
 * ArXiv API client implementation
 */
export class ArxivApiClient implements IPaperApiClient {
  private readonly apiClient: AxiosInstance;
  private readonly baseUrl: string;
  private readonly corsProxy: string;
  private readonly timeout: number;
  private readonly maxResults: number;

  constructor() {
    const apiConfig = config.get<any>("api.arxiv");

    this.baseUrl = apiConfig.baseUrl;
    this.corsProxy = apiConfig.corsProxy;
    this.timeout = apiConfig.timeout;
    this.maxResults = apiConfig.maxResults;

    this.apiClient = axios.create({
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/xml",
      },
    });

    logger.info("ArxivApiClient initialized", {
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
      // Build search query
      const searchQuery = this.buildSearchQuery(criteria);
      const params = {
        search_query: searchQuery,
        start: criteria.offset || 0,
        max_results: criteria.limit || this.maxResults,
        sortBy: "submittedDate",
        sortOrder: "descending",
      };

      logger.debug("Fetching from arXiv API", { params });

      // Make API request (using CORS proxy for browser)
      const url = `${this.corsProxy}${encodeURIComponent(this.baseUrl)}`;
      const response = await this.apiClient.get(url, { params });

      // Parse XML response
      const papers = this.parseXmlResponse(response.data);

      logger.info("ArXiv search completed", {
        query: searchQuery,
        resultsCount: papers.length,
      });

      return success(papers);
    } catch (error) {
      return this.handleError(error, "search");
    }
  }

  /**
   * Get paper by ID
   */
  public async getPaperById(id: string): Promise<Result<Paper | null>> {
    logger.debug("getPaperById called", { id });

    try {
      const params = {
        id_list: id,
      };

      const url = `${this.corsProxy}${encodeURIComponent(this.baseUrl)}`;
      const response = await this.apiClient.get(url, { params });

      const papers = this.parseXmlResponse(response.data);

      if (papers.length === 0) {
        return success(null);
      }

      logger.info("ArXiv paper fetched", { id });
      return success(papers[0] || null);
    } catch (error) {
      return this.handleError(error, "getPaperById");
    }
  }

  /**
   * Build search query from criteria
   */
  private buildSearchQuery(criteria: SearchCriteria): string {
    const queryParts: string[] = [];

    // General query (searches all fields)
    if (criteria.query) {
      queryParts.push(`all:"${criteria.query}"`);
    }

    // Title search
    if (criteria.title) {
      queryParts.push(`ti:"${criteria.title}"`);
    }

    // Author search
    if (criteria.author) {
      queryParts.push(`au:"${criteria.author}"`);
    }

    // Category search
    if (criteria.categories && criteria.categories.length > 0) {
      const categoryQueries = criteria.categories.map((cat) => `cat:${cat}`);
      queryParts.push(`(${categoryQueries.join(" OR ")})`);
    }

    // Combine all parts with AND
    const query = queryParts.length > 0 ? queryParts.join(" AND ") : "all:*";

    return query;
  }

  /**
   * Parse XML response from arXiv API
   */
  private parseXmlResponse(xmlData: string): Paper[] {
    const papers: Paper[] = [];

    try {
      // Simple XML parsing (for production, use a proper XML parser like fast-xml-parser)
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, "text/xml");

      const entries = xmlDoc.getElementsByTagName("entry");

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        if (!entry) continue;

        try {
          const paper = this.parseEntry(entry);
          papers.push(paper);
        } catch (error) {
          logger.warn("Failed to parse entry", { error, index: i });
        }
      }

      logger.debug("Parsed XML response", { paperCount: papers.length });
    } catch (error) {
      logger.error("Failed to parse XML", error as Error);
      throw new ApiError("Failed to parse arXiv response", 500, { error });
    }

    return papers;
  }

  /**
   * Parse a single entry element
   */
  private parseEntry(entry: Element): Paper {
    // Extract ID
    const idElement = entry.getElementsByTagName("id")[0];
    const fullId = idElement?.textContent || "";
    const id = fullId.split("/").pop()?.replace("v", "") || "";

    // Extract title
    const titleElement = entry.getElementsByTagName("title")[0];
    const title = titleElement?.textContent?.trim().replace(/\s+/g, " ") || "";

    // Extract authors
    const authorElements = entry.getElementsByTagName("author");
    const authors = [];
    for (let i = 0; i < authorElements.length; i++) {
      const authorElement = authorElements[i];
      if (!authorElement) continue;

      const nameElement = authorElement.getElementsByTagName("name")[0];
      const name = nameElement?.textContent || "";
      if (name) {
        authors.push({ name });
      }
    }

    // Extract abstract
    const summaryElement = entry.getElementsByTagName("summary")[0];
    const abstract =
      summaryElement?.textContent?.trim().replace(/\s+/g, " ") || "";

    // Extract published date
    const publishedElement = entry.getElementsByTagName("published")[0];
    const publishedDate = publishedElement?.textContent || "";

    // Extract updated date
    const updatedElement = entry.getElementsByTagName("updated")[0];
    const updatedDate = updatedElement?.textContent;

    // Extract categories
    const categoryElements = entry.getElementsByTagName("category");
    const categories = [];
    for (let i = 0; i < categoryElements.length; i++) {
      const categoryElement = categoryElements[i];
      if (!categoryElement) continue;

      const term = categoryElement.getAttribute("term");
      if (term) {
        categories.push(term);
      }
    }

    // Extract PDF URL
    const linkElements = entry.getElementsByTagName("link");
    let pdfUrl = "";
    for (let i = 0; i < linkElements.length; i++) {
      const linkElement = linkElements[i];
      if (!linkElement) continue;
      const rel = linkElement.getAttribute("rel");
      const href = linkElement.getAttribute("href");
      if (rel === "related" && href?.includes("pdf")) {
        pdfUrl = href;
        break;
      }
    }

    // If no PDF link found, construct it from ID
    if (!pdfUrl && id) {
      pdfUrl = `https://arxiv.org/pdf/${id}.pdf`;
    }

    // Extract DOI
    const doiElement = entry.getElementsByTagName("arxiv:doi")[0];
    const doi = doiElement?.textContent;

    // Extract comments
    const commentElement = entry.getElementsByTagName("arxiv:comment")[0];
    const comments = commentElement?.textContent;

    // Extract journal reference
    const journalElement = entry.getElementsByTagName("arxiv:journal_ref")[0];
    const journalRef = journalElement?.textContent;

    return new Paper({
      id,
      title,
      authors,
      abstract,
      publishedDate,
      updatedDate,
      categories,
      pdfUrl,
      source: "arxiv",
      doi,
      comments,
      journalRef,
    });
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
          `ArXiv API error: ${error.response.statusText}`,
          error.response.status,
          {
            operation,
            data: error.response.data,
          }
        )
      );
    }

    return failure(
      new ApiError(`ArXiv API error: ${String(error)}`, 500, {
        operation,
        error,
      })
    );
  }
}
