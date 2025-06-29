const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
  ensureDirectory: (dirPath) => ipcRenderer.invoke('ensure-directory', dirPath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});