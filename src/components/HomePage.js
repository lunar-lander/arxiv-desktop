import React, { useState } from 'react';
import styled from 'styled-components';
import { Search, FileText, Star, ExternalLink } from 'lucide-react';
import { ArxivService } from '../services/arxivService';
import { usePapers } from '../context/PaperContext';
import SearchFilters from './SearchFilters';

const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 2rem;
  overflow-y: auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: #7f8c8d;
  font-size: 1.1rem;
`;

const SearchContainer = styled.div`
  max-width: 600px;
  margin: 0 auto 2rem;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  font-size: 1.1rem;
  border: 2px solid #e0e6ed;
  border-radius: 10px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #3498db;
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #7f8c8d;
`;

const SourceSelector = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
`;

const SourceButton = styled.button`
  padding: 0.5rem 1rem;
  border: 2px solid ${props => props.active ? '#3498db' : '#e0e6ed'};
  background: ${props => props.active ? '#3498db' : 'white'};
  color: ${props => props.active ? 'white' : '#2c3e50'};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3498db;
  }
`;

const SearchButton = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  margin: 1rem auto;
  display: block;
  transition: background 0.2s;

  &:hover {
    background: #2980b9;
  }

  &:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }
`;

const ResultsContainer = styled.div`
  margin-top: 2rem;
`;

const PaperCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  border: 1px solid #e0e6ed;
  transition: box-shadow 0.2s;
  cursor: pointer;

  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
`;

const PaperTitle = styled.h3`
  color: #2c3e50;
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
`;

const PaperAuthors = styled.p`
  color: #7f8c8d;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const PaperAbstract = styled.p`
  color: #5a6c7d;
  line-height: 1.5;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PaperActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #e0e6ed;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:hover {
    background: #f8f9fa;
  }
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
`;

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
    <HomeContainer>
      <Header>
        <Title>ArXiv Desktop</Title>
        <Subtitle>Search and explore academic papers from arXiv and bioRxiv</Subtitle>
      </Header>

      <SearchContainer>
        <SearchIcon size={20} />
        <SearchInput
          type="text"
          placeholder="Search for papers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
      </SearchContainer>

      <SourceSelector>
        <SourceButton
          active={selectedSource === 'arxiv'}
          onClick={() => setSelectedSource('arxiv')}
        >
          arXiv
        </SourceButton>
        <SourceButton
          active={selectedSource === 'biorxiv'}
          onClick={() => setSelectedSource('biorxiv')}
        >
          bioRxiv
        </SourceButton>
      </SourceSelector>

      <SearchButton onClick={handleSearch} disabled={isLoading || !searchQuery.trim()}>
        {isLoading ? 'Searching...' : 'Search'}
      </SearchButton>

      <SearchFilters
        filters={searchFilters}
        onFiltersChange={setSearchFilters}
        source={selectedSource}
      />

      {isLoading && (
        <LoadingSpinner>
          Searching for papers...
        </LoadingSpinner>
      )}

      {searchResults.length > 0 && (
        <ResultsContainer>
          {searchResults.map((paper) => (
            <PaperCard key={paper.id} onClick={() => handlePaperClick(paper)}>
              <PaperTitle>{paper.title}</PaperTitle>
              <PaperAuthors>
                {paper.authors.slice(0, 3).join(', ')}
                {paper.authors.length > 3 && ' et al.'}
              </PaperAuthors>
              <PaperAbstract>{paper.abstract}</PaperAbstract>
              <PaperActions>
                <ActionButton onClick={(e) => handleBookmark(paper, e)}>
                  <FileText size={16} />
                  Bookmark
                </ActionButton>
                <ActionButton onClick={(e) => handleStar(paper, e)}>
                  <Star size={16} fill={isStarred(paper.id) ? '#f39c12' : 'none'} />
                  {isStarred(paper.id) ? 'Starred' : 'Star'}
                </ActionButton>
                <ActionButton onClick={(e) => {
                  e.stopPropagation();
                  window.electronAPI.openExternal(paper.url);
                }}>
                  <ExternalLink size={16} />
                  View Online
                </ActionButton>
              </PaperActions>
            </PaperCard>
          ))}
        </ResultsContainer>
      )}
    </HomeContainer>
  );
}

export default HomePage;