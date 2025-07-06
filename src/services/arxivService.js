import axios from "axios";

const ARXIV_API_BASE = "http://export.arxiv.org/api/query";
const BIORXIV_API_BASE = "https://api.biorxiv.org";

// CORS proxy for development - in production, Electron handles CORS
const CORS_PROXY = "https://api.allorigins.win/raw?url=";

export class ArxivService {
  static async searchPapers(
    query,
    start = 0,
    maxResults = 20,
    source = "arxiv"
  ) {
    try {
      if (source === "arxiv") {
        return await this.searchArxiv(query, start, maxResults);
      } else if (source === "biorxiv") {
        return await this.searchBiorxiv(query, start, maxResults);
      }
    } catch (error) {
      console.error("Search failed:", error);
      throw error;
    }
  }

  static async searchPapersWithFilters(
    query,
    start = 0,
    maxResults = 20,
    source = "arxiv",
    filters = {}
  ) {
    try {
      if (source === "arxiv") {
        return await this.searchArxivWithFilters(
          query,
          start,
          maxResults,
          filters
        );
      } else if (source === "biorxiv") {
        return await this.searchBiorxivWithFilters(
          query,
          start,
          maxResults,
          filters
        );
      }
    } catch (error) {
      console.error("Search with filters failed:", error);
      throw error;
    }
  }

  static async searchArxiv(query, start, maxResults) {
    const params = new URLSearchParams({
      search_query: query,
      start,
      max_results: maxResults,
      sortBy: "relevance",
      sortOrder: "descending",
    });

    // Use CORS proxy if not in Electron environment
    const isElectron =
      window.navigator.userAgent.toLowerCase().indexOf("electron") > -1;
    const apiUrl = isElectron
      ? `${ARXIV_API_BASE}?${params}`
      : `${CORS_PROXY}${encodeURIComponent(`${ARXIV_API_BASE}?${params}`)}`;

    const response = await axios.get(apiUrl);
    return this.parseArxivXML(response.data);
  }

  static async searchArxivWithFilters(query, start, maxResults, filters) {
    let searchQuery = query;

    // Add author filter
    if (filters.author) {
      searchQuery += ` AND au:"${filters.author}"`;
    }

    // Add title filter
    if (filters.title) {
      searchQuery += ` AND ti:"${filters.title}"`;
    }

    // Add category filters
    if (filters.categories && filters.categories.length > 0) {
      const categoryQuery = filters.categories
        .map((cat) => `cat:${cat}`)
        .join(" OR ");
      searchQuery += ` AND (${categoryQuery})`;
    }

    const params = new URLSearchParams({
      search_query: searchQuery,
      start,
      max_results: maxResults,
      sortBy: filters.sortBy || "relevance",
      sortOrder: "descending",
    });

    const isElectron =
      window.navigator.userAgent.toLowerCase().indexOf("electron") > -1;
    const apiUrl = isElectron
      ? `${ARXIV_API_BASE}?${params}`
      : `${CORS_PROXY}${encodeURIComponent(`${ARXIV_API_BASE}?${params}`)}`;

    const response = await axios.get(apiUrl);
    let results = this.parseArxivXML(response.data);

    // Apply date filters (arXiv API doesn't support date filtering directly)
    if (filters.dateFrom || filters.dateTo) {
      results.papers = results.papers.filter((paper) => {
        const paperDate = new Date(paper.published);
        const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

        if (fromDate && paperDate < fromDate) return false;
        if (toDate && paperDate > toDate) return false;
        return true;
      });
    }

    return results;
  }

  static async searchBiorxiv(query, start, maxResults) {
    try {
      // Use a more recent date range for bioRxiv search
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

      // Filter results based on query
      const papers = response.data.collection || [];
      console.log("Sample bioRxiv paper data:", papers[0]); // Debug log
      const filtered = papers.filter(
        (paper) =>
          paper.title?.toLowerCase().includes(query.toLowerCase()) ||
          paper.abstract?.toLowerCase().includes(query.toLowerCase()) ||
          paper.authors?.toLowerCase().includes(query.toLowerCase())
      );

      const paginatedPapers = filtered.slice(start, start + maxResults);

      return {
        papers: paginatedPapers.map((paper, index) => {
          // Extract article ID from DOI (format: 10.1101/YYYY.MM.DD.XXXXXX)
          const doi = paper.doi;
          const articleId = doi ? doi.split('/')[1] : `${paper.server || 'biorxiv'}.${Date.now()}`;
          const version = paper.version || '1';
          const server = paper.server || 'biorxiv';
          
          console.log("URL components:", { server, articleId, version, doi }); // Debug log
          
          return {
            id: doi,
            title: paper.title,
            authors: paper.authors
              ? paper.authors.split(";").map((a) => a.trim())
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
    } catch (error) {
      console.error("BioRxiv search error:", error);
      throw new Error(`BioRxiv search failed: ${error.message}`);
    }
  }

  static async searchBiorxivWithFilters(query, start, maxResults, filters) {
    // BioRxiv filtering - simplified implementation
    const response = await axios.get(
      `${BIORXIV_API_BASE}/details/biorxiv/${new Date().getFullYear()}-01-01/${new Date().getFullYear()}-12-31`
    );

    let papers = response.data.collection || [];

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
        filters.categories.some((category) =>
          paper.category?.toLowerCase().includes(category.toLowerCase())
        )
      );
    }

    // Sort papers
    if (
      filters.sortBy === "submittedDate" ||
      filters.sortBy === "lastUpdatedDate"
    ) {
      papers.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Pagination
    const paginatedPapers = papers.slice(start, start + maxResults);

    return {
      papers: paginatedPapers.map((paper, index) => {
        // Extract article ID from DOI (format: 10.1101/YYYY.MM.DD.XXXXXX)
        const doi = paper.doi;
        const articleId = doi ? doi.split('/')[1] : `${paper.server || 'biorxiv'}.${Date.now()}`;
        const version = paper.version || '1';
        const server = paper.server || 'biorxiv';
        
        console.log("URL components (filters):", { server, articleId, version, doi }); // Debug log
        
        return {
          id: doi,
          title: paper.title,
          authors: paper.authors
            ? paper.authors.split(";").map((a) => a.trim())
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

  static parseArxivXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    const entries = xmlDoc.getElementsByTagName("entry");
    const papers = [];

    for (let entry of entries) {
      const id = entry.getElementsByTagName("id")[0]?.textContent || "";
      const arxivId = id.split("/").pop();

      const title =
        entry.getElementsByTagName("title")[0]?.textContent?.trim() || "";
      const summary =
        entry.getElementsByTagName("summary")[0]?.textContent?.trim() || "";
      const published =
        entry.getElementsByTagName("published")[0]?.textContent || "";
      const updated =
        entry.getElementsByTagName("updated")[0]?.textContent || "";

      const authors = [];
      const authorElements = entry.getElementsByTagName("author");
      for (let author of authorElements) {
        const name = author.getElementsByTagName("name")[0]?.textContent;
        if (name) authors.push(name);
      }

      const categories = [];
      const categoryElements = entry.getElementsByTagName("category");
      for (let category of categoryElements) {
        const term = category.getAttribute("term");
        if (term) categories.push(term);
      }

      const links = entry.getElementsByTagName("link");
      let pdfUrl = "";
      for (let link of links) {
        if (link.getAttribute("type") === "application/pdf") {
          pdfUrl = link.getAttribute("href");
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
      });
    }

    return {
      papers,
      totalResults: papers.length,
    };
  }

  static async downloadPaper(paper) {
    try {
      let pdfUrl = paper.pdfUrl;
      const urlsToTry = [pdfUrl];

      // For bioRxiv papers, add alternative URL formats to try
      if (paper.source === "biorxiv") {
        urlsToTry.push(pdfUrl.replace(".full.pdf", ".pdf"));
        urlsToTry.push(pdfUrl.replace(".full.pdf", ".full-text.pdf"));
      }

      let lastError = null;
      
      // Try each URL format until one works
      for (const url of urlsToTry) {
        try {
          console.log(`Attempting to download PDF from: ${url}`);
          
          const response = await axios.get(url, {
            responseType: "arraybuffer",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Accept: "application/pdf,*/*",
            },
            timeout: 30000, // 30 second timeout
          });

          // Check if we got a valid PDF response
          if (response.data && response.data.byteLength > 1000) {
            const appDataPath = await window.electronAPI.getAppDataPath();
            const papersDir = `${appDataPath}/papers`;
            await window.electronAPI.ensureDirectory(papersDir);

            const filename = `${paper.id.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
            const filepath = `${papersDir}/${filename}`;

            // Convert ArrayBuffer to Uint8Array for Electron
            const uint8Array = new Uint8Array(response.data);
            await window.electronAPI.writeFile(filepath, uint8Array);

            console.log(`Successfully downloaded PDF: ${filename}`);
            return {
              success: true,
              localPath: filepath,
              filename,
            };
          }
        } catch (urlError) {
          console.log(`Failed to download from ${url}:`, urlError.message);
          lastError = urlError;
          continue; // Try next URL
        }
      }

      // If all URLs failed, throw the last error
      throw lastError || new Error("No valid PDF URLs found");
      
    } catch (error) {
      console.error("Download failed for all attempted URLs:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
