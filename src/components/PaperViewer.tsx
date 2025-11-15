/**
 * PaperViewer Component (Refactored)
 * Displays PDF papers with zoom, navigation, and text selection
 */

import { useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import { ExternalLink } from "lucide-react";
import CitationModal from "./CitationModal";
import { PdfPageControls } from "./PdfPageControls";
import { PdfZoomControls } from "./PdfZoomControls";
import { PaperActionButtons } from "./PaperActionButtons";
import { TextCopyButton } from "./TextCopyButton";
import {
  useTextSelection,
  usePdfZoom,
  usePdfState,
  usePaperActions,
} from "../hooks";
import { useToast } from "../context/ToastContext";
import styles from "./PaperViewer.module.css";
import { pdfjs } from "react-pdf";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PaperViewerProps {
  paper: {
    id: string;
    localPath?: string;
    pdfUrl: string;
    url: string;
    [key: string]: any;
  };
}

/**
 * PDF Viewer with navigation, zoom, and text selection
 */
function PaperViewer({ paper }: PaperViewerProps) {
  const [showCitationModal, setShowCitationModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfWrapperRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Custom hooks for functionality
  const { selectedText, showCopyButton, copyButtonPosition, handleCopyText } =
    useTextSelection();

  const {
    scale,
    actualScale,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToWidth,
    getCurrentScale,
    setScale,
  } = usePdfZoom({ containerRef });

  const {
    numPages,
    pageNumber,
    viewMode,
    isLoading,
    error,
    setPageNumber,
    goToPrevPage,
    goToNextPage,
    toggleViewMode,
    onDocumentLoadSuccess,
    onDocumentLoadError,
  } = usePdfState({ paper });

  const {
    isStarred,
    handleStar,
    handleDownload,
    handleCitation,
    handleViewOnline,
  } = usePaperActions({
    paper,
    onShowCitation: () => setShowCitationModal(true),
    onDownloadSuccess: (path) => toast.success(`PDF downloaded to: ${path}`),
    onDownloadError: (error) => toast.error(`Download failed: ${error}`),
  });

  // Construct PDF URL
  const pdfUrl = paper.localPath ? `file://${paper.localPath}` : paper.pdfUrl;

  // Handle page number change from input
  const handlePageChange = (page: number) => {
    setPageNumber(page);
  };

  // Handle document load success with zoom calculation
  const handleDocumentLoadSuccess = (pdf: { numPages: number }) => {
    onDocumentLoadSuccess(pdf);

    // Calculate optimal scale after document loads
    if (containerRef.current && scale === "auto") {
      const { width } = containerRef.current.getBoundingClientRect();
      if (width > 0) {
        fitToWidth();
      }
    }
  };

  return (
    <div className={styles.viewerContainer}>
      {/* Header with paper info */}
      <div className={styles.viewerHeader}>
        <h2 className={styles.paperTitle}>{paper.title}</h2>
        <p className={styles.paperAuthors}>
          {paper.authors?.map((a: any) => a.name).join(", ")}
        </p>
      </div>

      {/* Controls */}
      <div className={styles.allControls}>
        {!isLoading && !error && (
          <div className={styles.pdfControls}>
            <PdfPageControls
              pageNumber={pageNumber}
              numPages={numPages}
              onPrevPage={goToPrevPage}
              onNextPage={goToNextPage}
              onPageChange={handlePageChange}
            />

            <PdfZoomControls
              currentScale={getCurrentScale()}
              viewMode={viewMode}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onResetZoom={resetZoom}
              onFitToWidth={fitToWidth}
              onToggleViewMode={toggleViewMode}
            />
          </div>
        )}

        <PaperActionButtons
          isStarred={isStarred}
          onStar={handleStar}
          onDownload={handleDownload}
          onCite={handleCitation}
          onViewOnline={handleViewOnline}
        />
      </div>

      {/* PDF Container */}
      <div className={styles.pdfContainer} ref={containerRef}>
        {isLoading && (
          <div className={styles.loadingState}>
            <p>Loading PDF...</p>
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            <p>{error}</p>
            <button
              className={styles.actionButton}
              onClick={() => window.electronAPI.openExternal(paper.url)}
            >
              <ExternalLink size={16} />
              View Online Instead
            </button>
          </div>
        )}

        {!error && (
          <div className={styles.pdfWrapper} ref={pdfWrapperRef}>
            <Document
              file={pdfUrl}
              onLoadSuccess={handleDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
            >
              {viewMode === "continuous" && numPages
                ? // Render all pages in continuous mode
                  Array.from({ length: numPages }, (_, index) => (
                    <div key={index + 1} className={styles.pageContainer}>
                      <Page
                        pageNumber={index + 1}
                        scale={getCurrentScale()}
                        renderTextLayer={true}
                        renderAnnotationLayer={false}
                      />
                    </div>
                  ))
                : // Single page mode
                  numPages && (
                    <Page
                      pageNumber={pageNumber}
                      scale={getCurrentScale()}
                      renderTextLayer={true}
                      renderAnnotationLayer={false}
                    />
                  )}
            </Document>
          </div>
        )}
      </div>

      {/* Text Copy Button */}
      <TextCopyButton
        visible={showCopyButton}
        position={copyButtonPosition}
        onCopy={handleCopyText}
        selectedText={selectedText}
      />

      {/* Citation Modal */}
      {showCitationModal && (
        <CitationModal
          paper={paper}
          onClose={() => setShowCitationModal(false)}
        />
      )}
    </div>
  );
}

export default PaperViewer;
