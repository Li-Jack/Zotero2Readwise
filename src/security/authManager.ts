/**
 * Authentication Manager
 * 安全的认证管理器：Token 存储、验证和权限控制
 * 
 * Security Features:
 * - Protected prefix for token storage in Zotero preferences
 * - Token never printed in logs
 * - Secure token validation
 * - Session management
 */

import { Logger } from '../utils/logger';
import { config } from '../../package.json';

export interface AuthConfig {
  tokenPrefix?: string;
  tokenMinLength?: number;
  sessionTimeout?: number; // in minutes
}

export interface AuthStatus {
  isAuthenticated: boolean;
  lastValidated?: Date;
  sessionExpired?: boolean;
}

export class AuthManager {
  private static instance: AuthManager;
  private readonly logger: Logger;
  private readonly Zotero: any;
  private readonly protectedPrefix: string;
  private readonly tokenKey: string;
  private readonly tokenMinLength: number;
  private readonly sessionTimeout: number;
  private lastValidation: Date | null = null;
  private cachedToken: string | null = null;
  
  // Sensitive key patterns that should never be logged
  private readonly sensitiveKeyPatterns = [
    'token',
    'apikey',
    'api_key',
    'password',
    'secret',
    'credential',
    'auth'
  ];

  private constructor(config: AuthConfig = {}) {
    // @ts-ignore
    this.Zotero = window.Zotero || Zotero;
    
    // Create logger with sanitization enabled
    this.logger = new Logger({
      prefix: '[Z2R:Auth]',
      sanitizeTokens: true,
      enableZoteroDebug: false // Never log auth to Zotero debug
    });
    
    // Use protected prefix to prevent accidental exposure
    this.protectedPrefix = config.tokenPrefix || `extensions.zotero.${config.addonRef}.protected.`;
    this.tokenKey = `${this.protectedPrefix}apiToken`;
    this.tokenMinLength = config.tokenMinLength || 20;
    this.sessionTimeout = (config.sessionTimeout || 30) * 60 * 1000; // Convert to milliseconds
  }

  public static getInstance(config?: AuthConfig): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager(config);
    }
    return AuthManager.instance;
  }

  /**
   * 安全地存储 API Token
   * Token 使用受保护的前缀存储，永不记录到日志
   */
  public async setToken(token: string): Promise<boolean> {
    try {
      // Validate token format
      if (!this.validateTokenFormat(token)) {
        this.logger.error('Invalid token format');
        return false;
      }

      // Store token with protected prefix
      this.Zotero.Prefs.set(this.tokenKey, token);
      
      // Clear cache to force re-read
      this.cachedToken = null;
      this.lastValidation = null;
      
      // Log success without exposing token
      this.logger.info('API token stored securely');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to store token:', error);
      return false;
    }
  }

  /**
   * 安全地获取 API Token
   * 从受保护的存储中读取，不会记录到日志
   */
  public getToken(): string | null {
    try {
      // Use cached token if available and session is valid
      if (this.cachedToken && this.isSessionValid()) {
        return this.cachedToken;
      }

      // Read from secure storage
      const token = this.Zotero.Prefs.get(this.tokenKey);
      
      if (token && this.validateTokenFormat(token)) {
        this.cachedToken = token;
        this.lastValidation = new Date();
        return token;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to retrieve token');
      return null;
    }
  }

  /**
   * 检查是否已认证
   */
  public isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && token.length > 0;
  }

  /**
   * 获取认证状态
   */
  public getAuthStatus(): AuthStatus {
    const isAuthenticated = this.isAuthenticated();
    const sessionExpired = !this.isSessionValid();
    
    return {
      isAuthenticated,
      lastValidated: this.lastValidation || undefined,
      sessionExpired: isAuthenticated ? sessionExpired : undefined
    };
  }

  /**
   * 验证 Token 格式（不记录 token 内容）
   */
  private validateTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Remove whitespace
    const trimmed = token.trim();
    
    // Check minimum length
    if (trimmed.length < this.tokenMinLength) {
      this.logger.warn(`Token too short (min ${this.tokenMinLength} characters)`);
      return false;
    }
    
    // Check for common invalid patterns (without logging the token)
    if (trimmed.includes(' ') || trimmed.includes('\n') || trimmed.includes('\t')) {
      this.logger.warn('Token contains invalid whitespace characters');
      return false;
    }
    
    return true;
  }

  /**
   * 检查会话是否有效
   */
  private isSessionValid(): boolean {
    if (!this.lastValidation) {
      return false;
    }
    
    const now = new Date();
    const timeSinceValidation = now.getTime() - this.lastValidation.getTime();
    
    return timeSinceValidation < this.sessionTimeout;
  }

  /**
   * 清除 Token（登出）
   */
  public async clearToken(): Promise<void> {
    try {
      // Clear from secure storage
      this.Zotero.Prefs.clear(this.tokenKey);
      
      // Clear cached values
      this.cachedToken = null;
      this.lastValidation = null;
      
      this.logger.info('Authentication cleared');
    } catch (error) {
      this.logger.error('Failed to clear authentication:', error);
      throw error;
    }
  }

  /**
   * 刷新会话
   */
  public refreshSession(): void {
    if (this.isAuthenticated()) {
      this.lastValidation = new Date();
      this.logger.debug('Session refreshed');
    }
  }

  /**
   * 验证 API Token（通过 API 调用）
   * 返回验证结果，不记录 token
   */
  public async validateToken(apiClient: any): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) {
        this.logger.warn('No token to validate');
        return false;
      }

      // Attempt API call to validate token
      // This should be a lightweight endpoint
      const response = await apiClient.testConnection();
      
      if (response.success) {
        this.lastValidation = new Date();
        this.logger.info('Token validated successfully');
        return true;
      } else {
        this.logger.warn('Token validation failed');
        return false;
      }
    } catch (error) {
      this.logger.error('Token validation error:', error);
      return false;
    }
  }

  /**
   * 获取受保护的请求头（不记录到日志）
   */
  public getAuthHeaders(): Record<string, string> | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    return {
      'Authorization': `Token ${token}`,
      'X-Client': 'zotero-readwise-sync',
      'X-Client-Version': config.version || '1.0.0'
    };
  }

  /**
   * 清理敏感信息（用于日志记录）
   */
  public sanitizeForLogging(data: any): any {
    if (!data) return data;
    
    if (typeof data === 'string') {
      // Don't log anything that looks like a token
      if (data.length > 20 && /^[A-Za-z0-9_\-]+$/.test(data)) {
        return '[REDACTED]';
      }
      return data;
    }
    
    if (typeof data === 'object') {
      const sanitized: any = Array.isArray(data) ? [] : {};
      
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        
        // Check if key contains sensitive patterns
        const isSensitive = this.sensitiveKeyPatterns.some(pattern => 
          lowerKey.includes(pattern)
        );
        
        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeForLogging(value);
        }
      }
      
      return sanitized;
    }
    
    return data;
  }

  /**
   * 导出认证状态（不包含 token）
   */
  public exportState(): object {
    return {
      isAuthenticated: this.isAuthenticated(),
      lastValidated: this.lastValidation?.toISOString(),
      sessionValid: this.isSessionValid(),
      sessionTimeout: this.sessionTimeout / 60000 // Convert to minutes
    };
  }

  /**
   * 销毁实例（用于测试）
   */
  public static destroy(): void {
    AuthManager.instance = null as any;
  }
}

// Export singleton getter for convenience
export const getAuthManager = (config?: AuthConfig) => AuthManager.getInstance(config);
