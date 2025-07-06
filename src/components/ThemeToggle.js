import React from "react";
import { useTheme } from "../context/ThemeContext";
import styles from "./Sidebar.module.css";

function ThemeToggle() {
  const { currentTheme, toggleTheme, availableThemes } = useTheme();

  const currentThemeData = availableThemes.find(
    (theme) => theme.id === currentTheme
  );
  const nextThemeIndex =
    (availableThemes.findIndex((theme) => theme.id === currentTheme) + 1) %
    availableThemes.length;
  const nextTheme = availableThemes[nextThemeIndex];

  return (
    <button
      className={styles.themeToggle}
      onClick={toggleTheme}
      title={`Current: ${
        currentThemeData?.name || "Unknown"
      } - Click to switch to ${nextTheme?.name || "Unknown"}`}
    >
      <span style={{ fontSize: "14px" }}>
        {currentThemeData?.icon || "🎨"} {currentThemeData?.name || "Theme"}
      </span>
    </button>
  );
}

export default ThemeToggle;
