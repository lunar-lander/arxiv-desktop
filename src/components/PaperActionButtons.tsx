/**
 * Paper Action Buttons Component
 * Star, Download, Cite, and View Online actions
 */

import { Star, Download, Quote, ExternalLink } from "lucide-react";
import styles from "./PaperActionButtons.module.css";

export interface PaperActionButtonsProps {
  isStarred: boolean;
  onStar: () => void;
  onDownload: () => void;
  onCite: () => void;
  onViewOnline: () => void;
  className?: string;
}

/**
 * Paper action buttons (Star, Download, Cite, View Online)
 */
export function PaperActionButtons({
  isStarred,
  onStar,
  onDownload,
  onCite,
  onViewOnline,
  className = "",
}: PaperActionButtonsProps) {
  return (
    <div className={`${styles.viewerActions} ${className}`}>
      <button className={styles.actionButton} onClick={onStar}>
        <Star size={16} fill={isStarred ? "#f39c12" : "none"} />
        {isStarred ? "Starred" : "Star"}
      </button>
      <button className={styles.actionButton} onClick={onDownload}>
        <Download size={16} />
        Download
      </button>
      <button className={styles.actionButton} onClick={onCite}>
        <Quote size={16} />
        Cite
      </button>
      <button className={styles.actionButton} onClick={onViewOnline}>
        <ExternalLink size={16} />
        View Online
      </button>
    </div>
  );
}
