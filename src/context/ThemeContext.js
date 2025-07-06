import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Initialize with system preference to avoid flash
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const availableThemes = [
    { id: 'light', name: 'Light', icon: '☀️' },
    { id: 'dark', name: 'Dark', icon: '🌙' },
    { id: 'cyberpunk', name: 'Cyberpunk', icon: '🌆' },
    { id: 'brogrammer', name: 'Brogrammer', icon: '💻' },
    { id: 'bearded', name: 'Bearded', icon: '🧔' }
  ];
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      saveThemePreference();
    }
  }, [currentTheme, isInitialized]);

  const loadThemePreference = async () => {
    try {
      if (window.electronAPI) {
        const appDataPath = await window.electronAPI.getAppDataPath();
        const themeFile = `${appDataPath}/theme.json`;
        const exists = await window.electronAPI.fileExists(themeFile);
        
        if (exists) {
          const result = await window.electronAPI.readFile(themeFile);
          if (result.success) {
            try {
              // Handle different data formats like in storage service
              let dataStr;
              if (result.data instanceof ArrayBuffer) {
                dataStr = new TextDecoder().decode(result.data);
              } else if (result.data instanceof Uint8Array) {
                dataStr = new TextDecoder().decode(result.data);
              } else if (typeof result.data === 'string') {
                dataStr = result.data;
              } else {
                dataStr = result.data.toString();
              }
              
              // Clean any BOM or whitespace
              dataStr = dataStr.trim();
              console.log('Theme file content:', dataStr);
              
              const themeData = JSON.parse(dataStr);
              setCurrentTheme(themeData.theme || 'light');
              setIsInitialized(true);
              return;
            } catch (parseError) {
              console.error('Failed to parse theme file:', parseError);
              console.error('Raw data:', result.data);
              console.error('Data type:', typeof result.data);
              // Continue with fallback logic
            }
          }
        }
      }
      
      // Fallback to localStorage for development
      const savedTheme = localStorage.getItem('arxiv-theme');
      const validThemes = availableThemes.map(t => t.id);
      if (savedTheme && validThemes.includes(savedTheme)) {
        setCurrentTheme(savedTheme);
      } else {
        // Detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setCurrentTheme(prefersDark ? 'dark' : 'light');
      }
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to load theme preference:', error);
      setIsInitialized(true);
    }
  };

  const saveThemePreference = async () => {
    try {
      if (window.electronAPI) {
        const appDataPath = await window.electronAPI.getAppDataPath();
        await window.electronAPI.ensureDirectory(appDataPath);
        
        const themeFile = `${appDataPath}/theme.json`;
        await window.electronAPI.writeFile(themeFile, JSON.stringify({ 
          theme: currentTheme 
        }, null, 2));
      } else {
        // Fallback to localStorage for development
        localStorage.setItem('arxiv-theme', currentTheme);
      }
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const currentIndex = availableThemes.findIndex(t => t.id === currentTheme);
    const nextIndex = (currentIndex + 1) % availableThemes.length;
    setCurrentTheme(availableThemes[nextIndex].id);
  };

  const setTheme = (themeName) => {
    const validThemes = availableThemes.map(t => t.id);
    if (validThemes.includes(themeName)) {
      setCurrentTheme(themeName);
    }
  };

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      toggleTheme,
      setTheme,
      availableThemes,
      isDark: currentTheme === 'dark'
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}