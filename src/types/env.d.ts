/**
 * Environment variable type definitions
 * These are injected at build time via esbuild
 */

declare global {
  // Build-time constants
  const __env__: "development" | "production" | "test";
  const __DEBUG__: boolean;
  const __BUILD_TARGET__: "development" | "production";
  const __BUILD_TIME__: string;
  const __VERSION__: string;
}

// Process environment variables (Node.js environment)
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: "development" | "production" | "test";
    DEBUG?: string;
    LOG_LEVEL?: "trace" | "debug" | "info" | "warn" | "error";
    BUILD_TARGET?: "development" | "production";
    SOURCE_MAP?: string;
    ZOTERO_PATH?: string;
    ZOTERO_BINARY_PATH?: string;
    ZOTERO_PROFILE?: string;
    ZOTERO_PROFILE_PATH?: string;
    HOT_RELOAD?: string;
  }
}

export {};
