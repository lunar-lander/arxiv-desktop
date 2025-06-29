import React from 'react';
import styled from 'styled-components';
import { Home, FileText, Star, Bookmark, User, X } from 'lucide-react';
import { usePapers } from '../context/PaperContext';

const SidebarContainer = styled.div`
  width: 300px;
  background: #2c3e50;
  color: white;
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const SidebarHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid #34495e;
`;

const AppTitle = styled.h2`
  margin: 0;
  font-size: 1.2rem;
  color: #ecf0f1;
`;

const Navigation = styled.div`
  padding: 1rem 0;
  border-bottom: 1px solid #34495e;
`;

const NavItem = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  background: ${props => props.active ? '#3498db' : 'transparent'};
  border: none;
  color: white;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: background 0.2s;

  &:hover {
    background: ${props => props.active ? '#3498db' : '#34495e'};
  }
`;

const SectionTitle = styled.h3`
  padding: 1rem 1rem 0.5rem;
  margin: 0;
  font-size: 0.9rem;
  color: #bdc3c7;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PapersList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const PaperItem = styled.div`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #34495e;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  &:hover {
    background: #34495e;
  }
`;

const PaperInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const PaperTitle = styled.div`
  font-size: 0.9rem;
  color: #ecf0f1;
  margin-bottom: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PaperSource = styled.div`
  font-size: 0.75rem;
  color: #95a5a6;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #95a5a6;
  cursor: pointer;
  padding: 0.25rem;
  margin-left: 0.5rem;
  border-radius: 3px;
  transition: color 0.2s;

  &:hover {
    color: #e74c3c;
  }
`;

const EmptyState = styled.div`
  padding: 1rem;
  text-align: center;
  color: #95a5a6;
  font-size: 0.9rem;
`;

const UserSection = styled.div`
  padding: 1rem;
  border-top: 1px solid #34495e;
  background: #34495e;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #bdc3c7;
`;

function Sidebar({ onNavigate, onPaperSelect, currentView }) {
  const { state, dispatch } = usePapers();

  const handleNavigation = (view) => {
    onNavigate(view);
  };

  const handlePaperSelect = (paper) => {
    onPaperSelect(paper);
    onNavigate('paper');
  };

  const handleClosePaper = (paperId, e) => {
    e.stopPropagation();
    dispatch({ type: 'REMOVE_OPEN_PAPER', payload: paperId });
  };

  const handleRemoveBookmark = (paperId, e) => {
    e.stopPropagation();
    dispatch({ type: 'REMOVE_BOOKMARK', payload: paperId });
  };

  const handleToggleStar = (paper, e) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_STAR', payload: paper });
  };

  return (
    <SidebarContainer>
      <SidebarHeader>
        <AppTitle>ArXiv Desktop</AppTitle>
      </SidebarHeader>

      <Navigation>
        <NavItem
          active={currentView === 'home'}
          onClick={() => handleNavigation('home')}
        >
          <Home size={18} />
          Home
        </NavItem>
      </Navigation>

      <PapersList>
        {state.openPapers.length > 0 && (
          <>
            <SectionTitle>Open Papers ({state.openPapers.length})</SectionTitle>
            {state.openPapers.map((paper) => (
              <PaperItem key={`open-${paper.id}`} onClick={() => handlePaperSelect(paper)}>
                <PaperInfo>
                  <PaperTitle>{paper.title}</PaperTitle>
                  <PaperSource>{paper.source}</PaperSource>
                </PaperInfo>
                <CloseButton onClick={(e) => handleClosePaper(paper.id, e)}>
                  <X size={14} />
                </CloseButton>
              </PaperItem>
            ))}
          </>
        )}

        {state.bookmarkedPapers.length > 0 && (
          <>
            <SectionTitle>Bookmarks ({state.bookmarkedPapers.length})</SectionTitle>
            {state.bookmarkedPapers.map((paper) => (
              <PaperItem key={`bookmark-${paper.id}`} onClick={() => handlePaperSelect(paper)}>
                <PaperInfo>
                  <PaperTitle>{paper.title}</PaperTitle>
                  <PaperSource>{paper.source}</PaperSource>
                </PaperInfo>
                <CloseButton onClick={(e) => handleRemoveBookmark(paper.id, e)}>
                  <Bookmark size={14} fill="#f39c12" />
                </CloseButton>
              </PaperItem>
            ))}
          </>
        )}

        {state.starredPapers.length > 0 && (
          <>
            <SectionTitle>Starred ({state.starredPapers.length})</SectionTitle>
            {state.starredPapers.map((paper) => (
              <PaperItem key={`starred-${paper.id}`} onClick={() => handlePaperSelect(paper)}>
                <PaperInfo>
                  <PaperTitle>{paper.title}</PaperTitle>
                  <PaperSource>{paper.source}</PaperSource>
                </PaperInfo>
                <CloseButton onClick={(e) => handleToggleStar(paper, e)}>
                  <Star size={14} fill="#f39c12" />
                </CloseButton>
              </PaperItem>
            ))}
          </>
        )}

        {state.openPapers.length === 0 && state.bookmarkedPapers.length === 0 && state.starredPapers.length === 0 && (
          <EmptyState>
            No papers yet. Search and open papers to see them here.
          </EmptyState>
        )}
      </PapersList>

      <UserSection>
        <UserInfo>
          <User size={16} />
          {state.currentUser ? state.currentUser.name : 'Not logged in'}
        </UserInfo>
      </UserSection>
    </SidebarContainer>
  );
}

export default Sidebar;