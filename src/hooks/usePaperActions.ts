/**
 * usePaperActions Hook
 * Handles paper actions: star, download, cite, view online
 */

import { useState } from "react";
import { usePapers } from "../context/PaperContext";

export interface Paper {
  id: string;
  localPath?: string;
  pdfUrl: string;
  url: string;
  [key: string]: any;
}

export interface UsePaperActionsProps {
  paper: Paper;
  onShowCitation?: () => void;
}

export interface UsePaperActionsReturn {
  isStarred: boolean;
  handleStar: () => void;
  handleDownload: () => Promise<void>;
  handleCitation: () => void;
  handleViewOnline: () => void;
}

/**
 * Hook for managing paper actions
 */
export function usePaperActions({
  paper,
  onShowCitation,
}: UsePaperActionsProps): UsePaperActionsReturn {
  const { state, dispatch } = usePapers();
  const [isDownloading, setIsDownloading] = useState(false);

  const isStarred = state.starredPapers.some((p: Paper) => p.id === paper.id);

  /**
   * Toggle star status
   */
  const handleStar = () => {
    dispatch({ type: "TOGGLE_STAR", payload: paper });
  };

  /**
   * Download PDF
   */
  const handleDownload = async () => {
    if (isDownloading) return;

    setIsDownloading(true);
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
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Show citation modal
   */
  const handleCitation = () => {
    if (onShowCitation) {
      onShowCitation();
    }
  };

  /**
   * View paper online
   */
  const handleViewOnline = () => {
    window.electronAPI.openExternal(paper.url);
  };

  return {
    isStarred,
    handleStar,
    handleDownload,
    handleCitation,
    handleViewOnline,
  };
}
