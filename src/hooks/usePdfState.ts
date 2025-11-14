/**
 * usePdfState Hook
 * Manages PDF loading, page navigation, and state persistence
 */

import { useState, useEffect } from "react";
import storageService from "../services/storageService";

export interface Paper {
  id: string;
  localPath?: string;
  pdfUrl: string;
  [key: string]: any;
}

export interface PdfViewState {
  scale: number | "auto";
  pageNumber: number;
  viewMode: "single" | "continuous";
}

export interface UsePdfStateProps {
  paper: Paper;
  onError?: (error: string) => void;
}

export interface UsePdfStateReturn {
  numPages: number | null;
  pageNumber: number;
  viewMode: "single" | "continuous";
  isLoading: boolean;
  error: string | null;
  scale: number | "auto";
  setNumPages: (num: number) => void;
  setPageNumber: (page: number) => void;
  setViewMode: (mode: "single" | "continuous") => void;
  setScale: (scale: number | "auto") => void;
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  goToPrevPage: () => void;
  goToNextPage: () => void;
  toggleViewMode: () => void;
  onDocumentLoadSuccess: (pdf: { numPages: number }) => void;
  onDocumentLoadError: (error: Error) => void;
}

/**
 * Hook for managing PDF state and persistence
 */
export function usePdfState({
  paper,
  onError,
}: UsePdfStateProps): UsePdfStateReturn {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState<number | "auto">("auto");
  const [viewMode, setViewMode] = useState<"single" | "continuous">(
    "continuous"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize or restore paper state and download PDF
  useEffect(() => {
    const loadPaperState = async () => {
      try {
        const savedState = await storageService.getPdfViewState(paper.id);
        if (savedState) {
          setScale(savedState.scale || "auto");
          setPageNumber(savedState.pageNumber || 1);
          setViewMode(savedState.viewMode || "continuous");
        } else {
          setPageNumber(1);
          setViewMode("continuous");
          setScale("auto");
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
          } catch (downloadError) {
            console.error("Failed to download PDF:", downloadError);
          }
        }
      } catch (loadError) {
        console.error("Failed to load paper state:", loadError);
        setError("Failed to load paper state");
        if (onError) {
          onError("Failed to load paper state");
        }
      }
    };

    loadPaperState();
  }, [paper, onError]);

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

  /**
   * Go to previous page
   */
  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  /**
   * Go to next page
   */
  const goToNextPage = () => {
    if (numPages) {
      setPageNumber((prev) => Math.min(numPages, prev + 1));
    }
  };

  /**
   * Toggle view mode between single and continuous
   */
  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "single" ? "continuous" : "single"));
  };

  /**
   * Handle successful PDF document load
   */
  const onDocumentLoadSuccess = ({ numPages: pages }: { numPages: number }) => {
    setNumPages(pages);
    setIsLoading(false);
    setError(null);
  };

  /**
   * Handle PDF document load error
   */
  const onDocumentLoadError = (loadError: Error) => {
    console.error("PDF loading error:", loadError);
    const errorMessage =
      "Failed to load PDF. The file might be corrupted or unavailable.";
    setError(errorMessage);
    setIsLoading(false);
    if (onError) {
      onError(errorMessage);
    }
  };

  return {
    numPages,
    pageNumber,
    viewMode,
    isLoading,
    error,
    scale,
    setNumPages,
    setPageNumber,
    setViewMode,
    setScale,
    setError,
    setIsLoading,
    goToPrevPage,
    goToNextPage,
    toggleViewMode,
    onDocumentLoadSuccess,
    onDocumentLoadError,
  };
}
