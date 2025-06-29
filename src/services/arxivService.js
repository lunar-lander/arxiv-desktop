import axios from 'axios';

const ARXIV_API_BASE = 'http://export.arxiv.org/api/query';
const BIORXIV_API_BASE = 'https://api.biorxiv.org';

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

  static async searchArxiv(query, start, maxResults) {
    const params = new URLSearchParams({
      search_query: query,
      start,
      max_results: maxResults,
      sortBy: 'relevance',
      sortOrder: 'descending'
    });

    const response = await axios.get(`${ARXIV_API_BASE}?${params}`);
    return this.parseArxivXML(response.data);
  }

  static async searchBiorxiv(query, start, maxResults) {
    // BioRxiv API search - simplified for now
    const response = await axios.get(`${BIORXIV_API_BASE}/details/biorxiv/${new Date().getFullYear()}-01-01/${new Date().getFullYear()}-12-31`);
    
    // Filter results based on query
    const papers = response.data.collection || [];
    const filtered = papers.filter(paper => 
      paper.title?.toLowerCase().includes(query.toLowerCase()) ||
      paper.abstract?.toLowerCase().includes(query.toLowerCase())
    ).slice(start, start + maxResults);

    return {
      papers: filtered.map(paper => ({
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
      const response = await axios.get(paper.pdfUrl, {
        responseType: 'arraybuffer'
      });

      const appDataPath = await window.electronAPI.getAppDataPath();
      const papersDir = `${appDataPath}/papers`;
      await window.electronAPI.ensureDirectory(papersDir);

      const filename = `${paper.id.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const filepath = `${papersDir}/${filename}`;

      await window.electronAPI.writeFile(filepath, Buffer.from(response.data));

      return {
        success: true,
        localPath: filepath,
        filename
      };
    } catch (error) {
      console.error('Download failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}