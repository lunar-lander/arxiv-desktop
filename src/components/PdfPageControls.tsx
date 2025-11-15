/**
 * PDF Page Controls Component
 * Handles page navigation (previous, next, page input)
 */

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./PdfPageControls.module.css";

export interface PdfPageControlsProps {
  pageNumber: number;
  numPages: number | null;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * PDF page navigation controls
 */
export function PdfPageControls({
  pageNumber,
  numPages,
  onPrevPage,
  onNextPage,
  onPageChange,
  className = "",
}: PdfPageControlsProps) {
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (!isNaN(page) && numPages && page >= 1 && page <= numPages) {
      onPageChange(page);
    }
  };

  if (!numPages) {
    return null;
  }

  return (
    <div className={`${styles.pageControls} ${className}`}>
      <button
        className={styles.controlButton}
        onClick={onPrevPage}
        disabled={pageNumber <= 1}
        aria-label="Previous page"
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
          onChange={handlePageInputChange}
          aria-label="Current page number"
        />
        <span className={styles.pageTotal}>/ {numPages}</span>
      </span>
      <button
        className={styles.controlButton}
        onClick={onNextPage}
        disabled={pageNumber >= numPages}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
