import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, ExternalLink, Star, Bookmark } from 'lucide-react';
import { usePapers } from '../context/PaperContext';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const ViewerContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8f9fa;
`;

const ViewerHeader = styled.div`
  background: white;
  padding: 1rem;
  border-bottom: 1px solid #e0e6ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PaperInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const PaperTitle = styled.h2`
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.3rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PaperMeta = styled.div`
  color: #7f8c8d;
  font-size: 0.9rem;
`;

const ViewerActions = styled.div`
  display: flex;
  gap: 0.5rem;
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ViewerControls = styled.div`
  background: white;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e0e6ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PageControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PageInput = styled.input`
  width: 60px;
  padding: 0.25rem 0.5rem;
  border: 1px solid #e0e6ed;
  border-radius: 4px;
  text-align: center;
`;

const ZoomControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ZoomLevel = styled.span`
  min-width: 50px;
  text-align: center;
  color: #7f8c8d;
`;

const PDFContainer = styled.div`
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 1rem;
  background: #e9ecef;
`;

const PDFWrapper = styled.div`
  background: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-radius: 8px;
  overflow: hidden;
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: #7f8c8d;
`;

const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: #e74c3c;
  text-align: center;
`;

function PaperViewer({ paper }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { state, dispatch } = usePapers();

  useEffect(() => {
    setPageNumber(1);
    setError(null);
    setIsLoading(true);
  }, [paper]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF loading error:', error);
    setError('Failed to load PDF. The file might be corrupted or unavailable.');
    setIsLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  const handlePageChange = (e) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.25));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.25));
  };

  const handleDownload = () => {
    if (paper.localPath) {
      window.electronAPI.openExternal(paper.localPath);
    } else {
      window.electronAPI.openExternal(paper.pdfUrl);
    }
  };

  const handleBookmark = () => {
    dispatch({ type: 'ADD_BOOKMARK', payload: paper });
  };

  const handleStar = () => {
    dispatch({ type: 'TOGGLE_STAR', payload: paper });
  };

  const isStarred = state.starredPapers.some(p => p.id === paper.id);
  const isBookmarked = state.bookmarkedPapers.some(p => p.id === paper.id);

  const pdfUrl = paper.localPath ? `file://${paper.localPath}` : paper.pdfUrl;

  return (
    <ViewerContainer>
      <ViewerHeader>
        <PaperInfo>
          <PaperTitle>{paper.title}</PaperTitle>
          <PaperMeta>
            {paper.authors.slice(0, 3).join(', ')}
            {paper.authors.length > 3 && ' et al.'} • {paper.source} • {new Date(paper.published).getFullYear()}
          </PaperMeta>
        </PaperInfo>
        <ViewerActions>
          <ActionButton onClick={handleBookmark} disabled={isBookmarked}>
            <Bookmark size={16} fill={isBookmarked ? '#3498db' : 'none'} />
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </ActionButton>
          <ActionButton onClick={handleStar}>
            <Star size={16} fill={isStarred ? '#f39c12' : 'none'} />
            {isStarred ? 'Starred' : 'Star'}
          </ActionButton>
          <ActionButton onClick={handleDownload}>
            <Download size={16} />
            Download
          </ActionButton>
          <ActionButton onClick={() => window.electronAPI.openExternal(paper.url)}>
            <ExternalLink size={16} />
            View Online
          </ActionButton>
        </ViewerActions>
      </ViewerHeader>

      {!isLoading && !error && (
        <ViewerControls>
          <PageControls>
            <ActionButton onClick={goToPrevPage} disabled={pageNumber <= 1}>
              <ChevronLeft size={16} />
            </ActionButton>
            <span>
              Page{' '}
              <PageInput
                type="number"
                min={1}
                max={numPages}
                value={pageNumber}
                onChange={handlePageChange}
              />
              {' '}of {numPages}
            </span>
            <ActionButton onClick={goToNextPage} disabled={pageNumber >= numPages}>
              <ChevronRight size={16} />
            </ActionButton>
          </PageControls>
          <ZoomControls>
            <ActionButton onClick={zoomOut} disabled={scale <= 0.5}>
              <ZoomOut size={16} />
            </ActionButton>
            <ZoomLevel>{Math.round(scale * 100)}%</ZoomLevel>
            <ActionButton onClick={zoomIn} disabled={scale >= 3.0}>
              <ZoomIn size={16} />
            </ActionButton>
          </ZoomControls>
        </ViewerControls>
      )}

      <PDFContainer>
        {isLoading && (
          <LoadingState>
            Loading PDF...
          </LoadingState>
        )}
        
        {error && (
          <ErrorState>
            <p>{error}</p>
            <ActionButton onClick={() => window.electronAPI.openExternal(paper.url)}>
              <ExternalLink size={16} />
              View Online Instead
            </ActionButton>
          </ErrorState>
        )}

        {!error && (
          <PDFWrapper>
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </PDFWrapper>
        )}
      </PDFContainer>
    </ViewerContainer>
  );
}

export default PaperViewer;