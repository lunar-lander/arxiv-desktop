// Module declarations for packages without types
declare module "mathjax";
declare module "react-dom/client";

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

// ElectronAPI and Window types are declared in src/shared/types/index.ts
