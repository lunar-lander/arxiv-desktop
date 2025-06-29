import React, { useState, useEffect } from 'react';
import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components';
import HomePage from './components/HomePage';
import Sidebar from './components/Sidebar';
import PaperViewer from './components/PaperViewer';
import { PaperProvider } from './context/PaperContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: ${props => props.theme.background};
  transition: background-color 0.3s ease;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

function AppContent() {
  const [currentView, setCurrentView] = useState('home');
  const [selectedPaper, setSelectedPaper] = useState(null);
  const { theme } = useTheme();

  return (
    <StyledThemeProvider theme={theme}>
      <AppContainer>
        <Sidebar 
          onNavigate={setCurrentView}
          onPaperSelect={setSelectedPaper}
          currentView={currentView}
        />
        <MainContent>
          {currentView === 'home' && (
            <HomePage onPaperOpen={setSelectedPaper} />
          )}
          {currentView === 'paper' && selectedPaper && (
            <PaperViewer paper={selectedPaper} />
          )}
        </MainContent>
      </AppContainer>
    </StyledThemeProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <PaperProvider>
        <AppContent />
      </PaperProvider>
    </ThemeProvider>
  );
}

export default App;