/**
 * Secure IPC handlers for Electron
 * Uses SecureFileSystem to prevent security vulnerabilities
 */

import { ipcMain, dialog, shell } from "electron";
import { SecureFileSystem, URLValidator } from "./SecureFileSystem";
import { LoggerFactory } from "../../infrastructure/logging/Logger";
import * as path from "path";
import * as os from "os";
import * as https from "https";
import * as http from "http";
import * as fs from "fs/promises";

const logger = LoggerFactory.getLogger("IPC-Handlers");

// Initialize SecureFileSystem with allowed paths
const appDataPath = path.join(os.homedir(), "ArxivDesktop");
const papersPath = path.join(appDataPath, "papers");
const cachePath = path.join(appDataPath, "cache");

const fileSystem = new SecureFileSystem([appDataPath, papersPath, cachePath]);

/**
 * Register all secure IPC handlers
 */
export function registerIPCHandlers(mainWindow: Electron.BrowserWindow): void {
  logger.info("Registering IPC handlers");

  // Get app data path
  ipcMain.handle("get-app-data-path", () => {
    logger.debug("get-app-data-path called");
    return appDataPath;
  });

  // Ensure directory exists (async)
  ipcMain.handle("ensure-directory", async (_event, dirPath: string) => {
    logger.debug("ensure-directory called", { dirPath });
    const result = await fileSystem.ensureDirectory(dirPath);

    if (result.success) {
      return { success: true };
    } else {
      logger.warn("ensure-directory failed", { error: result.error });
      return { success: false, error: result.error.message };
    }
  });

  // Write file (async, with validation)
  ipcMain.handle(
    "write-file",
    async (_event, filePath: string, data: string) => {
      logger.debug("write-file called", { filePath });
      const result = await fileSystem.writeFile(filePath, data);

      if (result.success) {
        return { success: true };
      } else {
        logger.warn("write-file failed", { error: result.error });
        return { success: false, error: result.error.message };
      }
    }
  );

  // Read file (async, with validation)
  ipcMain.handle("read-file", async (_event, filePath: string) => {
    logger.debug("read-file called", { filePath });
    const result = await fileSystem.readFile(filePath);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      logger.warn("read-file failed", { error: result.error });
      return { success: false, error: result.error.message };
    }
  });

  // Read file as buffer (async, with validation)
  ipcMain.handle("read-file-as-buffer", async (_event, filePath: string) => {
    logger.debug("read-file-as-buffer called", { filePath });
    const result = await fileSystem.readFileAsBuffer(filePath);

    if (result.success) {
      // Return ArrayBuffer for IPC transfer
      return result.data.buffer.slice(
        result.data.byteOffset,
        result.data.byteOffset + result.data.byteLength
      );
    } else {
      logger.error("read-file-as-buffer failed", result.error);
      throw new Error(result.error.message);
    }
  });

  // Check if file exists
  ipcMain.handle("file-exists", async (_event, filePath: string) => {
    logger.debug("file-exists called", { filePath });
    return await fileSystem.fileExists(filePath);
  });

  // Open external URL (with validation)
  ipcMain.handle("open-external", async (_event, url: string) => {
    logger.debug("open-external called", { url });

    const validation = URLValidator.validateExternalURL(url);
    if (!validation.success) {
      logger.warn("open-external rejected: invalid URL", {
        url,
        error: validation.error,
      });
      throw new Error(validation.error.message);
    }

    await shell.openExternal(url);
    logger.info("Opened external URL", { url });
  });

  // Show save dialog
  ipcMain.handle(
    "show-save-dialog",
    async (_event, options: Electron.SaveDialogOptions) => {
      logger.debug("show-save-dialog called");
      const result = await dialog.showSaveDialog(mainWindow, options);
      return result;
    }
  );

  // Show open dialog
  ipcMain.handle(
    "show-open-dialog",
    async (_event, options: Electron.OpenDialogOptions) => {
      logger.debug("show-open-dialog called");
      const result = await dialog.showOpenDialog(mainWindow, options);
      return result;
    }
  );

  // Show message box
  ipcMain.handle(
    "show-message-box",
    async (_event, options: Electron.MessageBoxOptions) => {
      logger.debug("show-message-box called");
      const result = await dialog.showMessageBox(mainWindow, options);
      return result;
    }
  );

  // Download file (async, with validation)
  ipcMain.handle(
    "download-file",
    async (_event, url: string, filename: string) => {
      logger.info("download-file called", { url, filename });

      // Validate URL
      const urlValidation = URLValidator.validateDownloadURL(url);
      if (!urlValidation.success) {
        logger.warn("download-file rejected: invalid URL", {
          url,
          error: urlValidation.error,
        });
        return { success: false, error: urlValidation.error.message };
      }

      // Sanitize filename
      const sanitizedFilename = fileSystem.sanitizeAndJoinPath(
        papersPath,
        filename
      );

      try {
        // Ensure papers directory exists
        const dirResult = await fileSystem.ensureDirectory(papersPath);
        if (!dirResult.success) {
          return { success: false, error: dirResult.error.message };
        }

        // Download file
        const downloadResult = await downloadFileFromURL(
          url,
          sanitizedFilename
        );
        return downloadResult;
      } catch (error) {
        logger.error("download-file failed", error as Error, { url, filename });
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );

  // Show item in folder
  ipcMain.handle("show-item-in-folder", async (_event, filePath: string) => {
    logger.debug("show-item-in-folder called", { filePath });

    // Validate path
    const exists = await fileSystem.fileExists(filePath);
    if (!exists) {
      logger.warn("show-item-in-folder: file not found", { filePath });
      return { success: false, error: "File not found" };
    }

    try {
      shell.showItemInFolder(filePath);
      return { success: true };
    } catch (error) {
      logger.error("show-item-in-folder failed", error as Error, { filePath });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Clipboard operations (no file system access needed)
  ipcMain.handle("write-clipboard", async (_event, text: string) => {
    logger.debug("write-clipboard called");
    try {
      const { clipboard } = require("electron");
      clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      logger.error("write-clipboard failed", error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("read-clipboard", async () => {
    logger.debug("read-clipboard called");
    try {
      const { clipboard } = require("electron");
      const text = clipboard.readText();
      return { success: true, text };
    } catch (error) {
      logger.error("read-clipboard failed", error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  logger.info("IPC handlers registered successfully");
}

/**
 * Download file from URL (async)
 */
async function downloadFileFromURL(
  url: string,
  filePath: string
): Promise<{
  success: boolean;
  path?: string;
  message?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    const protocol = url.startsWith("https:") ? https : http;

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        const redirectUrl = response.headers.location;
        logger.debug("Following redirect", { from: url, to: redirectUrl });

        // Recursively handle redirect
        downloadFileFromURL(redirectUrl, filePath)
          .then(resolve)
          .catch((error) => {
            logger.error("Redirect download failed", error);
            resolve({ success: false, error: String(error) });
          });
        return;
      }

      if (response.statusCode !== 200) {
        logger.warn("Download failed: non-200 status", {
          url,
          statusCode: response.statusCode,
        });
        resolve({
          success: false,
          error: `HTTP error! status: ${response.statusCode}`,
        });
        return;
      }

      // Create write stream
      const file = require("fs").createWriteStream(filePath);

      response.pipe(file);

      file.on("finish", () => {
        file.close();
        logger.info("File downloaded successfully", { url, path: filePath });
        resolve({
          success: true,
          path: filePath,
          message: "File downloaded successfully",
        });
      });

      file.on("error", async (error: Error) => {
        logger.error("File write error during download", error, { filePath });
        // Clean up partial download
        try {
          await fs.unlink(filePath);
        } catch {}
        resolve({ success: false, error: error.message });
      });
    });

    request.on("error", async (error: Error) => {
      logger.error("Download request failed", error, { url });
      // Clean up partial download
      try {
        await fs.unlink(filePath);
      } catch {}
      resolve({ success: false, error: error.message });
    });

    // Set timeout
    request.setTimeout(60000, () => {
      request.destroy();
      logger.warn("Download timeout", { url });
      resolve({ success: false, error: "Download timeout (60s)" });
    });
  });
}

/**
 * Cleanup IPC handlers
 */
export function unregisterIPCHandlers(): void {
  logger.info("Unregistering IPC handlers");

  const handlers = [
    "get-app-data-path",
    "ensure-directory",
    "write-file",
    "read-file",
    "read-file-as-buffer",
    "file-exists",
    "open-external",
    "show-save-dialog",
    "show-open-dialog",
    "show-message-box",
    "download-file",
    "show-item-in-folder",
    "write-clipboard",
    "read-clipboard",
  ];

  handlers.forEach((handler) => {
    ipcMain.removeHandler(handler);
  });

  logger.info("IPC handlers unregistered");
}
