/**
 * Secure Electron main process
 * Fixed security vulnerabilities: async operations, path validation, URL validation
 */

const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Menu,
  clipboard,
} = require("electron");
const path = require("path");
const fs = require("fs").promises; // Use promises for async
const fsSync = require("fs"); // Only for sync checks where needed
const os = require("os");
const https = require("https");
const http = require("http");
const isDev = process.env.NODE_ENV === "development";

let mainWindow;

// Configuration
const APP_DATA_PATH = path.join(os.homedir(), "ArxivDesktop");
const PAPERS_PATH = path.join(APP_DATA_PATH, "papers");
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_PROTOCOLS = ["http:", "https:"];
const BLOCKED_DOMAINS = ["localhost", "127.0.0.1", "0.0.0.0", "[::]"];

// Logging helper (simple console replacement)
const log = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ""),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ""),
  error: (msg, error) => console.error(`[ERROR] ${msg}`, error || ""),
  debug: (msg, data) => isDev && console.log(`[DEBUG] ${msg}`, data || ""),
};

/**
 * Validate path is within allowed directories (prevent directory traversal)
 */
function validatePath(filePath) {
  const resolvedPath = path.resolve(filePath);
  const isAllowed = resolvedPath.startsWith(APP_DATA_PATH);

  if (!isAllowed) {
    log.warn("Path traversal attempt detected", {
      requested: filePath,
      resolved: resolvedPath,
    });
    throw new Error("Access denied: path is outside allowed directories");
  }

  return resolvedPath;
}

/**
 * Sanitize filename to prevent directory traversal
 */
function sanitizeFilename(filename) {
  return (
    filename
      .replace(/[/\\]/g, "_") // Replace path separators
      .replace(/\.\./g, "_") // Replace parent directory references
      // eslint-disable-next-line no-control-regex
      .replace(/[<>:"|?*\x00-\x1F]/g, "_") // Replace invalid filename chars
      .substring(0, 255)
  ); // Limit filename length
}

/**
 * Validate URL before opening externally
 */
function validateURL(url) {
  try {
    const parsedUrl = new URL(url);

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      throw new Error(`Invalid protocol: ${parsedUrl.protocol}`);
    }

    // Check for blocked domains
    if (BLOCKED_DOMAINS.some((domain) => parsedUrl.hostname.includes(domain))) {
      throw new Error("Access to local resources is blocked");
    }

    return parsedUrl;
  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`);
  }
}

/**
 * Create main window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true, // ALWAYS enabled (was: !isDev - SECURITY FIX)
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    show: false,
    icon: path.join(__dirname, "../assets/icon.png"),
  });

  // Load the app
  const startUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "../build/index.html")}`;

  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle external links with validation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      validateURL(url);
      shell.openExternal(url);
    } catch (error) {
      log.warn("Blocked external URL", { url, error: error.message });
    }
    return { action: "deny" };
  });

  createMenu();
}

/**
 * Create application menu
 */
function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "New Search",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow.webContents.send("menu-action", "new-search");
          },
        },
        { type: "separator" },
        {
          label: "Import Papers",
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ["openFile", "multiSelections"],
              filters: [
                { name: "PDF Files", extensions: ["pdf"] },
                { name: "All Files", extensions: ["*"] },
              ],
            });

            if (!result.canceled) {
              mainWindow.webContents.send(
                "menu-action",
                "import-papers",
                result.filePaths
              );
            }
          },
        },
        { type: "separator" },
        {
          label: "Exit",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectall" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Papers",
      submenu: [
        {
          label: "Show Starred",
          accelerator: "CmdOrCtrl+S",
          click: () => {
            mainWindow.webContents.send("menu-action", "show-starred");
          },
        },
        { type: "separator" },
        {
          label: "Open Papers Folder",
          accelerator: "CmdOrCtrl+O",
          click: () => shell.openPath(PAPERS_PATH),
        },
        {
          label: "Clear Cache",
          click: async () => {
            const choice = await dialog.showMessageBox(mainWindow, {
              type: "warning",
              buttons: ["Cancel", "Clear Cache"],
              defaultId: 0,
              message: "Clear all cached papers?",
              detail:
                "This will remove all downloaded papers from your local storage.",
            });

            if (choice.response === 1) {
              mainWindow.webContents.send("menu-action", "clear-cache");
            }
          },
        },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
    {
      role: "help",
      submenu: [
        {
          label: "About ArXiv Desktop",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About ArXiv Desktop",
              message: "ArXiv Desktop",
              detail:
                "A desktop application for browsing and managing academic papers from arXiv and bioRxiv.\n\nVersion: 1.0.0\nBuilt with Electron and React",
            });
          },
        },
        {
          label: "Learn More",
          click: () => {
            try {
              validateURL("https://arxiv.org");
              shell.openExternal("https://arxiv.org");
            } catch (error) {
              log.error("Failed to open arxiv.org", error);
            }
          },
        },
      ],
    },
  ];

  // macOS specific menu
  if (process.platform === "darwin") {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    });

    template[5].submenu = [
      { role: "close" },
      { role: "minimize" },
      { role: "zoom" },
      { type: "separator" },
      { role: "front" },
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ============================================================================
// IPC Handlers (Secure, Async)
// ============================================================================

// Get app data path
ipcMain.handle("get-app-data-path", () => {
  log.debug("get-app-data-path called");
  return APP_DATA_PATH;
});

// Ensure directory exists (ASYNC, with validation)
ipcMain.handle("ensure-directory", async (event, dirPath) => {
  log.debug("ensure-directory called", { dirPath });
  try {
    const validPath = validatePath(dirPath);
    await fs.mkdir(validPath, { recursive: true });
    return { success: true };
  } catch (error) {
    log.error("ensure-directory failed", error);
    return { success: false, error: error.message };
  }
});

// Write file (ASYNC, with validation and size limits)
ipcMain.handle("write-file", async (event, filePath, data) => {
  log.debug("write-file called", { filePath });
  try {
    const validPath = validatePath(filePath);

    // Check file size
    const dataSize =
      typeof data === "string" ? Buffer.byteLength(data) : data.length;
    if (dataSize > MAX_FILE_SIZE) {
      throw new Error(
        `File size (${dataSize} bytes) exceeds maximum (${MAX_FILE_SIZE} bytes)`
      );
    }

    await fs.writeFile(validPath, data);
    return { success: true };
  } catch (error) {
    log.error("write-file failed", error);
    return { success: false, error: error.message };
  }
});

// Read file (ASYNC, with validation and size limits)
ipcMain.handle("read-file", async (event, filePath) => {
  log.debug("read-file called", { filePath });
  try {
    const validPath = validatePath(filePath);

    // Check file size
    const stats = await fs.stat(validPath);
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${stats.size} bytes`);
    }

    const data = await fs.readFile(validPath, "utf-8");
    return { success: true, data };
  } catch (error) {
    log.error("read-file failed", error);
    return { success: false, error: error.message };
  }
});

// Read file as buffer (ASYNC, with validation)
ipcMain.handle("read-file-as-buffer", async (event, filePath) => {
  log.debug("read-file-as-buffer called", { filePath });
  try {
    const validPath = validatePath(filePath);

    // Check file size
    const stats = await fs.stat(validPath);
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${stats.size} bytes`);
    }

    const buffer = await fs.readFile(validPath);
    // Return ArrayBuffer for IPC transfer
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
  } catch (error) {
    log.error("read-file-as-buffer failed", error);
    throw new Error(`Failed to read file: ${error.message}`);
  }
});

// Check if file exists (with validation)
ipcMain.handle("file-exists", async (event, filePath) => {
  log.debug("file-exists called", { filePath });
  try {
    const validPath = validatePath(filePath);
    await fs.access(validPath);
    return true;
  } catch {
    return false;
  }
});

// Open external URL (with validation)
ipcMain.handle("open-external", async (event, url) => {
  log.debug("open-external called", { url });
  try {
    validateURL(url);
    await shell.openExternal(url);
    log.info("Opened external URL", { url });
  } catch (error) {
    log.warn("open-external rejected", { url, error: error.message });
    throw error;
  }
});

// Dialog handlers
ipcMain.handle("show-save-dialog", async (event, options) => {
  log.debug("show-save-dialog called");
  return await dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle("show-open-dialog", async (event, options) => {
  log.debug("show-open-dialog called");
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle("show-message-box", async (event, options) => {
  log.debug("show-message-box called");
  return await dialog.showMessageBox(mainWindow, options);
});

// Download file (ASYNC, with validation)
ipcMain.handle("download-file", async (event, url, filename) => {
  log.info("download-file called", { url, filename });

  try {
    // Validate URL
    validateURL(url);

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(filename);
    const filePath = path.join(PAPERS_PATH, sanitizedFilename);

    // Ensure papers directory exists
    await fs.mkdir(PAPERS_PATH, { recursive: true });

    // Download file
    return await downloadFile(url, filePath);
  } catch (error) {
    log.error("download-file failed", error);
    return { success: false, error: error.message };
  }
});

/**
 * Download file from URL (async helper)
 */
async function downloadFile(url, filePath) {
  return new Promise((resolve) => {
    const protocol = url.startsWith("https:") ? https : http;

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        log.debug("Following redirect", {
          from: url,
          to: response.headers.location,
        });
        downloadFile(response.headers.location, filePath).then(resolve);
        return;
      }

      if (response.statusCode !== 200) {
        resolve({
          success: false,
          error: `HTTP error! status: ${response.statusCode}`,
        });
        return;
      }

      const file = fsSync.createWriteStream(filePath);
      response.pipe(file);

      file.on("finish", () => {
        file.close();
        log.info("File downloaded", { url, path: filePath });
        resolve({
          success: true,
          path: filePath,
          message: "File downloaded successfully",
        });
      });

      file.on("error", async (error) => {
        log.error("File write error", error);
        try {
          await fs.unlink(filePath);
        } catch (unlinkError) {
          // Ignore - file may not exist
        }
        resolve({ success: false, error: error.message });
      });
    });

    request.on("error", async (error) => {
      log.error("Download request failed", error);
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        // Ignore - file may not exist
      }
      resolve({ success: false, error: error.message });
    });

    request.setTimeout(60000, () => {
      request.destroy();
      log.warn("Download timeout", { url });
      resolve({ success: false, error: "Download timeout (60s)" });
    });
  });
}

// Show item in folder
ipcMain.handle("show-item-in-folder", async (event, filePath) => {
  log.debug("show-item-in-folder called", { filePath });
  try {
    const validPath = validatePath(filePath);
    shell.showItemInFolder(validPath);
    return { success: true };
  } catch (error) {
    log.error("show-item-in-folder failed", error);
    return { success: false, error: error.message };
  }
});

// Clipboard operations
ipcMain.handle("write-clipboard", async (event, text) => {
  log.debug("write-clipboard called");
  try {
    clipboard.writeText(text);
    return { success: true };
  } catch (error) {
    log.error("write-clipboard failed", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("read-clipboard", async () => {
  log.debug("read-clipboard called");
  try {
    const text = clipboard.readText();
    return { success: true, text };
  } catch (error) {
    log.error("read-clipboard failed", error);
    return { success: false, error: error.message };
  }
});

// ============================================================================
// App Event Handlers
// ============================================================================

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", (event, navigationUrl) => {
    event.preventDefault();
    try {
      validateURL(navigationUrl);
      shell.openExternal(navigationUrl);
    } catch (error) {
      log.warn("Blocked new window URL", {
        url: navigationUrl,
        error: error.message,
      });
    }
  });
});

log.info("ArXiv Desktop starting", {
  isDev,
  appDataPath: APP_DATA_PATH,
  papersPath: PAPERS_PATH,
});
