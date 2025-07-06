const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Menu,
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");
const http = require("http");
const isDev = process.env.NODE_ENV === "development";

let mainWindow;

function createWindow() {
  // Create the browser window
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
      webSecurity: !isDev,
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    show: false,
    icon: path.join(__dirname, "../assets/icon.png"), // Add app icon
  });

  // Load the app
  const startUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "../build/index.html")}`;

  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    // Focus on window
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Create application menu
  createMenu();
}

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
          click: () => {
            app.quit();
          },
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
          click: () => {
            const papersPath = path.join(
              os.homedir(),
              "ArxivDesktop",
              "papers"
            );
            shell.openPath(papersPath);
          },
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
            shell.openExternal("https://arxiv.org");
          },
        },
      ],
    },
  ];

  // macOS specific menu adjustments
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

    // Window menu
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

// App event handlers
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
    shell.openExternal(navigationUrl);
  });
});

// IPC handlers for file operations
ipcMain.handle("get-app-data-path", () => {
  return path.join(os.homedir(), "ArxivDesktop");
});

ipcMain.handle("ensure-directory", async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("write-file", async (event, filePath, data) => {
  try {
    fs.writeFileSync(filePath, data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("read-file", async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("file-exists", async (event, filePath) => {
  return fs.existsSync(filePath);
});

ipcMain.handle("open-external", async (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle("show-save-dialog", async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle("show-open-dialog", async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle("show-message-box", async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

ipcMain.handle("download-file", async (event, url, filename) => {
  return new Promise((resolve) => {
    try {
      const papersPath = path.join(os.homedir(), "ArxivDesktop", "papers");
      const filePath = path.join(papersPath, filename);

      // Ensure directory exists
      if (!fs.existsSync(papersPath)) {
        fs.mkdirSync(papersPath, { recursive: true });
      }

      const file = fs.createWriteStream(filePath);
      const protocol = url.startsWith("https:") ? https : http;

      const request = protocol.get(url, (response) => {
        // Handle redirects
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          const redirectUrl = response.headers.location;
          const redirectProtocol = redirectUrl.startsWith("https:")
            ? https
            : http;

          redirectProtocol
            .get(redirectUrl, (redirectResponse) => {
              redirectResponse.pipe(file);

              file.on("finish", () => {
                file.close();
                resolve({
                  success: true,
                  path: filePath,
                  message: "File downloaded successfully",
                });
              });
            })
            .on("error", (error) => {
              fs.unlink(filePath, () => {});
              resolve({
                success: false,
                error: error.message,
              });
            });
        } else if (response.statusCode === 200) {
          response.pipe(file);

          file.on("finish", () => {
            file.close();
            resolve({
              success: true,
              path: filePath,
              message: "File downloaded successfully",
            });
          });
        } else {
          resolve({
            success: false,
            error: `HTTP error! status: ${response.statusCode}`,
          });
        }
      });

      request.on("error", (error) => {
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, () => {});
        }
        resolve({
          success: false,
          error: error.message,
        });
      });

      file.on("error", (error) => {
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, () => {});
        }
        resolve({
          success: false,
          error: error.message,
        });
      });
    } catch (error) {
      resolve({
        success: false,
        error: error.message,
      });
    }
  });
});

ipcMain.handle("show-item-in-folder", async (event, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handle app updates (if using auto-updater)
if (!isDev) {
  // Auto-updater code would go here
}
