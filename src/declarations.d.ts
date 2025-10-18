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

// Electron API types
interface ElectronAPI {
  getAppDataPath(): Promise<string>;
  ensureDirectory(path: string): Promise<void>;
  writeFile(path: string, data: Uint8Array | string): Promise<void>;
  readFile(path: string): Promise<string>;
  readFileAsBuffer(path: string): Promise<ArrayBuffer>;
  onMenuAction(callback: (action: string, data: any) => void): void;
  removeMenuActionListener(): void;
  openExternal(url: string): void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
