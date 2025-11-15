import { createContext, useContext, useState, useEffect } from "react";

interface ThemeContextType {
  currentTheme: string;
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
  availableThemes: Array<{ id: string; name: string; icon: string }>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Initialize with system preference to avoid flash
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  });

  const availableThemes = [
    { id: "light", name: "Light", icon: "☀️" },
    { id: "dark", name: "Dark", icon: "🌙" },
    { id: "cyberpunk", name: "Cyberpunk", icon: "🌆" },
    { id: "brogrammer", name: "Brogrammer", icon: "💻" },
    { id: "bearded", name: "Bearded", icon: "🧔" },
    { id: "neon", name: "Neon", icon: "🔥" },
    { id: "forest", name: "Forest", icon: "🌲" },
    { id: "ocean", name: "Ocean", icon: "🌊" },
    { id: "sunset", name: "Sunset", icon: "🌅" },
    { id: "midnight", name: "Midnight", icon: "🌃" },
    { id: "matrix", name: "Matrix", icon: "🔢" },
    { id: "vampire", name: "Vampire", icon: "🧛" },
    { id: "synthwave", name: "Synthwave", icon: "🎵" },
    { id: "terminal", name: "Terminal", icon: "⌨️" },
    { id: "arctic", name: "Arctic", icon: "🧊" },
    { id: "autumn", name: "Autumn", icon: "🍂" },
    { id: "cherry", name: "Cherry", icon: "🌸" },
    { id: "galaxy", name: "Galaxy", icon: "🌌" },
    { id: "vintage", name: "Vintage", icon: "📻" },
    { id: "monochrome", name: "Monochrome", icon: "⚫" },
    { id: "pastel", name: "Pastel", icon: "🎨" },
    { id: "coffee", name: "Coffee", icon: "☕" },
    { id: "lavender", name: "Lavender", icon: "💜" },
    { id: "emerald", name: "Emerald", icon: "💚" },
    { id: "ruby", name: "Ruby", icon: "💎" },
    { id: "copper", name: "Copper", icon: "🟫" },
    { id: "slate", name: "Slate", icon: "🏔️" },
    { id: "coral", name: "Coral", icon: "🪸" },
    { id: "ninja", name: "Ninja", icon: "🥷" },
    { id: "royal", name: "Royal", icon: "👑" },
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
        const themeFileExists = await window.electronAPI.fileExists(themeFile);

        if (themeFileExists) {
          const result = await window.electronAPI.readFile(themeFile);
          if (result.success) {
            try {
              // Handle different data formats like in storage service
              let dataStr: string;
              const data = result.data;
              if (!data) {
                console.error("No data in theme file");
                return;
              } else if (data instanceof ArrayBuffer) {
                dataStr = new TextDecoder().decode(data).trim();
              } else if (data instanceof Uint8Array) {
                dataStr = new TextDecoder().decode(data).trim();
              } else if (typeof data === "string") {
                dataStr = data.trim();
              } else {
                // Assume it's a Buffer or something with toString
                dataStr = String(data).trim();
              }

              const themeData = JSON.parse(dataStr);
              setCurrentTheme(themeData.theme || "light");
              setIsInitialized(true);
              return;
            } catch (parseError) {
              console.error("Failed to parse theme file:", parseError);
            }
          }
        }
      }
      // NOTE: this is for testing only
      // else {
      //   // Fallback to localStorage for development
      //   const savedTheme = localStorage.getItem("arxiv-theme");
      //   const validThemes = availableThemes.map((t) => t.id);
      //   if (savedTheme && validThemes.includes(savedTheme)) {
      //     setCurrentTheme(savedTheme);
      //   } else {
      //     // Detect system preference
      //     const prefersDark = window.matchMedia(
      //       "(prefers-color-scheme: dark)"
      //     ).matches;
      //     setCurrentTheme(prefersDark ? "dark" : "light");
      //   }
      // }
      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to load theme preference:", error);
      setIsInitialized(true);
    }
  };

  const saveThemePreference = async () => {
    try {
      if (window.electronAPI) {
        const appDataPath = await window.electronAPI.getAppDataPath();
        await window.electronAPI.ensureDirectory(appDataPath);

        const themeFile = `${appDataPath}/theme.json`;
        await window.electronAPI.writeFile(
          themeFile,
          JSON.stringify(
            {
              theme: currentTheme,
            },
            null,
            2
          )
        );
      }
      // NOTE: this is for testing only
      // else {
      //   // Fallback to localStorage for development
      //   localStorage.setItem("arxiv-theme", currentTheme);
      // }
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  };

  const toggleTheme = () => {
    const currentIndex = availableThemes.findIndex(
      (t) => t.id === currentTheme
    );
    const nextIndex = (currentIndex + 1) % availableThemes.length;
    setCurrentTheme(availableThemes[nextIndex].id);
  };

  const setTheme = (themeName) => {
    const validThemes = availableThemes.map((t) => t.id);
    if (validThemes.includes(themeName)) {
      setCurrentTheme(themeName);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        toggleTheme,
        setTheme,
        availableThemes,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
