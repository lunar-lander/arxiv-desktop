/**
 * Logging service for structured application logging
 * Replaces all console.log, console.warn, console.error calls
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void;
  fatal(
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void;
  setLogLevel(level: LogLevel): void;
  getLogLevel(): LogLevel;
}

/**
 * Console-based logger implementation
 * In production, this could be replaced with a file-based or remote logger
 */
export class ConsoleLogger implements ILogger {
  private logLevel: LogLevel;
  private readonly context: string;

  constructor(context: string = "App", logLevel: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.logLevel = logLevel;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public getLogLevel(): LogLevel {
    return this.logLevel;
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  public info(message: string, context?: Record<string, unknown>): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.log(LogLevel.INFO, message, context);
    }
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.log(LogLevel.WARN, message, context);
    }
  }

  public error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.log(LogLevel.ERROR, message, context, error);
    }
  }

  public fatal(
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    if (this.logLevel <= LogLevel.FATAL) {
      this.log(LogLevel.FATAL, message, context, error);
    }
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      error,
    };

    const formattedMessage = this.formatLogEntry(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, context, error);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, context);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, context);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedMessage, context, error);
        if (error?.stack) {
          console.error(error.stack);
        }
        break;
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level].padEnd(5);
    return `[${timestamp}] [${level}] [${this.context}] ${entry.message}`;
  }
}

/**
 * Logger factory for creating loggers with different contexts
 */
export class LoggerFactory {
  private static defaultLogLevel: LogLevel = LogLevel.INFO;
  private static loggers: Map<string, ILogger> = new Map();

  /**
   * Get or create a logger for a specific context
   */
  public static getLogger(context: string): ILogger {
    if (!this.loggers.has(context)) {
      const logger = new ConsoleLogger(context, this.defaultLogLevel);
      this.loggers.set(context, logger);
    }
    return this.loggers.get(context)!;
  }

  /**
   * Set the default log level for all new loggers
   */
  public static setDefaultLogLevel(level: LogLevel): void {
    this.defaultLogLevel = level;
    // Update existing loggers
    this.loggers.forEach((logger) => logger.setLogLevel(level));
  }

  /**
   * Set log level from environment variable or config
   */
  public static configureFromEnvironment(): void {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && envLevel in LogLevel) {
      this.setDefaultLogLevel(LogLevel[envLevel as keyof typeof LogLevel]);
    }
  }
}

// Export a default logger for convenience
export const logger = LoggerFactory.getLogger("App");
