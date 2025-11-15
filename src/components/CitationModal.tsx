// @ts-nocheck
import { useState } from "react";
import { X, Copy, Download, Quote } from "lucide-react";
import { useToast } from "../context/ToastContext";
import styles from "./CitationModal.module.css";

const CITATION_FORMATS = {
  apa: "APA",
  mla: "MLA",
  chicago: "Chicago",
  bibtex: "BibTeX",
  ris: "RIS",
  endnote: "EndNote",
};

function CitationModal({ isOpen, onClose, paper }: any) {
  const [selectedFormat, setSelectedFormat] = useState("apa");
  const toast = useToast();

  if (!isOpen || !paper) return null;

  const formatAuthors = (authors, format) => {
    if (!authors || authors.length === 0) return "";

    switch (format) {
      case "apa":
        if (authors.length === 1) {
          const parts = authors[0].split(" ");
          const lastName = parts.pop();
          const initials = parts
            .map((name) => name.charAt(0).toUpperCase())
            .join(". ");
          return `${lastName}, ${initials}${initials ? "." : ""}`;
        } else if (authors.length <= 7) {
          return authors
            .map((author) => {
              const parts = author.split(" ");
              const lastName = parts.pop();
              const initials = parts
                .map((name) => name.charAt(0).toUpperCase())
                .join(". ");
              return `${lastName}, ${initials}${initials ? "." : ""}`;
            })
            .join(", ");
        } else {
          const firstSix = authors
            .slice(0, 6)
            .map((author) => {
              const parts = author.split(" ");
              const lastName = parts.pop();
              const initials = parts
                .map((name) => name.charAt(0).toUpperCase())
                .join(". ");
              return `${lastName}, ${initials}${initials ? "." : ""}`;
            })
            .join(", ");
          const lastAuthor = authors[authors.length - 1];
          const lastParts = lastAuthor.split(" ");
          const lastLastName = lastParts.pop();
          const lastInitials = lastParts
            .map((name) => name.charAt(0).toUpperCase())
            .join(". ");
          return `${firstSix}, ... ${lastLastName}, ${lastInitials}${
            lastInitials ? "." : ""
          }`;
        }
      case "mla":
        if (authors.length === 1) {
          const parts = authors[0].split(" ");
          const lastName = parts.pop();
          const firstName = parts.join(" ");
          return `${lastName}, ${firstName}`;
        } else {
          const first = authors[0];
          const parts = first.split(" ");
          const lastName = parts.pop();
          const firstName = parts.join(" ");
          if (authors.length === 2) {
            return `${lastName}, ${firstName}, and ${authors[1]}`;
          } else {
            return `${lastName}, ${firstName}, et al.`;
          }
        }
      default:
        return authors.join(", ");
    }
  };

  const generateCitation = (format) => {
    const year = new Date(paper.published).getFullYear();
    const formattedAuthors = formatAuthors(paper.authors, format);
    const isBioRxiv = paper.source === "biorxiv";
    const journal = isBioRxiv ? "bioRxiv preprint" : "arXiv preprint";
    const identifier = isBioRxiv ? `bioRxiv ${paper.id}` : `arXiv:${paper.id}`;

    switch (format) {
      case "apa":
        return `${formattedAuthors} (${year}). ${paper.title}. ${journal} ${identifier}.`;

      case "mla":
        return `${formattedAuthors} "${paper.title}." ${journal} ${identifier} (${year}).`;

      case "chicago":
        return `${formattedAuthors} "${paper.title}." ${journal} ${identifier} (${year}).`;

      case "bibtex":
        const bibtexKey = `${
          paper.authors[0]?.split(" ").pop()?.toLowerCase() || "unknown"
        }${year}`;
        return `@article{${bibtexKey},
  title={${paper.title}},
  author={${paper.authors.join(" and ")}},
  journal={${journal}},
  year={${year}},
  url={${paper.url}},
  ${isBioRxiv ? "doi" : "eprint"}={${paper.id}}
}`;

      case "ris":
        return `TY  - JOUR
AU  - ${paper.authors.join("\nAU  - ")}
TI  - ${paper.title}
JO  - ${journal}
PY  - ${year}
UR  - ${paper.url}
ID  - ${paper.id}
ER  -`;

      case "endnote":
        return `%0 Journal Article
%A ${paper.authors.join("\n%A ")}
%T ${paper.title}
%J ${journal}
%D ${year}
%U ${paper.url}
%M ${paper.id}`;

      default:
        return `${formattedAuthors} (${year}). ${paper.title}. ${journal} ${identifier}.`;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateCitation(selectedFormat));
      toast.success("Citation copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy citation:", error);
      toast.error("Failed to copy citation");
    }
  };

  const handleDownload = () => {
    const citation = generateCitation(selectedFormat);
    const blob = new Blob([citation], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `citation_${paper.id}_${selectedFormat}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>
          <X size={20} />
        </button>

        <h2 className={styles.modalTitle}>
          <Quote size={24} />
          Export Citation
        </h2>

        <h3 className={styles.paperTitle}>{paper.title}</h3>

        <div className={styles.citationFormatTabs}>
          {Object.entries(CITATION_FORMATS).map(([key, label]) => (
            <button
              key={key}
              className={`${styles.formatTab} ${
                selectedFormat === key ? styles.active : ""
              }`}
              onClick={() => setSelectedFormat(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.citationContainer}>
          {generateCitation(selectedFormat)}
        </div>

        <div className={styles.actionButtons}>
          <button className={styles.actionButton} onClick={handleCopy}>
            <Copy size={16} />
            Copy Citation
          </button>
          <button
            className={`${styles.actionButton} ${styles.primary}`}
            onClick={handleDownload}
          >
            <Download size={16} />
            Download Citation
          </button>
        </div>
      </div>
    </div>
  );
}

export default CitationModal;
