import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, ExternalLink, Star, Bookmark, Quote } from 'lucide-react';
import { usePapers } from '../context/PaperContext';
import CitationModal from './CitationModal';
import styles from './PaperViewer.module.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


function PaperViewer({ paper }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCitationModal, setShowCitationModal] = useState(false);
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
    <div className={styles.viewerContainer}>
      <div className={styles.viewerHeader}>
        <div className={styles.paperInfo}>
          <h2 className={styles.paperTitle}>{paper.title}</h2>
          <div className={styles.paperMeta}>
            {paper.authors.slice(0, 3).join(', ')}
            {paper.authors.length > 3 && ' et al.'} • {paper.source} • {new Date(paper.published).getFullYear()}
          </div>
        </div>
        <div className={styles.viewerActions}>
          <button className={styles.actionButton} onClick={handleBookmark} disabled={isBookmarked}>
            <Bookmark size={16} fill={isBookmarked ? '#3498db' : 'none'} />
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>
          <button className={styles.actionButton} onClick={handleStar}>
            <Star size={16} fill={isStarred ? '#f39c12' : 'none'} />
            {isStarred ? 'Starred' : 'Star'}
          </button>
          <button className={styles.actionButton} onClick={handleDownload}>
            <Download size={16} />
            Download
          </button>
          <button className={styles.actionButton} onClick={() => setShowCitationModal(true)}>
            <Quote size={16} />
            Cite
          </button>
          <button className={styles.actionButton} onClick={() => window.electronAPI.openExternal(paper.url)}>
            <ExternalLink size={16} />
            View Online
          </button>
        </div>
      </div>

      {!isLoading && !error && (
        <div className={styles.viewerControls}>
          <div className={styles.pageControls}>
            <button className={styles.actionButton} onClick={goToPrevPage} disabled={pageNumber <= 1}>
              <ChevronLeft size={16} />
            </button>
            <span>
              Page{' '}
              <input
                className={styles.pageInput}
                type="number"
                min={1}
                max={numPages}
                value={pageNumber}
                onChange={handlePageChange}
              />
              {' '}of {numPages}
            </span>
            <button className={styles.actionButton} onClick={goToNextPage} disabled={pageNumber >= numPages}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className={styles.zoomControls}>
            <button className={styles.actionButton} onClick={zoomOut} disabled={scale <= 0.5}>
              <ZoomOut size={16} />
            </button>
            <span className={styles.zoomLevel}>{Math.round(scale * 100)}%</span>
            <button className={styles.actionButton} onClick={zoomIn} disabled={scale >= 3.0}>
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
      )}

      <div className={styles.pdfContainer}>
        {isLoading && (
          <div className={styles.loadingState}>
            Loading PDF...
          </div>
        )}
        
        {error && (
          <div className={styles.errorState}>
            <p>{error}</p>
            <button className={styles.actionButton} onClick={() => window.electronAPI.openExternal(paper.url)}>
              <ExternalLink size={16} />
              View Online Instead
            </button>
          </div>
        )}

        {!error && (
          <div className={styles.pdfWrapper}>
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
          </div>
        )}
      </div>

      <CitationModal
        isOpen={showCitationModal}
        onClose={() => setShowCitationModal(false)}
        paper={paper}
      />
    </div>
  );
}

export default PaperViewer;