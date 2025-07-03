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
              // Ensure data is properly converted to string and clean any BOM or whitespace
              const dataStr = result.data.toString().trim();
              const themeData = JSON.parse(dataStr);
              setCurrentTheme(themeData.theme || 'light');
              setIsInitialized(true);
              return;
            } catch (parseError) {
              console.error('Failed to parse theme file:', parseError);
              // Continue with fallback logic
            }
          }
        }
      }
      
      // Fallback to localStorage for development
      const savedTheme = localStorage.getItem('arxiv-theme');
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
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
    setCurrentTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (themeName) => {
    if (themeName === 'light' || themeName === 'dark') {
      setCurrentTheme(themeName);
    }
  };

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      toggleTheme,
      setTheme,
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