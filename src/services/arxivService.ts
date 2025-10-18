import axios, { AxiosError } from "axios";
import type { Paper, SearchResult, SearchFilters } from "../types";

const ARXIV_API_BASE = "http://export.arxiv.org/api/query";
const BIORXIV_API_BASE = "https://api.biorxiv.org";
const CORS_PROXY = "https://api.allorigins.win/raw?url=";

export type Source = "arxiv" | "biorxiv";

const isElectron = (): boolean => {
  return window.navigator.userAgent.toLowerCase().indexOf("electron") > -1;
};

export class ArxivService {
  static async searchPapers(
    query: string,
    start: number = 0,
    maxResults: number = 20,
    source: Source = "arxiv"
  ): Promise<SearchResult> {
    if (!query?.trim()) {
      throw new Error("Query cannot be empty");
    }

    if (query.length > 1000) {
      throw new Error("Query too long. Maximum 1000 characters");
    }

    if (start < 0 || maxResults < 1 || maxResults > 100) {
      throw new Error("Invalid pagination parameters");
    }

    try {
      return source === "arxiv"
        ? await this.searchArxiv(query, start, maxResults)
        : await this.searchBiorxiv(query, start, maxResults);
    } catch (error) {
      const err = error as AxiosError;
      if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
        throw new Error(
          `Unable to connect to ${source}. Check your internet connection.`
        );
      }
      if (err.response?.status === 429) {
        throw new Error(
          `${source} rate limit exceeded. Please wait and try again.`
        );
      }
      if (err.response?.status && err.response.status >= 500) {
        throw new Error(`${source} server error. Please try again later.`);
      }
      throw error;
    }
  }

  static async searchPapersWithFilters(
    query: string,
    start: number = 0,
    maxResults: number = 20,
    source: Source = "arxiv",
    filters: SearchFilters = {}
  ): Promise<SearchResult> {
    return source === "arxiv"
      ? await this.searchArxivWithFilters(query, start, maxResults, filters)
      : await this.searchBiorxivWithFilters(query, start, maxResults, filters);
  }

  private static async searchArxiv(
    query: string,
    start: number,
    maxResults: number
  ): Promise<SearchResult> {
    const params = new URLSearchParams({
      search_query: query,
      start: start.toString(),
      max_results: maxResults.toString(),
      sortBy: "relevance",
      sortOrder: "descending",
    });

    const apiUrl = isElectron()
      ? `${ARXIV_API_BASE}?${params}`
      : `${CORS_PROXY}${encodeURIComponent(`${ARXIV_API_BASE}?${params}`)}`;

    const response = await axios.get(apiUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "ArxivDesktop/1.0.0",
        Accept: "application/atom+xml, text/xml, application/xml",
      },
    });

    if (!response.data) {
      throw new Error("Empty response from arXiv API");
    }

    return this.parseArxivXML(response.data);
  }

  private static async searchArxivWithFilters(
    query: string,
    start: number,
    maxResults: number,
    filters: SearchFilters
  ): Promise<SearchResult> {
    let searchQuery = query;

    if (filters.author) {
      searchQuery += ` AND au:"${filters.author}"`;
    }
    if (filters.title) {
      searchQuery += ` AND ti:"${filters.title}"`;
    }
    if (filters.categories && filters.categories.length > 0) {
      const categoryQuery = filters.categories
        .map((cat) => `cat:${cat}`)
        .join(" OR ");
      searchQuery += ` AND (${categoryQuery})`;
    }

    const params = new URLSearchParams({
      search_query: searchQuery,
      start: start.toString(),
      max_results: maxResults.toString(),
      sortBy: filters.sortBy || "relevance",
      sortOrder: "descending",
    });

    const apiUrl = isElectron()
      ? `${ARXIV_API_BASE}?${params}`
      : `${CORS_PROXY}${encodeURIComponent(`${ARXIV_API_BASE}?${params}`)}`;

    const response = await axios.get(apiUrl);
    const results = this.parseArxivXML(response.data);

    // Apply date filters
    if (filters.dateFrom || filters.dateTo) {
      results.papers = results.papers.filter((paper) => {
        const paperDate = new Date(paper.published || "");
        const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

        if (fromDate && paperDate < fromDate) return false;
        if (toDate && paperDate > toDate) return false;
        return true;
      });
    }

    return results;
  }

  private static async searchBiorxiv(
    query: string,
    start: number,
    maxResults: number
  ): Promise<SearchResult> {
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const response = await axios.get(
      `${BIORXIV_API_BASE}/details/biorxiv/${startDate}/${endDate}`,
      {
        timeout: 10000,
        headers: {
          Accept: "application/json",
          "User-Agent": "ArxivDesktop/1.0.0",
        },
      }
    );

    const papers: any[] = response.data.collection || [];
    const filtered = papers.filter(
      (paper) =>
        paper.title?.toLowerCase().includes(query.toLowerCase()) ||
        paper.abstract?.toLowerCase().includes(query.toLowerCase()) ||
        paper.authors?.toLowerCase().includes(query.toLowerCase())
    );

    const paginatedPapers = filtered.slice(start, start + maxResults);

    return {
      papers: paginatedPapers.map((paper): Paper => {
        const doi = paper.doi;
        const articleId = doi
          ? doi.split("/")[1]
          : `${paper.server || "biorxiv"}.${Date.now()}`;
        const version = paper.version || "1";

        return {
          id: doi,
          title: paper.title,
          authors: paper.authors
            ? paper.authors.split(";").map((a: string) => a.trim())
            : [],
          abstract: paper.abstract,
          published: paper.date,
          updated: paper.date,
          source: "biorxiv",
          url: `https://www.biorxiv.org/content/10.1101/${articleId}v${version}`,
          pdfUrl: `https://www.biorxiv.org/content/10.1101/${articleId}v${version}.full.pdf`,
          categories: paper.category ? [paper.category] : [],
        };
      }),
      totalResults: filtered.length,
    };
  }

  private static async searchBiorxivWithFilters(
    query: string,
    start: number,
    maxResults: number,
    filters: SearchFilters
  ): Promise<SearchResult> {
    const response = await axios.get(
      `${BIORXIV_API_BASE}/details/biorxiv/${new Date().getFullYear()}-01-01/${new Date().getFullYear()}-12-31`
    );

    let papers: any[] = response.data.collection || [];

    // Apply text filters
    papers = papers.filter((paper) => {
      let matches =
        paper.title?.toLowerCase().includes(query.toLowerCase()) ||
        paper.abstract?.toLowerCase().includes(query.toLowerCase());

      if (filters.author) {
        matches =
          matches &&
          paper.authors?.toLowerCase().includes(filters.author.toLowerCase());
      }
      if (filters.title) {
        matches =
          matches &&
          paper.title?.toLowerCase().includes(filters.title.toLowerCase());
      }

      return matches;
    });

    // Apply date filters
    if (filters.dateFrom || filters.dateTo) {
      papers = papers.filter((paper) => {
        const paperDate = new Date(paper.date);
        const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

        if (fromDate && paperDate < fromDate) return false;
        if (toDate && paperDate > toDate) return false;
        return true;
      });
    }

    // Apply category filters
    if (filters.categories && filters.categories.length > 0) {
      papers = papers.filter((paper) =>
        filters.categories!.some((category) =>
          paper.category?.toLowerCase().includes(category.toLowerCase())
        )
      );
    }

    // Sort papers
    if (
      filters.sortBy === "submittedDate" ||
      filters.sortBy === "lastUpdatedDate"
    ) {
      papers.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }

    const paginatedPapers = papers.slice(start, start + maxResults);

    return {
      papers: paginatedPapers.map((paper): Paper => {
        const doi = paper.doi;
        const articleId = doi
          ? doi.split("/")[1]
          : `${paper.server || "biorxiv"}.${Date.now()}`;
        const version = paper.version || "1";

        return {
          id: doi,
          title: paper.title,
          authors: paper.authors
            ? paper.authors.split(";").map((a: string) => a.trim())
            : [],
          abstract: paper.abstract,
          published: paper.date,
          updated: paper.date,
          source: "biorxiv",
          url: `https://www.biorxiv.org/content/10.1101/${articleId}v${version}`,
          pdfUrl: `https://www.biorxiv.org/content/10.1101/${articleId}v${version}.full.pdf`,
          categories: paper.category ? [paper.category] : [],
        };
      }),
      totalResults: papers.length,
    };
  }

  private static parseArxivXML(xmlString: string): SearchResult {
    if (!xmlString || typeof xmlString !== "string") {
      throw new Error("Invalid XML response from arXiv");
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error("XML parsing failed: " + parseError.textContent);
    }

    const entries = xmlDoc.getElementsByTagName("entry");
    const papers: Paper[] = [];

    for (const entry of Array.from(entries)) {
      try {
        const id = entry.getElementsByTagName("id")[0]?.textContent || "";
        if (!id) continue;

        const arxivId = id.split("/").pop();
        if (!arxivId) continue;

        const title =
          entry.getElementsByTagName("title")[0]?.textContent?.trim() ||
          "Untitled";
        const summary =
          entry.getElementsByTagName("summary")[0]?.textContent?.trim() || "";
        const published =
          entry.getElementsByTagName("published")[0]?.textContent || "";
        const updated =
          entry.getElementsByTagName("updated")[0]?.textContent || published;

        const authors: string[] = [];
        const authorElements = entry.getElementsByTagName("author");
        for (const author of Array.from(authorElements)) {
          const name = author
            .getElementsByTagName("name")[0]
            ?.textContent?.trim();
          if (name) authors.push(name);
        }

        const categories: string[] = [];
        const categoryElements = entry.getElementsByTagName("category");
        for (const category of Array.from(categoryElements)) {
          const term = category.getAttribute("term");
          if (term) categories.push(term);
        }

        let pdfUrl = "";
        const links = entry.getElementsByTagName("link");
        for (const link of Array.from(links)) {
          if (link.getAttribute("type") === "application/pdf") {
            pdfUrl = link.getAttribute("href") || "";
            break;
          }
        }

        papers.push({
          id: arxivId,
          title,
          authors,
          abstract: summary,
          published,
          updated,
          source: "arxiv",
          url: id,
          pdfUrl: pdfUrl || id.replace("/abs/", "/pdf/") + ".pdf",
          categories,
          arxivId,
        });
      } catch (error) {
        console.warn("Failed to parse arXiv entry:", error);
        continue;
      }
    }

    return {
      papers,
      totalResults: papers.length,
    };
  }

  static async downloadPaper(
    paper: Paper
  ): Promise<{
    success: boolean;
    localPath?: string;
    filename?: string;
    error?: string;
  }> {
    try {
      const pdfUrl = paper.pdfUrl;
      const urlsToTry = [pdfUrl];

      if (paper.source === "biorxiv") {
        urlsToTry.push(pdfUrl.replace(".full.pdf", ".pdf"));
        urlsToTry.push(pdfUrl.replace(".full.pdf", ".full-text.pdf"));
      }

      for (const url of urlsToTry) {
        try {
          const response = await axios.get(url, {
            responseType: "arraybuffer",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Accept: "application/pdf,*/*",
            },
            timeout: 30000,
          });

          if (response.data && response.data.byteLength > 1000) {
            const appDataPath = await (
              window as any
            ).electronAPI.getAppDataPath();
            const papersDir = `${appDataPath}/papers`;
            await (window as any).electronAPI.ensureDirectory(papersDir);

            const filename = `${paper.id.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
            const filepath = `${papersDir}/${filename}`;

            const uint8Array = new Uint8Array(response.data);
            await (window as any).electronAPI.writeFile(filepath, uint8Array);

            return {
              success: true,
              localPath: filepath,
              filename,
            };
          }
        } catch (error) {
          continue;
        }
      }

      throw new Error("No valid PDF URLs found");
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
