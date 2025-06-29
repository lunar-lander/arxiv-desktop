import React, { useState } from 'react';
import styled from 'styled-components';
import { X, Copy, Download, Quote } from 'lucide-react';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 700px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #7f8c8d;
  padding: 0.5rem;
  border-radius: 6px;
  transition: color 0.2s;

  &:hover {
    color: #2c3e50;
  }
`;

const ModalTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PaperTitle = styled.h3`
  color: #2c3e50;
  margin-bottom: 1rem;
  line-height: 1.4;
`;

const CitationFormatTabs = styled.div`
  display: flex;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e0e6ed;
  overflow-x: auto;
`;

const FormatTab = styled.button`
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.active ? '#3498db' : 'transparent'};
  color: ${props => props.active ? '#3498db' : '#7f8c8d'};
  font-weight: ${props => props.active ? '600' : '400'};
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    color: #3498db;
  }
`;

const CitationContainer = styled.div`
  background: #f8f9fa;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #2c3e50;
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid #e0e6ed;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:hover {
    background: #f8f9fa;
    border-color: #3498db;
  }

  &.primary {
    background: #3498db;
    color: white;
    border-color: #3498db;

    &:hover {
      background: #2980b9;
    }
  }
`;

const CITATION_FORMATS = {
  apa: 'APA',
  mla: 'MLA', 
  chicago: 'Chicago',
  bibtex: 'BibTeX',
  ris: 'RIS',
  endnote: 'EndNote'
};

function CitationModal({ isOpen, onClose, paper }) {
  const [selectedFormat, setSelectedFormat] = useState('apa');

  if (!isOpen || !paper) return null;

  const formatAuthors = (authors, format) => {
    if (!authors || authors.length === 0) return '';
    
    switch (format) {
      case 'apa':
        if (authors.length === 1) {
          const parts = authors[0].split(' ');
          const lastName = parts.pop();
          const initials = parts.map(name => name.charAt(0).toUpperCase()).join('. ');
          return `${lastName}, ${initials}${initials ? '.' : ''}`;
        } else if (authors.length <= 7) {
          return authors.map(author => {
            const parts = author.split(' ');
            const lastName = parts.pop();
            const initials = parts.map(name => name.charAt(0).toUpperCase()).join('. ');
            return `${lastName}, ${initials}${initials ? '.' : ''}`;
          }).join(', ');
        } else {
          const firstSix = authors.slice(0, 6).map(author => {
            const parts = author.split(' ');
            const lastName = parts.pop();
            const initials = parts.map(name => name.charAt(0).toUpperCase()).join('. ');
            return `${lastName}, ${initials}${initials ? '.' : ''}`;
          }).join(', ');
          const lastAuthor = authors[authors.length - 1];
          const lastParts = lastAuthor.split(' ');
          const lastLastName = lastParts.pop();
          const lastInitials = lastParts.map(name => name.charAt(0).toUpperCase()).join('. ');
          return `${firstSix}, ... ${lastLastName}, ${lastInitials}${lastInitials ? '.' : ''}`;
        }
      case 'mla':
        if (authors.length === 1) {
          const parts = authors[0].split(' ');
          const lastName = parts.pop();
          const firstName = parts.join(' ');
          return `${lastName}, ${firstName}`;
        } else {
          const first = authors[0];
          const parts = first.split(' ');
          const lastName = parts.pop();
          const firstName = parts.join(' ');
          if (authors.length === 2) {
            return `${lastName}, ${firstName}, and ${authors[1]}`;
          } else {
            return `${lastName}, ${firstName}, et al.`;
          }
        }
      default:
        return authors.join(', ');
    }
  };

  const generateCitation = (format) => {
    const year = new Date(paper.published).getFullYear();
    const formattedAuthors = formatAuthors(paper.authors, format);
    
    switch (format) {
      case 'apa':
        return `${formattedAuthors} (${year}). ${paper.title}. arXiv preprint arXiv:${paper.id}.`;
        
      case 'mla':
        return `${formattedAuthors} "${paper.title}." arXiv preprint arXiv:${paper.id} (${year}).`;
        
      case 'chicago':
        return `${formattedAuthors} "${paper.title}." arXiv preprint arXiv:${paper.id} (${year}).`;
        
      case 'bibtex':
        const bibtexKey = `${paper.authors[0]?.split(' ').pop()?.toLowerCase() || 'unknown'}${year}`;
        return `@article{${bibtexKey},
  title={${paper.title}},
  author={${paper.authors.join(' and ')}},
  journal={arXiv preprint arXiv:${paper.id}},
  year={${year}},
  url={${paper.url}}
}`;
        
      case 'ris':
        return `TY  - JOUR
AU  - ${paper.authors.join('\nAU  - ')}
TI  - ${paper.title}
JO  - arXiv preprint
PY  - ${year}
UR  - ${paper.url}
ID  - ${paper.id}
ER  -`;
        
      case 'endnote':
        return `%0 Journal Article
%A ${paper.authors.join('\n%A ')}
%T ${paper.title}
%J arXiv preprint
%D ${year}
%U ${paper.url}
%M ${paper.id}`;
        
      default:
        return `${formattedAuthors} (${year}). ${paper.title}. arXiv preprint arXiv:${paper.id}.`;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateCitation(selectedFormat));
      alert('Citation copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy citation:', error);
      alert('Failed to copy citation');
    }
  };

  const handleDownload = () => {
    const citation = generateCitation(selectedFormat);
    const blob = new Blob([citation], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
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
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <CloseButton onClick={onClose}>
          <X size={20} />
        </CloseButton>
        
        <ModalTitle>
          <Quote size={24} />
          Export Citation
        </ModalTitle>

        <PaperTitle>{paper.title}</PaperTitle>
        
        <CitationFormatTabs>
          {Object.entries(CITATION_FORMATS).map(([key, label]) => (
            <FormatTab
              key={key}
              active={selectedFormat === key}
              onClick={() => setSelectedFormat(key)}
            >
              {label}
            </FormatTab>
          ))}
        </CitationFormatTabs>

        <CitationContainer>
          {generateCitation(selectedFormat)}
        </CitationContainer>

        <ActionButtons>
          <ActionButton onClick={handleCopy}>
            <Copy size={16} />
            Copy Citation
          </ActionButton>
          <ActionButton onClick={handleDownload} className="primary">
            <Download size={16} />
            Download Citation
          </ActionButton>
        </ActionButtons>
      </ModalContent>
    </ModalOverlay>
  );
}

export default CitationModal;