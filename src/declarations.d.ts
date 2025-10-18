// Type declarations for CSS modules
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}

// Type declarations for CSS
declare module "*.css" {
  const content: { [key: string]: string };
  export default content;
}

// File operation result interface
interface FileOperationResult {
  success: boolean;
  data?: Buffer | string | ArrayBuffer | Uint8Array;
  error?: string;
}

// Electron API types
interface ElectronAPI {
  getAppDataPath(): Promise<string>;
  ensureDirectory(path: string): Promise<void>;
  writeFile(
    path: string,
    data: Uint8Array | string
  ): Promise<FileOperationResult>;
  readFile(path: string): Promise<FileOperationResult>;
  readFileAsBuffer(path: string): Promise<ArrayBuffer>;
  onMenuAction(callback: (action: string, data: any) => void): void;
  removeMenuActionListener(): void;
  openExternal(url: string): void;
  fileExists(path: string): Promise<boolean>;
  downloadFile(url: string, filename: string): Promise<any>;
  showItemInFolder(path: string): Promise<void>;
  writeClipboard(text: string): Promise<void>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
