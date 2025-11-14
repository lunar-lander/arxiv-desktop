/**
 * PDF Zoom Controls Component
 * Handles zoom in, zoom out, fit to width, reset zoom, and view mode toggle
 */

import React from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import styles from "./PdfZoomControls.module.css";

export interface PdfZoomControlsProps {
  currentScale: number;
  minScale?: number;
  maxScale?: number;
  viewMode: "single" | "continuous";
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToWidth: () => void;
  onToggleViewMode: () => void;
  className?: string;
}

/**
 * PDF zoom controls
 */
export function PdfZoomControls({
  currentScale,
  minScale = 0.5,
  maxScale = 3.0,
  viewMode,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToWidth,
  onToggleViewMode,
  className = "",
}: PdfZoomControlsProps) {
  return (
    <div className={`${styles.zoomControls} ${className}`}>
      <button
        className={styles.controlButton}
        onClick={onZoomOut}
        disabled={currentScale <= minScale}
        aria-label="Zoom out"
      >
        <ZoomOut size={16} />
      </button>
      <span className={styles.zoomLevel}>
        {Math.round(currentScale * 100)}%
      </span>
      <button
        className={styles.controlButton}
        onClick={onZoomIn}
        disabled={currentScale >= maxScale}
        aria-label="Zoom in"
      >
        <ZoomIn size={16} />
      </button>
      <button
        className={styles.controlButton}
        onClick={onFitToWidth}
        title="Fit to width"
      >
        Auto
      </button>
      <button
        className={styles.controlButton}
        onClick={onResetZoom}
        title="Reset zoom"
      >
        100%
      </button>
      <button
        className={styles.controlButton}
        onClick={onToggleViewMode}
        title="Toggle view mode"
      >
        {viewMode === "continuous" ? "Single" : "Continuous"}
      </button>
    </div>
  );
}
