/**
 * Secure FileSystem service for Electron IPC
 * Addresses security vulnerabilities: path traversal, input validation, async operations
 */

import * as path from "path";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import { LoggerFactory } from "../logging/Logger";
import {
  FileSystemError,
  ErrorCode,
  Result,
  success,
  failure,
} from "../../shared/errors";
import { config } from "../../shared/config";

const logger = LoggerFactory.getLogger("FileSystem");

/**
 * Secure FileSystem implementation
 */
export class SecureFileSystem {
  private readonly allowedBasePaths: string[];
  private readonly maxFileSize: number;

  constructor(allowedBasePaths: string[], maxFileSize?: number) {
    this.allowedBasePaths = allowedBasePaths.map((p) => path.resolve(p));
    this.maxFileSize = maxFileSize || config.get<number>("storage.maxFileSize");
    logger.info("FileSystem initialized", {
      allowedPaths: this.allowedBasePaths,
      maxFileSize: this.maxFileSize,
    });
  }

  /**
   * Validate that path is within allowed base paths (prevent directory traversal)
   */
  private validatePath(filePath: string): Result<string> {
    try {
      const resolvedPath = path.resolve(filePath);

      // Check if path is within allowed base paths
      const isAllowed = this.allowedBasePaths.some((basePath) =>
        resolvedPath.startsWith(basePath)
      );

      if (!isAllowed) {
        logger.warn("Path traversal attempt detected", {
          requestedPath: filePath,
          resolvedPath,
          allowedPaths: this.allowedBasePaths,
        });
        return failure(
          new FileSystemError(
            "Access denied: path is outside allowed directories",
            ErrorCode.PERMISSION_DENIED,
            { path: filePath }
          )
        );
      }

      return success(resolvedPath);
    } catch (error) {
      return failure(
        new FileSystemError(`Invalid path: ${filePath}`, ErrorCode.VALIDATION, {
          error,
        })
      );
    }
  }

  /**
   * Sanitize filename to prevent directory traversal
   */
  private sanitizeFilename(filename: string): string {
    // Remove path separators and dangerous characters
    return filename
      .replace(/[\/\\]/g, "_") // Replace path separators
      .replace(/\.\./g, "_") // Replace parent directory references
      .replace(/[<>:"|?*\x00-\x1F]/g, "_") // Replace invalid filename chars
      .substring(0, 255); // Limit filename length
  }

  /**
   * Ensure directory exists (async)
   */
  public async ensureDirectory(dirPath: string): Promise<Result<void>> {
    const validation = this.validatePath(dirPath);
    if (!validation.success) {
      return failure(validation.error);
    }

    try {
      await fs.mkdir(validation.data, { recursive: true });
      logger.debug("Directory created", { path: dirPath });
      return success(undefined);
    } catch (error) {
      logger.error("Failed to create directory", error as Error, {
        path: dirPath,
      });
      return failure(
        new FileSystemError(
          `Failed to create directory: ${dirPath}`,
          ErrorCode.FILE_WRITE_ERROR,
          { error }
        )
      );
    }
  }

  /**
   * Write file (async, with size validation)
   */
  public async writeFile(
    filePath: string,
    data: string | Buffer
  ): Promise<Result<void>> {
    const validation = this.validatePath(filePath);
    if (!validation.success) {
      return failure(validation.error);
    }

    // Validate file size
    const dataSize =
      typeof data === "string" ? Buffer.byteLength(data) : data.length;
    if (dataSize > this.maxFileSize) {
      logger.warn("File size exceeds maximum allowed", {
        path: filePath,
        size: dataSize,
        maxSize: this.maxFileSize,
      });
      return failure(
        new FileSystemError(
          `File size (${dataSize} bytes) exceeds maximum allowed (${this.maxFileSize} bytes)`,
          ErrorCode.VALIDATION,
          { size: dataSize, maxSize: this.maxFileSize }
        )
      );
    }

    try {
      await fs.writeFile(validation.data, data);
      logger.debug("File written", { path: filePath, size: dataSize });
      return success(undefined);
    } catch (error) {
      logger.error("Failed to write file", error as Error, { path: filePath });
      return failure(
        new FileSystemError(
          `Failed to write file: ${filePath}`,
          ErrorCode.FILE_WRITE_ERROR,
          { error }
        )
      );
    }
  }

  /**
   * Read file (async)
   */
  public async readFile(filePath: string): Promise<Result<string>> {
    const validation = this.validatePath(filePath);
    if (!validation.success) {
      return failure(validation.error);
    }

    try {
      // Check file exists
      const stats = await fs.stat(validation.data);
      if (!stats.isFile()) {
        return failure(
          new FileSystemError(
            `Not a file: ${filePath}`,
            ErrorCode.FILE_NOT_FOUND
          )
        );
      }

      // Check file size
      if (stats.size > this.maxFileSize) {
        return failure(
          new FileSystemError(
            `File too large: ${stats.size} bytes`,
            ErrorCode.VALIDATION,
            { size: stats.size, maxSize: this.maxFileSize }
          )
        );
      }

      const data = await fs.readFile(validation.data, "utf-8");
      logger.debug("File read", { path: filePath, size: stats.size });
      return success(data);
    } catch (error) {
      logger.error("Failed to read file", error as Error, { path: filePath });
      return failure(
        new FileSystemError(
          `Failed to read file: ${filePath}`,
          ErrorCode.FILE_READ_ERROR,
          { error }
        )
      );
    }
  }

  /**
   * Read file as buffer (async)
   */
  public async readFileAsBuffer(filePath: string): Promise<Result<Buffer>> {
    const validation = this.validatePath(filePath);
    if (!validation.success) {
      return failure(validation.error);
    }

    try {
      // Check file exists and size
      const stats = await fs.stat(validation.data);
      if (!stats.isFile()) {
        return failure(
          new FileSystemError(
            `Not a file: ${filePath}`,
            ErrorCode.FILE_NOT_FOUND
          )
        );
      }

      if (stats.size > this.maxFileSize) {
        return failure(
          new FileSystemError(
            `File too large: ${stats.size} bytes`,
            ErrorCode.VALIDATION,
            { size: stats.size, maxSize: this.maxFileSize }
          )
        );
      }

      const buffer = await fs.readFile(validation.data);
      logger.debug("File read as buffer", { path: filePath, size: stats.size });
      return success(buffer);
    } catch (error) {
      logger.error("Failed to read file as buffer", error as Error, {
        path: filePath,
      });
      return failure(
        new FileSystemError(
          `Failed to read file as buffer: ${filePath}`,
          ErrorCode.FILE_READ_ERROR,
          { error }
        )
      );
    }
  }

  /**
   * Check if file exists
   */
  public async fileExists(filePath: string): Promise<boolean> {
    const validation = this.validatePath(filePath);
    if (!validation.success) {
      return false;
    }

    try {
      await fs.access(validation.data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete file (async)
   */
  public async deleteFile(filePath: string): Promise<Result<void>> {
    const validation = this.validatePath(filePath);
    if (!validation.success) {
      return failure(validation.error);
    }

    try {
      await fs.unlink(validation.data);
      logger.debug("File deleted", { path: filePath });
      return success(undefined);
    } catch (error) {
      logger.error("Failed to delete file", error as Error, { path: filePath });
      return failure(
        new FileSystemError(
          `Failed to delete file: ${filePath}`,
          ErrorCode.FILE_WRITE_ERROR,
          { error }
        )
      );
    }
  }

  /**
   * Get file stats
   */
  public async getFileStats(filePath: string): Promise<Result<fs.Stats>> {
    const validation = this.validatePath(filePath);
    if (!validation.success) {
      return failure(validation.error);
    }

    try {
      const stats = await fs.stat(validation.data);
      return success(stats);
    } catch (error) {
      logger.error("Failed to get file stats", error as Error, {
        path: filePath,
      });
      return failure(
        new FileSystemError(
          `Failed to get file stats: ${filePath}`,
          ErrorCode.FILE_READ_ERROR,
          { error }
        )
      );
    }
  }

  /**
   * List files in directory
   */
  public async listFiles(dirPath: string): Promise<Result<string[]>> {
    const validation = this.validatePath(dirPath);
    if (!validation.success) {
      return failure(validation.error);
    }

    try {
      const files = await fs.readdir(validation.data);
      return success(files);
    } catch (error) {
      logger.error("Failed to list files", error as Error, { path: dirPath });
      return failure(
        new FileSystemError(
          `Failed to list files: ${dirPath}`,
          ErrorCode.FILE_READ_ERROR,
          { error }
        )
      );
    }
  }

  /**
   * Sanitize and join path
   */
  public sanitizeAndJoinPath(basePath: string, filename: string): string {
    const sanitized = this.sanitizeFilename(filename);
    return path.join(basePath, sanitized);
  }

  /**
   * Get allowed base paths (for debugging)
   */
  public getAllowedPaths(): string[] {
    return [...this.allowedBasePaths];
  }
}

/**
 * URL validation utilities
 */
export class URLValidator {
  private static readonly ALLOWED_PROTOCOLS = ["http:", "https:"];
  private static readonly BLOCKED_DOMAINS = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "[::]",
  ];

  /**
   * Validate URL is safe to open externally
   */
  public static validateExternalURL(url: string): Result<URL> {
    try {
      const parsedUrl = new URL(url);

      // Check protocol
      if (!this.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
        return failure(
          new FileSystemError(
            `Invalid protocol: ${parsedUrl.protocol}`,
            ErrorCode.VALIDATION,
            { url, protocol: parsedUrl.protocol }
          )
        );
      }

      // Check for blocked domains
      if (
        this.BLOCKED_DOMAINS.some((domain) =>
          parsedUrl.hostname.includes(domain)
        )
      ) {
        return failure(
          new FileSystemError(
            "Access to local resources is blocked",
            ErrorCode.PERMISSION_DENIED,
            { url }
          )
        );
      }

      return success(parsedUrl);
    } catch (error) {
      return failure(
        new FileSystemError(`Invalid URL: ${url}`, ErrorCode.VALIDATION, {
          error,
        })
      );
    }
  }

  /**
   * Validate download URL
   */
  public static validateDownloadURL(url: string): Result<URL> {
    const validation = this.validateExternalURL(url);
    if (!validation.success) {
      return validation;
    }

    const parsedUrl = validation.data;

    // Additional checks for downloads
    if (parsedUrl.protocol !== "https:") {
      logger.warn("Non-HTTPS download URL detected", { url });
    }

    return success(parsedUrl);
  }
}
