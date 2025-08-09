/**
 * Global Type Declarations for Zotero Plugin Environment
 */

// Browser globals that exist in Zotero's XUL environment
declare const window: Window & typeof globalThis;
declare const document: Document;
declare const navigator: Navigator;
declare const confirm: (message: string) => boolean;

// Zotero specific globals
declare const Components: any;
declare const Services: any;
declare const OS: {
  Path: {
    join: (...paths: string[]) => string;
    basename: (path: string) => string;
  };
  File: {
    makeDir: (path: string, options?: any) => Promise<void>;
    writeAtomic: (path: string, data: any, options?: any) => Promise<void>;
    stat: (path: string) => Promise<any>;
    remove: (path: string) => Promise<void>;
    read: (path: string) => Promise<any>;
    move: (from: string, to: string) => Promise<void>;
    DirectoryIterator: new (path: string) => any;
  };
  Constants: {
    Path: {
      tmpDir: string;
      profileDir: string;
    };
  };
};

declare const StopIteration: symbol;

// Extend Zotero types
declare namespace _ZoteroTypes {
  interface Zotero {
    Z2R?: {
      version: string;
    };
    ZipWriter: new () => any;
  }
}

// JSX for React components
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// Additional type declarations
declare module '@ant-design/icons' {
  export const FileTextOutlined: any;
  export const ReloadOutlined: any;
  export const DownloadOutlined: any;
  export const DeleteOutlined: any;
  export const InfoCircleOutlined: any;
  export const BugOutlined: any;
}

declare module 'antd' {
  export const Button: any;
  export const Card: any;
  export const Typography: any;
  export const Space: any;
  export const Alert: any;
  export const Progress: any;
  export const Tag: any;
  export const Statistic: any;
  export const Row: any;
  export const Col: any;
}
