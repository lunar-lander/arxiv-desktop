import React, { useState } from 'react';
import { Search, FileText, Star, ExternalLink } from 'lucide-react';
import { ArxivService } from '../services/arxivService';
import { usePapers } from '../context/PaperContext';
import SearchFilters from './SearchFilters';
import styles from './HomePage.module.css';


function HomePage({ onPaperOpen }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('arxiv');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    author: '',
    title: '',
    dateFrom: '',
    dateTo: '',
    categories: [],
    sortBy: 'relevance',
    maxResults: 20
  });
  const { state, dispatch } = usePapers();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const results = await ArxivService.searchPapersWithFilters(
        searchQuery, 
        0, 
        searchFilters.maxResults, 
        selectedSource,
        searchFilters
      );
      setSearchResults(results.papers);
      dispatch({ 
        type: 'ADD_SEARCH', 
        payload: { 
          query: searchQuery, 
          source: selectedSource, 
          filters: searchFilters,
          timestamp: Date.now() 
        } 
      });
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaperClick = async (paper) => {
    dispatch({ type: 'ADD_OPEN_PAPER', payload: paper });
    
    try {
      const downloadResult = await ArxivService.downloadPaper(paper);
      if (downloadResult.success) {
        const paperWithLocalPath = { ...paper, localPath: downloadResult.localPath };
        onPaperOpen(paperWithLocalPath);
      } else {
        onPaperOpen(paper);
      }
    } catch (error) {
      console.error('Download failed:', error);
      onPaperOpen(paper);
    }
  };

  const handleBookmark = (paper, e) => {
    e.stopPropagation();
    dispatch({ type: 'ADD_BOOKMARK', payload: paper });
  };

  const handleStar = (paper, e) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_STAR', payload: paper });
  };

  const isStarred = (paperId) => {
    return state.starredPapers.some(p => p.id === paperId);
  };

  return (
    <div className={styles.homeContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>ArXiv Desktop</h1>
        <p className={styles.subtitle}>Search and explore academic papers from arXiv and bioRxiv</p>
      </div>

      <div className={styles.searchContainer}>
        <Search size={20} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search for papers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.sourceSelector}>
        <button
          className={`${styles.sourceButton} ${selectedSource === 'arxiv' ? styles.active : ''}`}
          onClick={() => setSelectedSource('arxiv')}
        >
          arXiv
        </button>
        <button
          className={`${styles.sourceButton} ${selectedSource === 'biorxiv' ? styles.active : ''}`}
          onClick={() => setSelectedSource('biorxiv')}
        >
          bioRxiv
        </button>
      </div>

      <button 
        className={styles.searchButton} 
        onClick={handleSearch} 
        disabled={isLoading || !searchQuery.trim()}
      >
        {isLoading ? 'Searching...' : 'Search'}
      </button>

      <SearchFilters
        filters={searchFilters}
        onFiltersChange={setSearchFilters}
        source={selectedSource}
      />

      {isLoading && (
        <div className={styles.loadingSpinner}>
          Searching for papers...
        </div>
      )}

      {searchResults.length > 0 && (
        <>
          <div className={styles.resultsHeader}>
            <h3 className={styles.resultsTitle}>
              Search Results ({searchResults.length})
            </h3>
            <button 
              className={styles.clearButton}
              onClick={() => setSearchResults([])}
            >
              Clear Results
            </button>
          </div>
          <div className={styles.resultsContainer}>
            {searchResults.map((paper) => (
            <div key={paper.id} className={styles.paperCard} onClick={() => handlePaperClick(paper)}>
              <h3 className={styles.paperTitle}>{paper.title}</h3>
              <p className={styles.paperAuthors}>
                {paper.authors.slice(0, 3).join(', ')}
                {paper.authors.length > 3 && ' et al.'}
              </p>
              <p className={styles.paperAbstract}>{paper.abstract}</p>
              <div className={styles.paperActions}>
                <button className={styles.actionButton} onClick={(e) => handleBookmark(paper, e)}>
                  <FileText size={16} />
                  Bookmark
                </button>
                <button className={styles.actionButton} onClick={(e) => handleStar(paper, e)}>
                  <Star size={16} fill={isStarred(paper.id) ? '#f39c12' : 'none'} />
                  {isStarred(paper.id) ? 'Starred' : 'Star'}
                </button>
                <button className={styles.actionButton} onClick={(e) => {
                  e.stopPropagation();
                  window.electronAPI.openExternal(paper.url);
                }}>
                  <ExternalLink size={16} />
                  View Online
                </button>
              </div>
            </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default HomePage;