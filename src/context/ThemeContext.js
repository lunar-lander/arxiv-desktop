import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  light: {
    primary: '#3498db',
    primaryHover: '#2980b9',
    secondary: '#e0e6ed',
    background: '#f8f9fa',
    surface: '#ffffff',
    text: '#2c3e50',
    textSecondary: '#5a6c7d',
    textMuted: '#7f8c8d',
    border: '#e0e6ed',
    shadow: 'rgba(0, 0, 0, 0.1)',
    success: '#27ae60',
    warning: '#f39c12',
    error: '#e74c3c',
    
    // Sidebar specific
    sidebarBg: '#2c3e50',
    sidebarText: '#ecf0f1',
    sidebarTextMuted: '#bdc3c7',
    sidebarBorder: '#34495e',
    sidebarHover: '#34495e',
    sidebarActive: '#3498db',
  },
  
  dark: {
    primary: '#3498db',
    primaryHover: '#5dade2',
    secondary: '#34495e',
    background: '#1a1a1a',
    surface: '#2c2c2c',
    text: '#ecf0f1',
    textSecondary: '#bdc3c7',
    textMuted: '#95a5a6',
    border: '#444444',
    shadow: 'rgba(0, 0, 0, 0.3)',
    success: '#27ae60',
    warning: '#f39c12',
    error: '#e74c3c',
    
    // Sidebar specific
    sidebarBg: '#1e1e1e',
    sidebarText: '#ecf0f1',
    sidebarTextMuted: '#95a5a6',
    sidebarBorder: '#333333',
    sidebarHover: '#333333',
    sidebarActive: '#3498db',
  }
};

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    saveThemePreference();
  }, [currentTheme]);

  const loadThemePreference = async () => {
    try {
      if (window.electronAPI) {
        const appDataPath = await window.electronAPI.getAppDataPath();
        const themeFile = `${appDataPath}/theme.json`;
        const exists = await window.electronAPI.fileExists(themeFile);
        
        if (exists) {
          const result = await window.electronAPI.readFile(themeFile);
          if (result.success) {
            const themeData = JSON.parse(result.data.toString());
            setCurrentTheme(themeData.theme || 'light');
            return;
          }
        }
      }
      
      // Fallback to localStorage for development
      const savedTheme = localStorage.getItem('arxiv-theme');
      if (savedTheme && themes[savedTheme]) {
        setCurrentTheme(savedTheme);
      } else {
        // Detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setCurrentTheme(prefersDark ? 'dark' : 'light');
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
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
    if (themes[themeName]) {
      setCurrentTheme(themeName);
    }
  };

  const theme = themes[currentTheme];

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      theme,
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