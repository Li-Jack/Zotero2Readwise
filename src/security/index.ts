/**
 * Security Module
 * 权限、安全与隐私管理
 * 
 * Main Features:
 * - Secure token storage with protected prefix
 * - Privacy-compliant deep links (local only)
 * - Data management and cleanup operations
 * - User authentication and session management
 */

export { AuthManager, getAuthManager } from './authManager';
export type { AuthConfig, AuthStatus } from './authManager';

export { PrivacyManager, getPrivacyManager } from './privacyManager';
export type { 
  PrivacyConfig, 
  PrivacySettings, 
  DeepLinkOptions 
} from './privacyManager';

export { DataManager, getDataManager } from './dataManager';
export type { 
  DataCleanupOptions, 
  DataExportOptions, 
  BackupInfo 
} from './dataManager';

// Re-export common security utilities
export {
  isSecureContext,
  sanitizeUrl,
  validateApiToken,
  hashSensitiveData
} from './utils';

// Version for compatibility checks
export const SECURITY_MODULE_VERSION = '1.0.0';
