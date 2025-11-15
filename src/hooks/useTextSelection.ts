/**
 * useTextSelection Hook
 * Handles text selection in PDF viewer and copy functionality
 */

import { useState, useEffect } from "react";

export interface TextSelectionState {
  selectedText: string;
  showCopyButton: boolean;
  copyButtonPosition: { x: number; y: number };
}

export interface UseTextSelectionReturn extends TextSelectionState {
  handleCopyText: () => Promise<void>;
  clearSelection: () => void;
}

/**
 * Hook for managing text selection and copy functionality
 */
export function useTextSelection(): UseTextSelectionReturn {
  const [selectedText, setSelectedText] = useState("");
  const [showCopyButton, setShowCopyButton] = useState(false);
  const [copyButtonPosition, setCopyButtonPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let selectionTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleTextSelection = () => {
      // Debounce selection handling to avoid excessive updates
      if (selectionTimeout) clearTimeout(selectionTimeout);

      selectionTimeout = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (text && text.length > 0 && selection!.rangeCount > 0) {
          setSelectedText(text);

          try {
            // Get selection position for copy button
            const range = selection!.getRangeAt(0);
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

    const handleClickOutside = (event: MouseEvent) => {
      // Hide copy button when clicking outside PDF content
      // Exclude AI chat elements to prevent focus stealing from input
      const target = event.target as HTMLElement;
      if (
        !target.closest(".react-pdf__Page") &&
        !target.closest(".copyButton") &&
        !target.closest("textarea") &&
        !target.matches("textarea") &&
        !target.closest("[class*='messageInput']") &&
        !target.closest("[class*='AIChat']") &&
        !target.closest("[class*='inputRow']") &&
        !target.closest("[class*='sendButton']")
      ) {
        setShowCopyButton(false);
        setSelectedText("");
        // Clear text selection
        if (window.getSelection) {
          window.getSelection()!.removeAllRanges();
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Hide copy button on Escape key
      if (event.key === "Escape") {
        setShowCopyButton(false);
        setSelectedText("");
        if (window.getSelection) {
          window.getSelection()!.removeAllRanges();
        }
      }
    };

    // Use mouseup and selectionchange for better text selection detection
    document.addEventListener("mouseup", handleTextSelection);
    document.addEventListener("selectionchange", handleTextSelection);
    document.addEventListener("click", handleClickOutside as EventListener);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      if (selectionTimeout) clearTimeout(selectionTimeout);
      document.removeEventListener("mouseup", handleTextSelection);
      document.removeEventListener("selectionchange", handleTextSelection);
      document.removeEventListener(
        "click",
        handleClickOutside as EventListener
      );
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const clearSelection = () => {
    setShowCopyButton(false);
    setSelectedText("");
    if (window.getSelection) {
      window.getSelection()!.removeAllRanges();
    }
  };

  const handleCopyText = async () => {
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

      // Success - clear selection
      clearSelection();
    } catch (error) {
      console.error("Failed to copy text:", error);
      throw error;
    }
  };

  return {
    selectedText,
    showCopyButton,
    copyButtonPosition,
    handleCopyText,
    clearSelection,
  };
}
