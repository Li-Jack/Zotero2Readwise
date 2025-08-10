/**
 * Security & Privacy Panel
 * 安全与隐私控制面板
 */

import { AuthManager } from '../../security/authManager';
import { PrivacyManager } from '../../security/privacyManager';
import { DataManager } from '../../security/dataManager';
import { StateStore } from '../../storage/stateStore';
import { Logger } from '../../utils/logger';

export class SecurityPanel {
  private readonly authManager: AuthManager;
  private readonly privacyManager: PrivacyManager;
  private readonly dataManager: DataManager;
  private readonly stateStore: StateStore;
  private readonly logger: Logger;
  private readonly document: Document;
  private readonly Zotero: any;

  constructor(
    stateStore: StateStore,
    logger: Logger,
    doc: Document,
    zoteroGlobal: any
  ) {
    this.stateStore = stateStore;
    this.logger = logger.createChild('SecurityPanel');
    this.document = doc;
    this.Zotero = zoteroGlobal;
    
    // Initialize managers
    this.authManager = AuthManager.getInstance();
    this.privacyManager = PrivacyManager.getInstance();
    this.dataManager = DataManager.getInstance(stateStore);
  }

  async render(container: HTMLElement): Promise<void> {
    container.innerHTML = this.getHtmlTemplate();
    
    await this.loadSettings();
    this.attachEventListeners();
    await this.updateStatistics();
  }

  private getHtmlTemplate(): string {
    return `
      <div id="z2r-security-panel" class="security-panel">
        <h2>Security & Privacy Settings</h2>
        
        <!-- Authentication Section -->
        <fieldset class="auth-section">
          <legend>🔐 Authentication</legend>
          <div class="pref-row">
            <label for="apiToken">Readwise API Token:</label>
            <div class="token-input-group">
              <input type="password" id="apiToken" class="token-input" placeholder="Enter your token securely">
              <button id="toggleTokenVisibility" class="btn-icon" title="Toggle visibility">👁</button>
              <button id="validateToken" class="btn-primary">Validate</button>
            </div>
          </div>
          <div class="pref-row">
            <div id="authStatus" class="auth-status">
              <span class="status-icon">⚪</span>
              <span class="status-text">Not authenticated</span>
            </div>
          </div>
          <div class="pref-row">
            <p class="info-text">
              <strong>🔒 Security Note:</strong> Your token is stored with a protected prefix and never logged.
            </p>
          </div>
        </fieldset>

        <!-- Privacy Settings -->
        <fieldset class="privacy-section">
          <legend>🛡️ Privacy Settings</legend>
          
          <div class="pref-row">
            <label>Privacy Level:</label>
            <div class="privacy-levels">
              <label class="radio-option">
                <input type="radio" name="privacyLevel" value="strict">
                <span class="level-name">Strict</span>
                <span class="level-desc">Maximum privacy, no data sharing</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="privacyLevel" value="balanced" checked>
                <span class="level-name">Balanced</span>
                <span class="level-desc">Local features enabled, limited sharing</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="privacyLevel" value="permissive">
                <span class="level-name">Permissive</span>
                <span class="level-desc">All features enabled</span>
              </label>
            </div>
          </div>

          <div class="pref-row">
            <h4>Individual Settings</h4>
          </div>
          
          <div class="pref-row">
            <label class="checkbox-label">
              <input type="checkbox" id="enableDeepLinks" checked>
              <span>Enable Deep Links (local only)</span>
            </label>
            <span class="setting-info">Generate Zotero deep links for annotations</span>
          </div>
          
          <div class="pref-row">
            <label class="checkbox-label">
              <input type="checkbox" id="anonymizeData" checked>
              <span>Anonymize Data</span>
            </label>
            <span class="setting-info">Remove personal information from logs and reports</span>
          </div>
          
          <div class="pref-row">
            <label class="checkbox-label">
              <input type="checkbox" id="shareWithReadwise">
              <span>Share Usage Data with Readwise</span>
            </label>
            <span class="setting-info">Help improve the service (opt-in)</span>
          </div>
          
          <div class="pref-row">
            <label class="checkbox-label">
              <input type="checkbox" id="enableCrashReporting">
              <span>Enable Crash Reporting</span>
            </label>
            <span class="setting-info">Send anonymous crash reports</span>
          </div>
        </fieldset>

        <!-- Data Management -->
        <fieldset class="data-section">
          <legend>💾 Data Management</legend>
          
          <div class="pref-row">
            <h4>Local Data</h4>
            <div id="dataStatistics" class="data-stats">
              <div class="stat-item">
                <span class="stat-label">Synced Items:</span>
                <span class="stat-value" id="statSyncedItems">-</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Synced Annotations:</span>
                <span class="stat-value" id="statSyncedAnnotations">-</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Cache Size:</span>
                <span class="stat-value" id="statCacheSize">-</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Backups:</span>
                <span class="stat-value" id="statBackups">-</span>
              </div>
            </div>
          </div>
          
          <div class="pref-row">
            <h4>Actions</h4>
            <div class="action-buttons">
              <button id="clearSyncState" class="btn-warning">
                Clear Sync State
              </button>
              <button id="clearCache" class="btn-warning">
                Clear Cache
              </button>
              <button id="clearAllData" class="btn-danger">
                Clear All Data
              </button>
            </div>
          </div>
          
          <div class="pref-row">
            <h4>Backup & Export</h4>
            <div class="action-buttons">
              <button id="createBackup" class="btn-secondary">
                Create Backup
              </button>
              <button id="restoreBackup" class="btn-secondary">
                Restore Backup
              </button>
              <button id="exportData" class="btn-secondary">
                Export Data
              </button>
              <button id="importData" class="btn-secondary">
                Import Data
              </button>
            </div>
          </div>
        </fieldset>

        <!-- Account Actions -->
        <fieldset class="account-section">
          <legend>👤 Account</legend>
          
          <div class="pref-row">
            <div class="account-actions">
              <button id="logout" class="btn-warning">
                Logout
              </button>
              <button id="logoutAndClear" class="btn-danger">
                Logout & Clear Data
              </button>
            </div>
          </div>
          
          <div class="pref-row">
            <p class="warning-text">
              <strong>⚠️ Warning:</strong> Logout will remove your authentication. 
              "Logout & Clear Data" will also remove all sync history.
            </p>
          </div>
        </fieldset>

        <!-- Privacy Report -->
        <fieldset class="report-section">
          <legend>📊 Privacy Report</legend>
          <div class="pref-row">
            <button id="generatePrivacyReport" class="btn-secondary">
              Generate Privacy Report
            </button>
            <div id="privacyReportContent" class="report-content" style="display: none;">
              <pre id="privacyReportText"></pre>
            </div>
          </div>
        </fieldset>
      </div>

      <style>
        .security-panel {
          padding: 20px;
          max-width: 800px;
        }
        
        .security-panel fieldset {
          margin-bottom: 20px;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        
        .security-panel legend {
          font-weight: bold;
          padding: 0 10px;
        }
        
        .pref-row {
          margin-bottom: 15px;
        }
        
        .token-input-group {
          display: flex;
          gap: 10px;
          margin-top: 5px;
        }
        
        .token-input {
          flex: 1;
          padding: 5px;
          border: 1px solid #ccc;
          border-radius: 3px;
        }
        
        .btn-icon {
          padding: 5px 10px;
          cursor: pointer;
          background: #f0f0f0;
          border: 1px solid #ccc;
          border-radius: 3px;
        }
        
        .btn-primary, .btn-secondary, .btn-warning, .btn-danger {
          padding: 6px 12px;
          cursor: pointer;
          border: none;
          border-radius: 3px;
          font-weight: 500;
        }
        
        .btn-primary {
          background: #4CAF50;
          color: white;
        }
        
        .btn-secondary {
          background: #2196F3;
          color: white;
        }
        
        .btn-warning {
          background: #ff9800;
          color: white;
        }
        
        .btn-danger {
          background: #f44336;
          color: white;
        }
        
        .auth-status {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 5px;
        }
        
        .status-icon {
          font-size: 20px;
        }
        
        .auth-status.authenticated .status-icon {
          color: #4CAF50;
        }
        
        .auth-status.unauthenticated .status-icon {
          color: #f44336;
        }
        
        .privacy-levels {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
        }
        
        .radio-option {
          display: flex;
          align-items: center;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
          cursor: pointer;
        }
        
        .radio-option:hover {
          background: #f5f5f5;
        }
        
        .radio-option input {
          margin-right: 10px;
        }
        
        .level-name {
          font-weight: bold;
          margin-right: 10px;
        }
        
        .level-desc {
          color: #666;
          font-size: 0.9em;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .setting-info {
          color: #666;
          font-size: 0.9em;
          margin-left: 30px;
        }
        
        .data-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 5px;
        }
        
        .stat-item {
          display: flex;
          justify-content: space-between;
        }
        
        .stat-label {
          font-weight: 500;
        }
        
        .stat-value {
          color: #2196F3;
        }
        
        .action-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .account-actions {
          display: flex;
          gap: 10px;
        }
        
        .info-text {
          padding: 10px;
          background: #e3f2fd;
          border-radius: 5px;
          margin: 0;
        }
        
        .warning-text {
          padding: 10px;
          background: #fff3e0;
          border-radius: 5px;
          margin: 0;
        }
        
        .report-content {
          margin-top: 15px;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 5px;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .report-content pre {
          margin: 0;
          white-space: pre-wrap;
        }
      </style>
    `;
  }

  private async loadSettings(): Promise<void> {
    // Load authentication status
    const authStatus = this.authManager.getAuthStatus();
    this.updateAuthStatus(authStatus.isAuthenticated);
    
    // Load privacy settings
    const privacySettings = this.privacyManager.getSettings();
    
    // Set privacy level
    const levelRadio = this.document.querySelector(
      `input[name="privacyLevel"][value="${privacySettings.privacyLevel}"]`
    ) as HTMLInputElement;
    if (levelRadio) levelRadio.checked = true;
    
    // Set individual settings
    (this.document.getElementById('enableDeepLinks') as HTMLInputElement).checked = 
      privacySettings.deepLinksEnabled;
    (this.document.getElementById('anonymizeData') as HTMLInputElement).checked = 
      privacySettings.dataAnonymized;
    (this.document.getElementById('shareWithReadwise') as HTMLInputElement).checked = 
      privacySettings.readwiseSharingEnabled;
    (this.document.getElementById('enableCrashReporting') as HTMLInputElement).checked = 
      privacySettings.crashReportingEnabled;
  }

  private attachEventListeners(): void {
    // Token management
    this.document.getElementById('toggleTokenVisibility')?.addEventListener('click', () => {
      this.toggleTokenVisibility();
    });
    
    this.document.getElementById('validateToken')?.addEventListener('click', async () => {
      await this.validateToken();
    });
    
    this.document.getElementById('apiToken')?.addEventListener('change', async (e) => {
      const token = (e.target as HTMLInputElement).value;
      await this.saveToken(token);
    });
    
    // Privacy level
    this.document.querySelectorAll('input[name="privacyLevel"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const level = (e.target as HTMLInputElement).value as 'strict' | 'balanced' | 'permissive';
        this.privacyManager.setPrivacyLevel(level);
        this.loadSettings(); // Reload to reflect changes
      });
    });
    
    // Individual privacy settings
    this.document.getElementById('enableDeepLinks')?.addEventListener('change', (e) => {
      this.privacyManager.updateSettings({
        enableDeepLinks: (e.target as HTMLInputElement).checked
      });
    });
    
    this.document.getElementById('anonymizeData')?.addEventListener('change', (e) => {
      this.privacyManager.updateSettings({
        anonymizeData: (e.target as HTMLInputElement).checked
      });
    });
    
    this.document.getElementById('shareWithReadwise')?.addEventListener('change', (e) => {
      this.privacyManager.updateSettings({
        shareWithReadwise: (e.target as HTMLInputElement).checked
      });
    });
    
    this.document.getElementById('enableCrashReporting')?.addEventListener('change', (e) => {
      this.privacyManager.updateSettings({
        enableCrashReporting: (e.target as HTMLInputElement).checked
      });
    });
    
    // Data management
    this.document.getElementById('clearSyncState')?.addEventListener('click', async () => {
      await this.clearSyncState();
    });
    
    this.document.getElementById('clearCache')?.addEventListener('click', async () => {
      await this.clearCache();
    });
    
    this.document.getElementById('clearAllData')?.addEventListener('click', async () => {
      await this.clearAllData();
    });
    
    this.document.getElementById('createBackup')?.addEventListener('click', async () => {
      await this.createBackup();
    });
    
    this.document.getElementById('restoreBackup')?.addEventListener('click', async () => {
      await this.restoreBackup();
    });
    
    this.document.getElementById('exportData')?.addEventListener('click', async () => {
      await this.exportData();
    });
    
    this.document.getElementById('importData')?.addEventListener('click', async () => {
      await this.importData();
    });
    
    // Account actions
    this.document.getElementById('logout')?.addEventListener('click', async () => {
      await this.logout(false);
    });
    
    this.document.getElementById('logoutAndClear')?.addEventListener('click', async () => {
      await this.logout(true);
    });
    
    // Privacy report
    this.document.getElementById('generatePrivacyReport')?.addEventListener('click', () => {
      this.generatePrivacyReport();
    });
  }

  private toggleTokenVisibility(): void {
    const input = this.document.getElementById('apiToken') as HTMLInputElement;
    const button = this.document.getElementById('toggleTokenVisibility') as HTMLButtonElement;
    
    if (input.type === 'password') {
      input.type = 'text';
      button.textContent = '🙈';
    } else {
      input.type = 'password';
      button.textContent = '👁';
    }
  }

  private async saveToken(token: string): Promise<void> {
    const success = await this.authManager.setToken(token);
    if (success) {
      this.updateAuthStatus(true);
      this.showNotification('Token saved securely', 'success');
    } else {
      this.showNotification('Invalid token format', 'error');
    }
  }

  private async validateToken(): Promise<void> {
    // TODO: Implement actual validation with API
    const isAuthenticated = this.authManager.isAuthenticated();
    
    if (isAuthenticated) {
      this.showNotification('Token is valid', 'success');
      this.updateAuthStatus(true);
    } else {
      this.showNotification('Token validation failed', 'error');
      this.updateAuthStatus(false);
    }
  }

  private updateAuthStatus(isAuthenticated: boolean): void {
    const statusEl = this.document.getElementById('authStatus');
    const statusIcon = statusEl?.querySelector('.status-icon');
    const statusText = statusEl?.querySelector('.status-text');
    
    if (isAuthenticated) {
      statusEl?.classList.add('authenticated');
      statusEl?.classList.remove('unauthenticated');
      if (statusIcon) statusIcon.textContent = '✅';
      if (statusText) statusText.textContent = 'Authenticated';
    } else {
      statusEl?.classList.add('unauthenticated');
      statusEl?.classList.remove('authenticated');
      if (statusIcon) statusIcon.textContent = '❌';
      if (statusText) statusText.textContent = 'Not authenticated';
    }
  }

  private async updateStatistics(): Promise<void> {
    const stats = await this.dataManager.getDataStatistics();
    
    this.document.getElementById('statSyncedItems')!.textContent = 
      stats.syncedItems?.toString() || '0';
    this.document.getElementById('statSyncedAnnotations')!.textContent = 
      stats.syncedAnnotations?.toString() || '0';
    this.document.getElementById('statCacheSize')!.textContent = 
      this.formatBytes(stats.cacheSize || 0);
    this.document.getElementById('statBackups')!.textContent = 
      stats.backupCount?.toString() || '0';
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  private async clearSyncState(): Promise<void> {
    const confirmed = await this.confirm(
      'Clear Sync State',
      'This will reset all sync history. Items will be re-synced on next sync. Continue?'
    );
    
    if (confirmed) {
      await this.dataManager.clearLocalState({ 
        clearSyncState: true,
        clearPreferences: false,
        clearCache: false
      });
      await this.updateStatistics();
      this.showNotification('Sync state cleared', 'success');
    }
  }

  private async clearCache(): Promise<void> {
    const confirmed = await this.confirm(
      'Clear Cache',
      'This will remove all cached data. Continue?'
    );
    
    if (confirmed) {
      await this.dataManager.clearLocalState({ 
        clearSyncState: false,
        clearCache: true
      });
      await this.updateStatistics();
      this.showNotification('Cache cleared', 'success');
    }
  }

  private async clearAllData(): Promise<void> {
    const confirmed = await this.confirm(
      'Clear All Data',
      'This will remove ALL local data including sync history and cache. Your token will be preserved. Continue?'
    );
    
    if (confirmed) {
      await this.dataManager.clearLocalState({
        clearSyncState: true,
        clearCache: true,
        clearLogs: true,
        clearToken: false,
        keepBackup: true
      });
      await this.updateStatistics();
      this.showNotification('All data cleared', 'success');
    }
  }

  private async createBackup(): Promise<void> {
    try {
      const backup = await this.dataManager.createBackup('manual');
      this.showNotification(`Backup created: ${backup.id}`, 'success');
      await this.updateStatistics();
    } catch (error) {
      this.showNotification('Failed to create backup', 'error');
    }
  }

  private async restoreBackup(): Promise<void> {
    // TODO: Show backup selection dialog
    const confirmed = await this.confirm(
      'Restore Backup',
      'This will restore the most recent backup. Current data will be replaced. Continue?'
    );
    
    if (confirmed) {
      try {
        await this.dataManager.restoreLatestBackup();
        this.showNotification('Backup restored', 'success');
        await this.updateStatistics();
      } catch (error) {
        this.showNotification('Failed to restore backup', 'error');
      }
    }
  }

  private async exportData(): Promise<void> {
    try {
      const path = await this.dataManager.exportData({
        includeSyncState: true,
        includePreferences: true,
        includePrivacySettings: true,
        anonymize: this.privacyManager.getSettings().dataAnonymized
      });
      this.showNotification(`Data exported to: ${path}`, 'success');
    } catch (error) {
      this.showNotification('Failed to export data', 'error');
    }
  }

  private async importData(): Promise<void> {
    // TODO: Show file picker dialog
    this.showNotification('Import feature coming soon', 'info');
  }

  private async logout(clearData: boolean): Promise<void> {
    const message = clearData ? 
      'This will log you out and clear all sync data. Continue?' :
      'This will log you out. Your sync history will be preserved. Continue?';
    
    const confirmed = await this.confirm('Logout', message);
    
    if (confirmed) {
      await this.dataManager.logout({ clearData });
      this.updateAuthStatus(false);
      await this.updateStatistics();
      
      // Clear token from input
      (this.document.getElementById('apiToken') as HTMLInputElement).value = '';
    }
  }

  private generatePrivacyReport(): void {
    const report = this.privacyManager.exportPrivacyReport();
    const reportText = JSON.stringify(report, null, 2);
    
    const contentEl = this.document.getElementById('privacyReportContent');
    const textEl = this.document.getElementById('privacyReportText');
    
    if (contentEl && textEl) {
      textEl.textContent = reportText;
      contentEl.style.display = 'block';
    }
  }

  private async confirm(title: string, message: string): Promise<boolean> {
    // Use Zotero's confirm dialog if available
    if (this.Zotero?.confirm) {
      return this.Zotero.confirm(this.document.defaultView, title, message);
    }
    return confirm(`${title}\n\n${message}`);
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Use Zotero's notification system if available
    if (this.Zotero?.alert) {
      const title = type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info';
      this.Zotero.alert(this.document.defaultView, title, message);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
}

// Export for use in preferences window
export function initSecurityPanel(
  container: HTMLElement,
  stateStore: StateStore,
  logger: Logger,
  zoteroGlobal: any
): SecurityPanel {
  const panel = new SecurityPanel(
    stateStore,
    logger,
    document,
    zoteroGlobal
  );
  
  panel.render(container);
  return panel;
}
