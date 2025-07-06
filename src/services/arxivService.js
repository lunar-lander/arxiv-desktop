import axios from 'axios';

const ARXIV_API_BASE = 'http://export.arxiv.org/api/query';
const BIORXIV_API_BASE = 'https://api.biorxiv.org';

// CORS proxy for development - in production, Electron handles CORS
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

export class ArxivService {
  static async searchPapers(query, start = 0, maxResults = 20, source = 'arxiv') {
    try {
      if (source === 'arxiv') {
        return await this.searchArxiv(query, start, maxResults);
      } else if (source === 'biorxiv') {
        return await this.searchBiorxiv(query, start, maxResults);
      }
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  static async searchPapersWithFilters(query, start = 0, maxResults = 20, source = 'arxiv', filters = {}) {
    try {
      if (source === 'arxiv') {
        return await this.searchArxivWithFilters(query, start, maxResults, filters);
      } else if (source === 'biorxiv') {
        return await this.searchBiorxivWithFilters(query, start, maxResults, filters);
      }
    } catch (error) {
      console.error('Search with filters failed:', error);
      throw error;
    }
  }

  static async searchArxiv(query, start, maxResults) {
    const params = new URLSearchParams({
      search_query: query,
      start,
      max_results: maxResults,
      sortBy: 'relevance',
      sortOrder: 'descending'
    });

    // Use CORS proxy if not in Electron environment
    const isElectron = window.navigator.userAgent.toLowerCase().indexOf('electron') > -1;
    const apiUrl = isElectron ? `${ARXIV_API_BASE}?${params}` : `${CORS_PROXY}${encodeURIComponent(`${ARXIV_API_BASE}?${params}`)}`;
    
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
      const categoryQuery = filters.categories.map(cat => `cat:${cat}`).join(' OR ');
      searchQuery += ` AND (${categoryQuery})`;
    }

    const params = new URLSearchParams({
      search_query: searchQuery,
      start,
      max_results: maxResults,
      sortBy: filters.sortBy || 'relevance',
      sortOrder: 'descending'
    });

    const isElectron = window.navigator.userAgent.toLowerCase().indexOf('electron') > -1;
    const apiUrl = isElectron ? `${ARXIV_API_BASE}?${params}` : `${CORS_PROXY}${encodeURIComponent(`${ARXIV_API_BASE}?${params}`)}`;
    
    const response = await axios.get(apiUrl);
    let results = this.parseArxivXML(response.data);

    // Apply date filters (arXiv API doesn't support date filtering directly)
    if (filters.dateFrom || filters.dateTo) {
      results.papers = results.papers.filter(paper => {
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
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await axios.get(`${BIORXIV_API_BASE}/details/biorxiv/${startDate}/${endDate}`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ArxivDesktop/1.0.0'
        }
      });
      
      // Filter results based on query
      const papers = response.data.collection || [];
      const filtered = papers.filter(paper => 
        paper.title?.toLowerCase().includes(query.toLowerCase()) ||
        paper.abstract?.toLowerCase().includes(query.toLowerCase()) ||
        paper.authors?.toLowerCase().includes(query.toLowerCase())
      );
      
      const paginatedPapers = filtered.slice(start, start + maxResults);

      return {
        papers: paginatedPapers.map(paper => ({
          id: paper.doi || `biorxiv_${paper.server}_${paper.article_id}`,
          title: paper.title,
          authors: paper.authors ? paper.authors.split(';').map(a => a.trim()) : [],
          abstract: paper.abstract,
          published: paper.date,
          updated: paper.date,
          source: 'biorxiv',
          url: `https://www.biorxiv.org/content/10.1101/${paper.server}.${paper.article_id}v${paper.version}`,
          pdfUrl: `https://www.biorxiv.org/content/10.1101/${paper.server}.${paper.article_id}v${paper.version}.full.pdf`,
          categories: paper.category ? [paper.category] : []
        })),
        totalResults: filtered.length
      };
    } catch (error) {
      console.error('BioRxiv search error:', error);
      throw new Error(`BioRxiv search failed: ${error.message}`);
    }
  }

  static async searchBiorxivWithFilters(query, start, maxResults, filters) {
    // BioRxiv filtering - simplified implementation
    const response = await axios.get(`${BIORXIV_API_BASE}/details/biorxiv/${new Date().getFullYear()}-01-01/${new Date().getFullYear()}-12-31`);
    
    let papers = response.data.collection || [];
    
    // Apply text filters
    papers = papers.filter(paper => {
      let matches = paper.title?.toLowerCase().includes(query.toLowerCase()) ||
                   paper.abstract?.toLowerCase().includes(query.toLowerCase());
      
      if (filters.author) {
        matches = matches && paper.authors?.toLowerCase().includes(filters.author.toLowerCase());
      }
      
      if (filters.title) {
        matches = matches && paper.title?.toLowerCase().includes(filters.title.toLowerCase());
      }
      
      return matches;
    });

    // Apply date filters
    if (filters.dateFrom || filters.dateTo) {
      papers = papers.filter(paper => {
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
      papers = papers.filter(paper => 
        filters.categories.some(category => 
          paper.category?.toLowerCase().includes(category.toLowerCase())
        )
      );
    }

    // Sort papers
    if (filters.sortBy === 'submittedDate' || filters.sortBy === 'lastUpdatedDate') {
      papers.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Pagination
    const paginatedPapers = papers.slice(start, start + maxResults);

    return {
      papers: paginatedPapers.map(paper => ({
        id: paper.doi || `biorxiv_${paper.server}_${paper.article_id}`,
        title: paper.title,
        authors: paper.authors ? paper.authors.split(';').map(a => a.trim()) : [],
        abstract: paper.abstract,
        published: paper.date,
        updated: paper.date,
        source: 'biorxiv',
        url: `https://www.biorxiv.org/content/10.1101/${paper.server}.${paper.article_id}v${paper.version}`,
        pdfUrl: `https://www.biorxiv.org/content/10.1101/${paper.server}.${paper.article_id}v${paper.version}.full.pdf`,
        categories: paper.category ? [paper.category] : []
      })),
      totalResults: papers.length
    };
  }

  static parseArxivXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    const entries = xmlDoc.getElementsByTagName('entry');
    const papers = [];

    for (let entry of entries) {
      const id = entry.getElementsByTagName('id')[0]?.textContent || '';
      const arxivId = id.split('/').pop();
      
      const title = entry.getElementsByTagName('title')[0]?.textContent?.trim() || '';
      const summary = entry.getElementsByTagName('summary')[0]?.textContent?.trim() || '';
      const published = entry.getElementsByTagName('published')[0]?.textContent || '';
      const updated = entry.getElementsByTagName('updated')[0]?.textContent || '';
      
      const authors = [];
      const authorElements = entry.getElementsByTagName('author');
      for (let author of authorElements) {
        const name = author.getElementsByTagName('name')[0]?.textContent;
        if (name) authors.push(name);
      }

      const categories = [];
      const categoryElements = entry.getElementsByTagName('category');
      for (let category of categoryElements) {
        const term = category.getAttribute('term');
        if (term) categories.push(term);
      }

      const links = entry.getElementsByTagName('link');
      let pdfUrl = '';
      for (let link of links) {
        if (link.getAttribute('type') === 'application/pdf') {
          pdfUrl = link.getAttribute('href');
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
        source: 'arxiv',
        url: id,
        pdfUrl: pdfUrl || id.replace('/abs/', '/pdf/') + '.pdf',
        categories
      });
    }

    return {
      papers,
      totalResults: papers.length
    };
  }

  static async downloadPaper(paper) {
    try {
      // For bioRxiv papers, try different PDF URL formats if the first one fails
      let pdfUrl = paper.pdfUrl;
      
      if (paper.source === 'biorxiv') {
        // bioRxiv PDFs might need different URL format
        // Try the direct PDF URL first, then fallback to alternative format
        const altPdfUrl = paper.pdfUrl.replace('.full.pdf', '.pdf');
        try {
          // Test if the URL is accessible
          const testResponse = await axios.head(pdfUrl);
          if (testResponse.status !== 200) {
            pdfUrl = altPdfUrl;
          }
        } catch (headError) {
          console.log('Trying alternative bioRxiv PDF URL format');
          pdfUrl = altPdfUrl;
        }
      }

      const response = await axios.get(pdfUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/pdf,*/*'
        },
        timeout: 30000 // 30 second timeout
      });

      const appDataPath = await window.electronAPI.getAppDataPath();
      const papersDir = `${appDataPath}/papers`;
      await window.electronAPI.ensureDirectory(papersDir);

      const filename = `${paper.id.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const filepath = `${papersDir}/${filename}`;

      // Convert ArrayBuffer to Uint8Array for Electron
      const uint8Array = new Uint8Array(response.data);
      await window.electronAPI.writeFile(filepath, uint8Array);

      return {
        success: true,
        localPath: filepath,
        filename
      };
    } catch (error) {
      console.error('Download failed:', error);
      
      // For bioRxiv, if download fails, try to open in browser instead
      if (paper.source === 'biorxiv') {
        console.log('Falling back to browser view for bioRxiv paper');
        return {
          success: false,
          error: 'bioRxiv PDF download failed - opening in browser',
          fallbackToBrowser: true
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}