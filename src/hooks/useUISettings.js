import { useState, useEffect, useCallback } from "react";
import { SettingsService } from "../services/settingsService";

export function useUISettings() {
  const [settings, setSettings] = useState(
    SettingsService.getDefaultUISettings()
  );

  // Load settings on mount
  useEffect(() => {
    const loadedSettings = SettingsService.getUISettings();
    setSettings(loadedSettings);
  }, []);

  // Update a specific setting
  const updateSetting = useCallback((key, value) => {
    const newSettings = SettingsService.updateUISetting(key, value);
    setSettings(newSettings);
    return newSettings;
  }, []);

  // Update multiple settings at once
  const updateSettings = useCallback((newSettings) => {
    const updatedSettings = SettingsService.saveUISettings(newSettings);
    setSettings(updatedSettings);
    return updatedSettings;
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    const defaultSettings = SettingsService.getDefaultUISettings();
    const updatedSettings = SettingsService.saveUISettings(defaultSettings);
    setSettings(updatedSettings);
    return updatedSettings;
  }, []);

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
  };
}
