import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Star, ExternalLink } from 'lucide-react';
import { ArxivService } from '../services/arxivService';
import { usePapers } from '../context/PaperContext';
import SearchFilters from './SearchFilters';
import styles from './HomePage.module.css';


function HomePage({ onPaperOpen, searchResults, onSearchResults, lastSearchQuery, onSearchQuery }) {
  const [searchQuery, setSearchQuery] = useState(lastSearchQuery || '');
  const [selectedSource, setSelectedSource] = useState('arxiv');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [currentSearchParams, setCurrentSearchParams] = useState(null);
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
  const resultsContainerRef = useRef(null);

  // Add scroll listener for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!resultsContainerRef.current || isLoadingMore || !hasMoreResults) return;

      const { scrollTop, scrollHeight, clientHeight } = resultsContainerRef.current;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
      
      // Load more when scrolled to 90% of the container
      if (scrollPercentage > 0.9 && currentSearchParams) {
        handleLoadMore();
      }
    };

    const container = resultsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [isLoadingMore, hasMoreResults, currentSearchParams, searchResults.length]);

  const handleLoadMore = async () => {
    if (!currentSearchParams || isLoadingMore || !hasMoreResults) return;
    
    // Use current search parameters
    const originalQuery = searchQuery;
    const originalSource = selectedSource;
    const originalFilters = searchFilters;
    
    // Temporarily set the search parameters to the ones used for current results
    setSearchQuery(currentSearchParams.query);
    setSelectedSource(currentSearchParams.source);
    setSearchFilters(currentSearchParams.filters);
    
    await handleSearch(true);
    
    // Restore current UI state
    setSearchQuery(originalQuery);
    setSelectedSource(originalSource);
    setSearchFilters(originalFilters);
  };

  const handleSearch = async (append = false) => {
    if (!searchQuery.trim()) return;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setHasMoreResults(true);
    }
    
    try {
      const startIndex = append ? searchResults.length : 0;
      const results = await ArxivService.searchPapersWithFilters(
        searchQuery, 
        startIndex, 
        searchFilters.maxResults, 
        selectedSource,
        searchFilters
      );
      
      if (append) {
        onSearchResults([...searchResults, ...results.papers]);
      } else {
        onSearchResults(results.papers);
        onSearchQuery(searchQuery);
        setCurrentSearchParams({
          query: searchQuery,
          source: selectedSource,
          filters: searchFilters
        });
      }
      
      // Check if we have more results
      setHasMoreResults(results.papers.length === searchFilters.maxResults);
      
      if (!append) {
        dispatch({ 
          type: 'ADD_SEARCH', 
          payload: { 
            query: searchQuery, 
            source: selectedSource, 
            filters: searchFilters,
            timestamp: Date.now() 
          } 
        });
      }
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handlePaperClick = async (paper) => {
    dispatch({ type: 'ADD_OPEN_PAPER', payload: paper });
    
    try {
      const downloadResult = await ArxivService.downloadPaper(paper);
      if (downloadResult.success) {
        const paperWithLocalPath = { ...paper, localPath: downloadResult.localPath };
        onPaperOpen(paperWithLocalPath);
      } else if (downloadResult.fallbackToBrowser && paper.source === 'biorxiv') {
        // For bioRxiv papers that can't be downloaded, open in browser
        alert('Opening bioRxiv paper in your default browser...');
        window.electronAPI.openExternal(paper.url);
      } else {
        // Try to open the PDF in viewer anyway with the remote URL
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
              onClick={() => {
                onSearchResults([]);
                onSearchQuery('');
              }}
            >
              Clear Results
            </button>
          </div>
          <div className={styles.resultsContainer} ref={resultsContainerRef}>
            {searchResults.map((paper) => (
            <div key={paper.id} className={styles.paperCard} onClick={() => handlePaperClick(paper)}>
              <h3 className={styles.paperTitle}>{paper.title}</h3>
              <p className={styles.paperAuthors}>
                {paper.authors.slice(0, 3).join(', ')}
                {paper.authors.length > 3 && ' et al.'}
              </p>
              <p className={styles.paperDate}>
                Published: {new Date(paper.published).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
                {paper.updated && paper.updated !== paper.published && (
                  <span className={styles.updateDate}>
                    • Updated: {new Date(paper.updated).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                )}
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
            
            {isLoadingMore && (
              <div className={styles.loadingMore}>
                Loading more papers...
              </div>
            )}
            
            {!hasMoreResults && searchResults.length > 0 && (
              <div className={styles.endOfResults}>
                No more results to load
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default HomePage;