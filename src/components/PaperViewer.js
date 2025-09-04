import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
  Star,
  Quote,
  Copy,
} from "lucide-react";
import { usePapers } from "../context/PaperContext";
import CitationModal from "./CitationModal";
import storageService from "../services/storageService";
import styles from "./PaperViewer.module.css";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function PaperViewer({ paper }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState("auto"); // Default to auto-fit
  const [viewMode, setViewMode] = useState("continuous"); // Default to continuous view
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [actualScale, setActualScale] = useState(1.0); // Track actual scale for display
  const [selectedText, setSelectedText] = useState("");
  const [showCopyButton, setShowCopyButton] = useState(false);
  const [copyButtonPosition, setCopyButtonPosition] = useState({ x: 0, y: 0 });
  const { state, dispatch } = usePapers();
  const containerRef = useRef(null);
  const pdfWrapperRef = useRef(null);

  // Initialize or restore paper state and download PDF
  useEffect(() => {
    const loadPaperState = async () => {
      const savedState = await storageService.getPdfViewState(paper.id);
      if (savedState) {
        setScale(savedState.scale || "auto");
        setPageNumber(savedState.pageNumber || 1);
        setViewMode(savedState.viewMode || "continuous");
      } else {
        setPageNumber(1);
        setViewMode("continuous"); // Default to continuous view
        setScale("auto"); // Default to auto-fit
      }
      setError(null);
      setIsLoading(true);

      // Automatically download and cache the PDF
      if (!paper.localPath) {
        try {
          const localPath = await storageService.downloadAndCachePdf(paper);
          if (localPath) {
            // Update the paper object with the local path
            paper.localPath = localPath;
          }
        } catch (error) {
          console.error("Failed to download PDF:", error);
        }
      }
    };

    loadPaperState();
  }, [paper]);

  // Measure container size for smart zoom
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerSize({ width, height });

        // Update auto-fit scale when container size changes
        if (scale === "auto" && width > 0) {
          const pageWidth = 612;
          const optimalScale = Math.min(
            (width * 0.9) / pageWidth,
            2.0,
            Math.max(0.5, (width * 0.9) / pageWidth)
          );
          setActualScale(optimalScale);
        }
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [scale]);

  // Save state when it changes
  useEffect(() => {
    if (paper && scale && pageNumber) {
      storageService.savePdfViewState(paper.id, {
        scale,
        pageNumber,
        viewMode,
      });
    }
  }, [paper, scale, pageNumber, viewMode]);

  // Handle text selection with improved detection and positioning
  useEffect(() => {
    let selectionTimeout = null;

    const handleTextSelection = () => {
      // Debounce selection handling to avoid excessive updates
      if (selectionTimeout) clearTimeout(selectionTimeout);

      selectionTimeout = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (text && text.length > 0 && selection.rangeCount > 0) {
          setSelectedText(text);

          try {
            // Get selection position for copy button
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Calculate position relative to viewport, accounting for scroll
            const x = rect.left + rect.width / 2;
            const y = Math.max(rect.top - 45, 10); // Ensure button stays in viewport

            setCopyButtonPosition({ x, y });
            setShowCopyButton(true);
          } catch (error) {
            console.warn("Could not get selection position:", error);
            // Fallback to center of screen
            setCopyButtonPosition({
              x: window.innerWidth / 2,
              y: 50,
            });
            setShowCopyButton(true);
          }
        } else {
          setSelectedText("");
          setShowCopyButton(false);
        }
      }, 100); // 100ms debounce
    };

    const handleClickOutside = (event) => {
      // Hide copy button when clicking outside PDF content
      if (
        !event.target.closest(".react-pdf__Page") &&
        !event.target.closest(".copyButton")
      ) {
        setShowCopyButton(false);
        setSelectedText("");
        // Clear text selection
        if (window.getSelection) {
          window.getSelection().removeAllRanges();
        }
      }
    };

    const handleKeyDown = (event) => {
      // Hide copy button on Escape key
      if (event.key === "Escape") {
        setShowCopyButton(false);
        setSelectedText("");
        if (window.getSelection) {
          window.getSelection().removeAllRanges();
        }
      }
    };

    // Use mouseup and selectionchange for better text selection detection
    document.addEventListener("mouseup", handleTextSelection);
    document.addEventListener("selectionchange", handleTextSelection);
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      if (selectionTimeout) clearTimeout(selectionTimeout);
      document.removeEventListener("mouseup", handleTextSelection);
      document.removeEventListener("selectionchange", handleTextSelection);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const onDocumentLoadSuccess = async ({ numPages }) => {
    setNumPages(numPages);
    setIsLoading(false);

    // Calculate auto-fit scale based on container size
    if (containerSize.width > 0) {
      const pageWidth = 612; // Standard PDF page width in points
      const optimalScale = Math.min(
        (containerSize.width * 0.9) / pageWidth, // 90% of container width
        2.0, // Max 200%
        Math.max(0.5, (containerSize.width * 0.9) / pageWidth) // Min 50%
      );
      setActualScale(optimalScale);
    }
  };

  const onDocumentLoadError = (error) => {
    console.error("PDF loading error:", error);
    setError("Failed to load PDF. The file might be corrupted or unavailable.");
    setIsLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages, prev + 1));
  };

  const handlePageChange = (e) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
    }
  };

  const getCurrentScale = () => {
    if (scale === "auto") {
      return actualScale;
    }
    return typeof scale === "number" ? scale : 1.0;
  };

  const zoomIn = () => {
    const currentScale = getCurrentScale();
    const newScale = Math.min(3.0, currentScale + 0.25);
    setScale(newScale);
    setActualScale(newScale);
  };

  const zoomOut = () => {
    const currentScale = getCurrentScale();
    const newScale = Math.max(0.5, currentScale - 0.25);
    setScale(newScale);
    setActualScale(newScale);
  };

  const resetZoom = () => {
    setScale(1.0);
    setActualScale(1.0);
  };

  const fitToWidth = () => {
    if (containerSize.width > 0) {
      const pageWidth = 612; // Standard PDF page width
      const optimalScale = (containerSize.width * 0.9) / pageWidth;
      const newScale = Math.min(3.0, Math.max(0.5, optimalScale));
      setScale("auto");
      setActualScale(newScale);
    }
  };

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "single" ? "continuous" : "single"));
  };

  const handleDownload = async () => {
    try {
      // Try to download the paper if not already downloaded
      if (!paper.localPath) {
        const downloadResult = await window.electronAPI.downloadFile(
          paper.pdfUrl,
          `${paper.id}.pdf`
        );
        if (downloadResult.success) {
          alert(`PDF downloaded to: ${downloadResult.path}`);
          return;
        }
      }

      // If already downloaded or download failed, show file in folder
      if (paper.localPath) {
        await window.electronAPI.showItemInFolder(paper.localPath);
      } else {
        // Fallback to opening URL
        window.electronAPI.openExternal(paper.pdfUrl);
      }
    } catch (error) {
      console.error("Download error:", error);
      // Fallback to opening URL
      window.electronAPI.openExternal(paper.pdfUrl);
    }
  };

  const handleStar = () => {
    dispatch({ type: "TOGGLE_STAR", payload: paper });
  };

  const handleCopySelectedText = async () => {
    if (!selectedText || selectedText.trim().length === 0) {
      console.warn("No text selected to copy");
      return;
    }

    try {
      // Modern clipboard API (preferred)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(selectedText);
        console.log("Text copied to clipboard via Clipboard API");
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = selectedText;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error("execCommand copy failed");
        }
        console.log("Text copied to clipboard via execCommand");
      }

      // Success feedback
      setShowCopyButton(false);
      setSelectedText("");

      // Clear selection
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }

      // Show brief success indication
      const originalText = document.querySelector(".copyButton")?.textContent;
      const copyButton = document.querySelector(".copyButton");
      if (copyButton) {
        copyButton.textContent = "✓ Copied!";
        setTimeout(() => {
          copyButton.textContent = originalText || "📋 Copy";
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to copy text:", error);

      // Try Electron's clipboard if available
      if (window.electronAPI && window.electronAPI.writeClipboard) {
        try {
          await window.electronAPI.writeClipboard(selectedText);
          console.log("Text copied via Electron clipboard");

          setShowCopyButton(false);
          setSelectedText("");
          if (window.getSelection) {
            window.getSelection().removeAllRanges();
          }
        } catch (electronError) {
          console.error("Electron clipboard also failed:", electronError);
          alert(
            "Failed to copy text to clipboard. Please try selecting and copying manually with Ctrl+C."
          );
        }
      } else {
        alert(
          "Failed to copy text to clipboard. Please try selecting and copying manually with Ctrl+C."
        );
      }
    }
  };

  const isStarred = state.starredPapers.some((p) => p.id === paper.id);

  const pdfUrl = paper.localPath ? `file://${paper.localPath}` : paper.pdfUrl;

  return (
    <div className={styles.viewerContainer}>
      <div className={styles.viewerHeader}>
        <div className={styles.paperInfo}>
          <h2 className={styles.paperTitle}>{paper.title}</h2>
          <div className={styles.paperMeta}>
            {paper.authors.slice(0, 3).join(", ")}
            {paper.authors.length > 3 && " et al."} • {paper.source} •{" "}
            {new Date(paper.published).getFullYear()}
          </div>
        </div>

        <div className={styles.allControls}>
          {!isLoading && !error && (
            <div className={styles.pdfControls}>
              <div className={styles.pageControls}>
                <button
                  className={styles.controlButton}
                  onClick={goToPrevPage}
                  disabled={pageNumber <= 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className={styles.pageInfo}>
                  <input
                    className={styles.pageInput}
                    type="number"
                    min={1}
                    max={numPages}
                    value={pageNumber}
                    onChange={handlePageChange}
                  />
                  <span className={styles.pageTotal}>/ {numPages}</span>
                </span>
                <button
                  className={styles.controlButton}
                  onClick={goToNextPage}
                  disabled={pageNumber >= numPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className={styles.zoomControls}>
                <button
                  className={styles.controlButton}
                  onClick={zoomOut}
                  disabled={getCurrentScale() <= 0.5}
                >
                  <ZoomOut size={16} />
                </button>
                <span className={styles.zoomLevel}>
                  {Math.round(getCurrentScale() * 100)}%
                </span>
                <button
                  className={styles.controlButton}
                  onClick={zoomIn}
                  disabled={getCurrentScale() >= 3.0}
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  className={styles.controlButton}
                  onClick={fitToWidth}
                  title="Fit to width"
                >
                  Auto
                </button>
                <button
                  className={styles.controlButton}
                  onClick={resetZoom}
                  title="Reset zoom"
                >
                  100%
                </button>
                <button
                  className={styles.controlButton}
                  onClick={toggleViewMode}
                  title="Toggle view mode"
                >
                  {viewMode === "continuous" ? "Single" : "Continuous"}
                </button>
              </div>
            </div>
          )}

          <div className={styles.viewerActions}>
            <button className={styles.actionButton} onClick={handleStar}>
              <Star size={16} fill={isStarred ? "#f39c12" : "none"} />
              {isStarred ? "Starred" : "Star"}
            </button>
            <button className={styles.actionButton} onClick={handleDownload}>
              <Download size={16} />
              Download
            </button>
            <button
              className={styles.actionButton}
              onClick={() => setShowCitationModal(true)}
            >
              <Quote size={16} />
              Cite
            </button>
            <button
              className={styles.actionButton}
              onClick={() => window.electronAPI.openExternal(paper.url)}
            >
              <ExternalLink size={16} />
              View Online
            </button>
          </div>
        </div>
      </div>

      <div className={styles.pdfContainer} ref={containerRef}>
        {isLoading && <div className={styles.loadingState}>Loading PDF...</div>}

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
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
            >
              {viewMode === "continuous" && numPages ? (
                // Render all pages in continuous mode
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
              ) : (
                // Single page mode
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

      <CitationModal
        isOpen={showCitationModal}
        onClose={() => setShowCitationModal(false)}
        paper={paper}
      />

      {showCopyButton && selectedText && (
        <button
          className={styles.copyButton}
          style={{
            left: copyButtonPosition.x - 35, // Center the button
            top: copyButtonPosition.y,
            position: "fixed",
            zIndex: 1001,
            transform: "translateX(-50%)", // Center horizontally
          }}
          onClick={handleCopySelectedText}
          title={`Copy "${selectedText.substring(0, 50)}${selectedText.length > 50 ? "..." : ""}"`}
        >
          <Copy size={14} style={{ marginRight: "4px" }} />
          Copy
        </button>
      )}
    </div>
  );
}

export default PaperViewer;
