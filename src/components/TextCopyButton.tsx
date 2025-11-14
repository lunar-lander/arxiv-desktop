/**
 * Text Copy Button Component
 * Floating button that appears when text is selected in PDF
 */

import React from "react";
import { Copy } from "lucide-react";
import styles from "./TextCopyButton.module.css";

export interface TextCopyButtonProps {
  visible: boolean;
  position: { x: number; y: number };
  onCopy: () => void;
  selectedText?: string;
}

/**
 * Floating copy button for selected text
 */
export function TextCopyButton({
  visible,
  position,
  onCopy,
  selectedText = "",
}: TextCopyButtonProps) {
  if (!visible || !selectedText) {
    return null;
  }

  return (
    <button
      className={`${styles.copyButton} copyButton`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={onCopy}
      title="Copy selected text"
    >
      <Copy size={14} />
      <span>Copy</span>
    </button>
  );
}
