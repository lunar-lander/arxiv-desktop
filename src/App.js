import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import HomePage from './components/HomePage';
import Sidebar from './components/Sidebar';
import PaperViewer from './components/PaperViewer';
import { PaperProvider } from './context/PaperContext';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: #f8f9fa;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [selectedPaper, setSelectedPaper] = useState(null);

  return (
    <PaperProvider>
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
    </PaperProvider>
  );
}

export default App;