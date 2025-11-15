/**
 * Centralized configuration management
 * Eliminates all hardcoded values throughout the application
 */

export interface AppConfig {
  // Application settings
  app: {
    name: string;
    version: string;
    environment: "development" | "production" | "test";
  };

  // API endpoints
  api: {
    arxiv: {
      baseUrl: string;
      corsProxy: string;
      timeout: number;
      maxResults: number;
      retries: number;
    };
    biorxiv: {
      baseUrl: string;
      timeout: number;
      maxResults: number;
      retries: number;
    };
  };

  // Storage configuration
  storage: {
    appDataDir: string;
    papersDir: string;
    cacheDir: string;
    maxFileSize: number; // in bytes
    cacheDuration: number; // in milliseconds
  };

  // PDF configuration
  pdf: {
    defaultScale: number;
    minScale: number;
    maxScale: number;
    scaleStep: number;
    maxPagesToExtract: number;
    workerSrc: string;
  };

  // Search configuration
  search: {
    debounceDelay: number;
    historyLimit: number;
    resultsPerPage: number;
  };

  // UI configuration
  ui: {
    defaultTheme: string;
    sidebarWidth: number;
    animationDuration: number;
  };

  // Logging configuration
  logging: {
    level: string;
    enableFileLogging: boolean;
    maxLogSize: number;
  };
}

/**
 * Default configuration
 */
const defaultConfig: AppConfig = {
  app: {
    name: "ArXiv Desktop",
    version: "1.0.0",
    environment:
      (process.env.NODE_ENV as "development" | "production" | "test") ||
      "development",
  },

  api: {
    arxiv: {
      baseUrl: "http://export.arxiv.org/api/query",
      corsProxy: "https://api.allorigins.win/raw?url=",
      timeout: 30000, // 30 seconds
      maxResults: 50,
      retries: 3,
    },
    biorxiv: {
      baseUrl: "https://api.biorxiv.org/details/biorxiv",
      timeout: 30000,
      maxResults: 50,
      retries: 3,
    },
  },

  storage: {
    appDataDir: "~/ArxivDesktop",
    papersDir: "~/ArxivDesktop/papers",
    cacheDir: "~/ArxivDesktop/cache",
    maxFileSize: 50 * 1024 * 1024, // 50MB
    cacheDuration: 5 * 60 * 1000, // 5 minutes
  },

  pdf: {
    defaultScale: 1.5,
    minScale: 0.5,
    maxScale: 3.0,
    scaleStep: 0.1,
    maxPagesToExtract: 30,
    workerSrc: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`,
  },

  search: {
    debounceDelay: 300, // milliseconds
    historyLimit: 10,
    resultsPerPage: 20,
  },

  ui: {
    defaultTheme: "light",
    sidebarWidth: 280,
    animationDuration: 200, // milliseconds
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
    enableFileLogging: false,
    maxLogSize: 10 * 1024 * 1024, // 10MB
  },
};

/**
 * Configuration manager class
 */
class ConfigManager {
  private config: AppConfig;
  private overrides: Partial<AppConfig> = {};

  constructor() {
    this.config = { ...defaultConfig };
    this.loadEnvironmentOverrides();
  }

  /**
   * Get the current configuration
   */
  public getConfig(): Readonly<AppConfig> {
    return { ...this.config, ...this.overrides };
  }

  /**
   * Get a specific configuration value by path
   * @example get('api.arxiv.timeout')
   */
  public get<T = unknown>(path: string): T {
    const keys = path.split(".");
    let value: unknown = this.getConfig();

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        throw new Error(`Configuration key not found: ${path}`);
      }
    }

    return value as T;
  }

  /**
   * Set configuration overrides (for testing or runtime changes)
   */
  public setOverride(path: string, value: unknown): void {
    const keys = path.split(".");
    const lastKey = keys.pop()!;
    let target: Record<string, unknown> = this.overrides as Record<
      string,
      unknown
    >;

    for (const key of keys) {
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key] as Record<string, unknown>;
    }

    target[lastKey] = value;
  }

  /**
   * Clear all configuration overrides
   */
  public clearOverrides(): void {
    this.overrides = {};
  }

  /**
   * Load configuration from environment variables
   */
  private loadEnvironmentOverrides(): void {
    // API configuration
    if (process.env.ARXIV_API_URL) {
      this.setOverride("api.arxiv.baseUrl", process.env.ARXIV_API_URL);
    }
    if (process.env.BIORXIV_API_URL) {
      this.setOverride("api.biorxiv.baseUrl", process.env.BIORXIV_API_URL);
    }

    // Storage configuration
    if (process.env.APP_DATA_DIR) {
      this.setOverride("storage.appDataDir", process.env.APP_DATA_DIR);
    }

    // Logging configuration
    if (process.env.LOG_LEVEL) {
      this.setOverride("logging.level", process.env.LOG_LEVEL);
    }
  }

  /**
   * Validate configuration values
   */
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = this.getConfig();

    // Validate numeric ranges
    if (config.pdf.defaultScale < config.pdf.minScale) {
      errors.push("PDF defaultScale must be greater than or equal to minScale");
    }
    if (config.pdf.defaultScale > config.pdf.maxScale) {
      errors.push("PDF defaultScale must be less than or equal to maxScale");
    }

    // Validate positive numbers
    if (config.api.arxiv.timeout <= 0) {
      errors.push("ArXiv API timeout must be positive");
    }
    if (config.storage.maxFileSize <= 0) {
      errors.push("Max file size must be positive");
    }

    // Validate URLs
    try {
      new URL(config.api.arxiv.baseUrl);
    } catch {
      errors.push("Invalid ArXiv API URL");
    }

    try {
      new URL(config.api.biorxiv.baseUrl);
    } catch {
      errors.push("Invalid BioRxiv API URL");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get configuration as JSON (for debugging)
   */
  public toJSON(): string {
    return JSON.stringify(this.getConfig(), null, 2);
  }
}

// Export singleton instance
export const config = new ConfigManager();

// Export configuration validation
export function validateConfig(): void {
  const validation = config.validate();
  if (!validation.valid) {
    throw new Error(`Invalid configuration:\n${validation.errors.join("\n")}`);
  }
}

// Helper functions for commonly used config values
export const getApiConfig = () => config.get<AppConfig["api"]>("api");
export const getStorageConfig = () =>
  config.get<AppConfig["storage"]>("storage");
export const getPdfConfig = () => config.get<AppConfig["pdf"]>("pdf");
export const getSearchConfig = () => config.get<AppConfig["search"]>("search");
export const getUiConfig = () => config.get<AppConfig["ui"]>("ui");
export const getLoggingConfig = () =>
  config.get<AppConfig["logging"]>("logging");
