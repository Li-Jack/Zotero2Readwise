/**
 * Privacy Manager
 * 隐私管理器：深链控制、数据收集和第三方报告
 * 
 * Privacy Features:
 * - Deep links only available in local environment
 * - No third-party reporting without user consent
 * - Configurable privacy levels
 * - Data anonymization
 */

import { Logger } from '../utils/logger';

export interface PrivacyConfig {
  enableDeepLinks?: boolean;
  enableAnalytics?: boolean;
  enableCrashReporting?: boolean;
  anonymizeData?: boolean;
  shareWithReadwise?: boolean;
}

export interface PrivacySettings {
  deepLinksEnabled: boolean;
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  dataAnonymized: boolean;
  readwiseSharingEnabled: boolean;
  privacyLevel: 'strict' | 'balanced' | 'permissive';
}

export interface DeepLinkOptions {
  includeInNotes?: boolean;
  useLocalOnly?: boolean;
  expireAfter?: number; // hours
}

export class PrivacyManager {
  private static instance: PrivacyManager;
  private readonly logger: Logger;
  private readonly Zotero: any;
  private readonly prefsPrefix: string;
  private settings: PrivacySettings;
  
  // Privacy preference keys
  private readonly privacyKeys = {
    deepLinks: 'privacy.enableDeepLinks',
    analytics: 'privacy.enableAnalytics',
    crashReporting: 'privacy.enableCrashReporting',
    anonymize: 'privacy.anonymizeData',
    readwiseSharing: 'privacy.shareWithReadwise',
    privacyLevel: 'privacy.level'
  };

  private constructor() {
    // @ts-ignore
    this.Zotero = window.Zotero || Zotero;
    
    this.logger = new Logger({
      prefix: '[Z2R:Privacy]',
      sanitizeTokens: true
    });
    
    this.prefsPrefix = 'extensions.zotero.z2r.';
    this.settings = this.loadSettings();
  }

  public static getInstance(): PrivacyManager {
    if (!PrivacyManager.instance) {
      PrivacyManager.instance = new PrivacyManager();
    }
    return PrivacyManager.instance;
  }

  /**
   * 加载隐私设置
   */
  private loadSettings(): PrivacySettings {
    const deepLinksEnabled = this.getPref(this.privacyKeys.deepLinks, true);
    const analyticsEnabled = this.getPref(this.privacyKeys.analytics, false);
    const crashReportingEnabled = this.getPref(this.privacyKeys.crashReporting, false);
    const dataAnonymized = this.getPref(this.privacyKeys.anonymize, true);
    const readwiseSharingEnabled = this.getPref(this.privacyKeys.readwiseSharing, false);
    const privacyLevel = this.getPref(this.privacyKeys.privacyLevel, 'balanced') as 'strict' | 'balanced' | 'permissive';

    return {
      deepLinksEnabled,
      analyticsEnabled,
      crashReportingEnabled,
      dataAnonymized,
      readwiseSharingEnabled,
      privacyLevel
    };
  }

  /**
   * 获取偏好设置
   */
  private getPref(key: string, defaultValue: any): any {
    try {
      const fullKey = this.prefsPrefix + key;
      return this.Zotero.Prefs.get(fullKey) ?? defaultValue;
    } catch (error) {
      this.logger.warn(`Failed to get preference ${key}, using default`);
      return defaultValue;
    }
  }

  /**
   * 设置偏好设置
   */
  private setPref(key: string, value: any): void {
    try {
      const fullKey = this.prefsPrefix + key;
      this.Zotero.Prefs.set(fullKey, value);
    } catch (error) {
      this.logger.error(`Failed to set preference ${key}:`, error);
    }
  }

  /**
   * 更新隐私设置
   */
  public updateSettings(config: Partial<PrivacyConfig>): void {
    if (config.enableDeepLinks !== undefined) {
      this.settings.deepLinksEnabled = config.enableDeepLinks;
      this.setPref(this.privacyKeys.deepLinks, config.enableDeepLinks);
    }
    
    if (config.enableAnalytics !== undefined) {
      this.settings.analyticsEnabled = config.enableAnalytics;
      this.setPref(this.privacyKeys.analytics, config.enableAnalytics);
    }
    
    if (config.enableCrashReporting !== undefined) {
      this.settings.crashReportingEnabled = config.enableCrashReporting;
      this.setPref(this.privacyKeys.crashReporting, config.enableCrashReporting);
    }
    
    if (config.anonymizeData !== undefined) {
      this.settings.dataAnonymized = config.anonymizeData;
      this.setPref(this.privacyKeys.anonymize, config.anonymizeData);
    }
    
    if (config.shareWithReadwise !== undefined) {
      this.settings.readwiseSharingEnabled = config.shareWithReadwise;
      this.setPref(this.privacyKeys.readwiseSharing, config.shareWithReadwise);
    }
    
    this.logger.info('Privacy settings updated');
  }

  /**
   * 设置隐私级别（预设配置）
   */
  public setPrivacyLevel(level: 'strict' | 'balanced' | 'permissive'): void {
    this.settings.privacyLevel = level;
    this.setPref(this.privacyKeys.privacyLevel, level);
    
    switch (level) {
      case 'strict':
        this.updateSettings({
          enableDeepLinks: false,
          enableAnalytics: false,
          enableCrashReporting: false,
          anonymizeData: true,
          shareWithReadwise: false
        });
        break;
        
      case 'balanced':
        this.updateSettings({
          enableDeepLinks: true,
          enableAnalytics: false,
          enableCrashReporting: true,
          anonymizeData: true,
          shareWithReadwise: false
        });
        break;
        
      case 'permissive':
        this.updateSettings({
          enableDeepLinks: true,
          enableAnalytics: true,
          enableCrashReporting: true,
          anonymizeData: false,
          shareWithReadwise: true
        });
        break;
    }
    
    this.logger.info(`Privacy level set to: ${level}`);
  }

  /**
   * 获取当前隐私设置
   */
  public getSettings(): PrivacySettings {
    return { ...this.settings };
  }

  /**
   * 生成深链（仅在本地环境可用）
   */
  public generateDeepLink(
    itemKey: string,
    annotationKey?: string,
    attachmentKey?: string,
    options: DeepLinkOptions = {}
  ): string | null {
    // Check if deep links are enabled
    if (!this.settings.deepLinksEnabled) {
      this.logger.debug('Deep links are disabled by privacy settings');
      return null;
    }
    
    // Only generate for local environment
    if (!this.isLocalEnvironment()) {
      this.logger.warn('Deep links only available in local environment');
      return null;
    }
    
    const useLocal = options.useLocalOnly !== false;
    
    // Build deep link
    let deepLink = 'zotero://';
    
    if (annotationKey && attachmentKey) {
      // Link to specific annotation in PDF
      deepLink += `open-pdf/library/items/${attachmentKey}?annotation=${annotationKey}`;
    } else if (attachmentKey) {
      // Link to attachment
      deepLink += `open-pdf/library/items/${attachmentKey}`;
    } else {
      // Link to parent item
      deepLink += `select/library/items/${itemKey}`;
    }
    
    // Add expiration if specified
    if (options.expireAfter) {
      const expiration = new Date();
      expiration.setHours(expiration.getHours() + options.expireAfter);
      deepLink += `&expires=${expiration.getTime()}`;
    }
    
    // Add local-only flag
    if (useLocal) {
      deepLink += '&local=true';
    }
    
    this.logger.debug('Generated deep link (local only)');
    return deepLink;
  }

  /**
   * 验证深链是否有效
   */
  public validateDeepLink(deepLink: string): boolean {
    if (!deepLink || !deepLink.startsWith('zotero://')) {
      return false;
    }
    
    // Check for expiration
    const expirationMatch = deepLink.match(/expires=(\d+)/);
    if (expirationMatch) {
      const expiration = parseInt(expirationMatch[1], 10);
      if (Date.now() > expiration) {
        this.logger.debug('Deep link has expired');
        return false;
      }
    }
    
    // Check for local-only flag
    if (deepLink.includes('local=true') && !this.isLocalEnvironment()) {
      this.logger.debug('Local-only deep link in non-local environment');
      return false;
    }
    
    return true;
  }

  /**
   * 检查是否为本地环境
   */
  private isLocalEnvironment(): boolean {
    try {
      // Check if running in Zotero desktop app
      const isDesktop = this.Zotero.platformMajorVersion !== undefined;
      
      // Check if not in a web/cloud environment
      const isLocal = typeof window !== 'undefined' && 
                     window.location?.protocol === 'chrome:' ||
                     window.location?.protocol === 'zotero:';
      
      return isDesktop || isLocal;
    } catch (error) {
      // Assume local if we can't determine
      return true;
    }
  }

  /**
   * 匿名化数据
   */
  public anonymizeData(data: any): any {
    if (!this.settings.dataAnonymized) {
      return data;
    }
    
    const anonymize = (value: any): any => {
      if (value === null || value === undefined) return value;
      
      if (typeof value === 'string') {
        // Anonymize email addresses
        if (value.includes('@')) {
          return value.replace(/([^@]{1,3})[^@]*@.*/, '$1***@***');
        }
        
        // Anonymize URLs (keep domain only)
        if (value.startsWith('http')) {
          try {
            const url = new URL(value);
            return `${url.protocol}//${url.hostname}/***`;
          } catch {
            return 'https://***';
          }
        }
        
        // Anonymize IDs/Keys (keep first 3 chars)
        if (value.length > 10 && /^[A-Z0-9]+$/i.test(value)) {
          return value.substring(0, 3) + '***';
        }
      }
      
      if (Array.isArray(value)) {
        return value.map(anonymize);
      }
      
      if (typeof value === 'object') {
        const result: any = {};
        for (const [key, val] of Object.entries(value)) {
          // Skip sensitive fields entirely
          if (['email', 'user', 'author', 'creator'].includes(key.toLowerCase())) {
            result[key] = '[ANONYMIZED]';
          } else {
            result[key] = anonymize(val);
          }
        }
        return result;
      }
      
      return value;
    };
    
    return anonymize(data);
  }

  /**
   * 检查是否可以发送数据到第三方
   */
  public canShareWithThirdParty(service: 'readwise' | 'analytics' | 'crash'): boolean {
    switch (service) {
      case 'readwise':
        return this.settings.readwiseSharingEnabled;
      case 'analytics':
        return this.settings.analyticsEnabled;
      case 'crash':
        return this.settings.crashReportingEnabled;
      default:
        return false;
    }
  }

  /**
   * 记录隐私事件（用于审计）
   */
  public logPrivacyEvent(event: string, details?: any): void {
    const anonymizedDetails = this.anonymizeData(details);
    
    this.logger.info(`Privacy event: ${event}`, {
      timestamp: new Date().toISOString(),
      privacyLevel: this.settings.privacyLevel,
      details: anonymizedDetails
    });
  }

  /**
   * 导出隐私报告
   */
  public exportPrivacyReport(): object {
    return {
      settings: this.getSettings(),
      environment: {
        isLocal: this.isLocalEnvironment(),
        platform: this.Zotero.platformMajorVersion || 'unknown'
      },
      dataCollection: {
        deepLinks: this.settings.deepLinksEnabled ? 'local-only' : 'disabled',
        analytics: this.settings.analyticsEnabled ? 'enabled' : 'disabled',
        crashReporting: this.settings.crashReportingEnabled ? 'enabled' : 'disabled',
        dataAnonymization: this.settings.dataAnonymized ? 'enabled' : 'disabled',
        thirdPartySharing: {
          readwise: this.settings.readwiseSharingEnabled ? 'enabled' : 'disabled'
        }
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 重置所有隐私设置到默认值
   */
  public resetToDefaults(): void {
    this.setPrivacyLevel('balanced');
    this.logger.info('Privacy settings reset to defaults');
  }
}

// Export singleton getter
export const getPrivacyManager = () => PrivacyManager.getInstance();
