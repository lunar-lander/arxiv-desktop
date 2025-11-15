/**
 * Centralized error handling framework
 * Provides structured error classes and error handling utilities
 */

/**
 * Error codes for different error types
 */
export enum ErrorCode {
  // General errors
  UNKNOWN = "UNKNOWN",
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",

  // Network errors
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  API_ERROR = "API_ERROR",

  // File system errors
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  FILE_READ_ERROR = "FILE_READ_ERROR",
  FILE_WRITE_ERROR = "FILE_WRITE_ERROR",
  PERMISSION_DENIED = "PERMISSION_DENIED",

  // Storage errors
  STORAGE_ERROR = "STORAGE_ERROR",
  CACHE_ERROR = "CACHE_ERROR",

  // PDF errors
  PDF_LOAD_ERROR = "PDF_LOAD_ERROR",
  PDF_PARSE_ERROR = "PDF_PARSE_ERROR",
  PDF_DOWNLOAD_ERROR = "PDF_DOWNLOAD_ERROR",

  // Authentication errors
  AUTH_ERROR = "AUTH_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",

  // Configuration errors
  CONFIG_ERROR = "CONFIG_ERROR",
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN,
    statusCode: number = 500,
    details?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for logging or API responses
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }

  /**
   * Convert error to user-friendly message
   */
  public toUserMessage(): string {
    return this.message;
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.VALIDATION, 400, details);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, ErrorCode.NOT_FOUND, 404);
  }
}

/**
 * Network error
 */
export class NetworkError extends AppError {
  constructor(
    message: string = "Network request failed",
    details?: Record<string, unknown>
  ) {
    super(message, ErrorCode.NETWORK_ERROR, 503, details);
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends AppError {
  constructor(operation: string, timeout: number) {
    super(
      `Operation '${operation}' timed out after ${timeout}ms`,
      ErrorCode.TIMEOUT,
      408,
      { operation, timeout }
    );
  }
}

/**
 * API error
 */
export class ApiError extends AppError {
  constructor(
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message, ErrorCode.API_ERROR, statusCode, details);
  }
}

/**
 * File system error
 */
export class FileSystemError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.FILE_READ_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message, code, 500, details);
  }
}

/**
 * Storage error
 */
export class StorageError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.STORAGE_ERROR, 500, details);
  }
}

/**
 * PDF error
 */
export class PdfError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.PDF_LOAD_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message, code, 500, details);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, ErrorCode.AUTH_ERROR, 401);
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.CONFIG_ERROR, 500, details, false);
  }
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a successful result
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create a failed result
 */
export function failure<E extends AppError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Type guard to check if result is successful
 */
export function isSuccess<T, E extends AppError>(
  result: Result<T, E>
): result is { success: true; data: T } {
  return result.success;
}

/**
 * Type guard to check if result is a failure
 */
export function isFailure<T, E extends AppError>(
  result: Result<T, E>
): result is { success: false; error: E } {
  return !result.success;
}

/**
 * Error handler utility
 */
export class ErrorHandler {
  /**
   * Convert unknown error to AppError
   */
  public static normalize(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(error.message, ErrorCode.UNKNOWN, 500, {
        originalError: error.name,
      });
    }

    if (typeof error === "string") {
      return new AppError(error);
    }

    return new AppError("An unknown error occurred", ErrorCode.UNKNOWN, 500, {
      error: String(error),
    });
  }

  /**
   * Check if error is operational (expected) or programming error
   */
  public static isOperational(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Get user-friendly error message
   */
  public static getUserMessage(error: unknown): string {
    const appError = this.normalize(error);
    return appError.toUserMessage();
  }

  /**
   * Handle error with logging
   */
  public static handle(
    error: unknown,
    logger?: {
      error: (
        message: string,
        error?: Error,
        context?: Record<string, unknown>
      ) => void;
    }
  ): AppError {
    const appError = this.normalize(error);

    if (logger) {
      logger.error(appError.message, appError, appError.details);
    }

    return appError;
  }
}

/**
 * Async error wrapper utility
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<Result<T, AppError>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    const appError = ErrorHandler.normalize(error);
    if (errorMessage) {
      appError.message = errorMessage;
    }
    return failure(appError);
  }
}

/**
 * Synchronous error wrapper utility
 */
export function tryCatchSync<T>(
  fn: () => T,
  errorMessage?: string
): Result<T, AppError> {
  try {
    const data = fn();
    return success(data);
  } catch (error) {
    const appError = ErrorHandler.normalize(error);
    if (errorMessage) {
      appError.message = errorMessage;
    }
    return failure(appError);
  }
}
