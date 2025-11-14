/**
 * usePdfZoom Hook
 * Handles PDF zoom controls and calculations
 */

import { useState, useEffect, RefObject } from "react";

export interface ContainerSize {
  width: number;
  height: number;
}

export interface UsePdfZoomProps {
  containerRef: RefObject<HTMLElement>;
  initialScale?: number | "auto";
}

export interface UsePdfZoomReturn {
  scale: number | "auto";
  actualScale: number;
  containerSize: ContainerSize;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToWidth: () => void;
  setScale: (scale: number | "auto") => void;
  getCurrentScale: () => number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const ZOOM_STEP = 0.25;
const DEFAULT_PAGE_WIDTH = 612; // Standard PDF page width in points

/**
 * Hook for managing PDF zoom functionality
 */
export function usePdfZoom({
  containerRef,
  initialScale = "auto",
}: UsePdfZoomProps): UsePdfZoomReturn {
  const [scale, setScale] = useState<number | "auto">(initialScale);
  const [actualScale, setActualScale] = useState(1.0);
  const [containerSize, setContainerSize] = useState<ContainerSize>({
    width: 0,
    height: 0,
  });

  // Measure container size for smart zoom
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerSize({ width, height });

        // Update auto-fit scale when container size changes
        if (scale === "auto" && width > 0) {
          const optimalScale = calculateOptimalScale(width);
          setActualScale(optimalScale);
        }
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [containerRef, scale]);

  /**
   * Calculate optimal scale for container width
   */
  const calculateOptimalScale = (width: number): number => {
    const optimalScale = (width * 0.9) / DEFAULT_PAGE_WIDTH;
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, optimalScale));
  };

  /**
   * Get current effective scale
   */
  const getCurrentScale = (): number => {
    if (scale === "auto") {
      return actualScale;
    }
    return typeof scale === "number" ? scale : 1.0;
  };

  /**
   * Zoom in
   */
  const zoomIn = () => {
    const currentScale = getCurrentScale();
    const newScale = Math.min(MAX_SCALE, currentScale + ZOOM_STEP);
    setScale(newScale);
    setActualScale(newScale);
  };

  /**
   * Zoom out
   */
  const zoomOut = () => {
    const currentScale = getCurrentScale();
    const newScale = Math.max(MIN_SCALE, currentScale - ZOOM_STEP);
    setScale(newScale);
    setActualScale(newScale);
  };

  /**
   * Reset zoom to 100%
   */
  const resetZoom = () => {
    setScale(1.0);
    setActualScale(1.0);
  };

  /**
   * Fit PDF to container width
   */
  const fitToWidth = () => {
    if (containerSize.width > 0) {
      const optimalScale = calculateOptimalScale(containerSize.width);
      setScale("auto");
      setActualScale(optimalScale);
    }
  };

  /**
   * Update scale when container size changes
   */
  useEffect(() => {
    if (scale === "auto" && containerSize.width > 0) {
      const optimalScale = calculateOptimalScale(containerSize.width);
      setActualScale(optimalScale);
    }
  }, [containerSize, scale]);

  return {
    scale,
    actualScale,
    containerSize,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToWidth,
    setScale,
    getCurrentScale,
  };
}
