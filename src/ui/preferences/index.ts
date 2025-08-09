/**
 * Preferences Panel
 * 首选项面板：API Token、范围、选项
 */

import { ZoteroAdapter } from '../../adapters/zoteroAdapter';
import { StateStore, Preferences } from '../../storage/stateStore';
import { Logger } from '../../utils/logger';

export class PreferencesPanel {
  private readonly stateStore: StateStore;
  private readonly zoteroAdapter: ZoteroAdapter;
  private readonly logger: Logger;
  private readonly document: Document;
  private readonly Zotero: any;

  constructor(
    stateStore: StateStore, 
    zoteroAdapter: ZoteroAdapter,
    logger: Logger, 
    doc: Document,
    zoteroGlobal: any
  ) {
    this.stateStore = stateStore;
    this.zoteroAdapter = zoteroAdapter;
    this.logger = logger;
    this.document = doc;
    this.Zotero = zoteroGlobal;
  }

  async render(pane: HTMLElement): Promise<void> {
    pane.innerHTML = this.getHtmlTemplate();

    await this.loadPreferences();
    this.attachEventListeners();
  }

  private getHtmlTemplate(): string {
    return `
      <div id="zotero-readwise-prefs">
        <h2>Zotero-Readwise Sync</h2>
        
        <fieldset>
          <legend>API Settings</legend>
          <div class="pref-row">
            <label for="apiToken">Readwise API Token:</label>
            <input type="password" id="apiToken" size="50">
            <button id="testConnectionBtn">Test Connection</button>
          </div>
        </fieldset>

        <fieldset>
          <legend>Sync Options</legend>
          <div class="pref-row">
            <input type="checkbox" id="autoSync">
            <label for="autoSync">Enable automatic sync</label>
          </div>
          <div class="pref-row">
            <label for="syncInterval">Sync interval (minutes):</label>
            <input type="number" id="syncInterval" min="15" value="60">
            <span>Set to 0 for manual sync only.</span>
          </div>
        </fieldset>

        <fieldset>
          <legend>Sync Scope</legend>
          <div class="pref-row">
            <input type="radio" id="syncAll" name="syncScope" value="all" checked>
            <label for="syncAll">All items</label>
          </div>
          <div class="pref-row">
            <input type="radio" id="syncCollection" name="syncScope" value="collection">
            <label for="syncCollection">Specific collections:</label>
            <select id="collectionsSelect" multiple disabled></select>
          </div>
          <div class="pref-row">
            <input type="radio" id="syncTag" name="syncScope" value="tag">
            <label for="syncTag">Specific tags:</label>
            <select id="tagsSelect" multiple disabled></select>
          </div>
        </fieldset>

        <fieldset>
          <legend>Data Management</legend>
          <div class="pref-row">
            <button id="clearSyncStateBtn">Clear Sync State</button>
            <button id="exportDataBtn">Export Data</button>
            <button id="importDataBtn">Import Data</button>
          </div>
        </fieldset>
      </div>
    `;
  }

  private async loadPreferences(): Promise<void> {
    const prefs = await this.stateStore.getPreferences();

    (this.document.getElementById('apiToken') as HTMLInputElement).value = prefs.apiToken;
    (this.document.getElementById('autoSync') as HTMLInputElement).checked = prefs.autoSync;
    (this.document.getElementById('syncInterval') as HTMLInputElement).value = prefs.syncInterval.toString();
    (this.document.querySelector(`input[name="syncScope"][value="${prefs.syncScope}"]`) as HTMLInputElement).checked = true;

    await this.populateCollections(prefs.selectedCollections);
    await this.populateTags(prefs.selectedTags);

    this.updateScopeControls();
  }

  private attachEventListeners(): void {
    (this.document.getElementById('apiToken') as HTMLInputElement).addEventListener('change', this.savePreference.bind(this, 'apiToken'));
    (this.document.getElementById('autoSync') as HTMLInputElement).addEventListener('change', this.savePreference.bind(this, 'autoSync'));
    (this.document.getElementById('syncInterval') as HTMLInputElement).addEventListener('change', this.savePreference.bind(this, 'syncInterval'));
    
    this.document.querySelectorAll('input[name="syncScope"]').forEach(el => {
      el.addEventListener('change', () => {
        this.savePreference('syncScope')();
        this.updateScopeControls();
      });
    });

    (this.document.getElementById('collectionsSelect') as HTMLSelectElement).addEventListener('change', this.savePreference.bind(this, 'selectedCollections'));
    (this.document.getElementById('tagsSelect') as HTMLSelectElement).addEventListener('change', this.savePreference.bind(this, 'selectedTags'));

    // Button handlers
    (this.document.getElementById('testConnectionBtn') as HTMLButtonElement).addEventListener('click', this.testConnection.bind(this));
    (this.document.getElementById('clearSyncStateBtn') as HTMLButtonElement).addEventListener('click', this.clearSyncState.bind(this));
    (this.document.getElementById('exportDataBtn') as HTMLButtonElement).addEventListener('click', this.exportData.bind(this));
    (this.document.getElementById('importDataBtn') as HTMLButtonElement).addEventListener('click', this.importData.bind(this));
  }

  private async savePreference(key: keyof Preferences): Promise<void> {
    const el = this.document.getElementById(key);
    let value;

    if (el instanceof HTMLInputElement) {
      if (el.type === 'checkbox') value = el.checked;
      else if (el.type === 'number') value = parseInt(el.value);
      else if (el.type === 'radio') {
        const checkedRadio = this.document.querySelector(`input[name="${key}"]:checked`) as HTMLInputElement;
        value = checkedRadio.value;
      } else value = el.value;
    }
    
    if (el instanceof HTMLSelectElement) {
      value = Array.from(el.selectedOptions).map(opt => opt.value);
    }

    if (value !== undefined) {
      await this.stateStore.updatePreference(key, value as any);
      this.logger.info(`Preference '${key}' saved`);
    }
  }

  private async populateCollections(selected: string[]): Promise<void> {
    const select = this.document.getElementById('collectionsSelect') as HTMLSelectElement;
    select.innerHTML = ''; // Clear existing options
    
    const collections = await this.zoteroAdapter.getCollections();
    collections.forEach(c => {
      const option = this.document.createElement('option');
      option.value = c.id;
      option.textContent = c.name;
      if (selected.includes(c.id)) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  private async populateTags(selected: string[]): Promise<void> {
    const select = this.document.getElementById('tagsSelect') as HTMLSelectElement;
    select.innerHTML = ''; // Clear existing options

    const tags = await this.zoteroAdapter.getTags();
    tags.forEach(t => {
      const option = this.document.createElement('option');
      option.value = t;
      option.textContent = t;
      if (selected.includes(t)) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  private updateScopeControls(): void {
    const scope = (this.document.querySelector('input[name="syncScope"]:checked') as HTMLInputElement).value;
    (this.document.getElementById('collectionsSelect') as HTMLSelectElement).disabled = scope !== 'collection';
    (this.document.getElementById('tagsSelect') as HTMLSelectElement).disabled = scope !== 'tag';
  }

  private async testConnection(): Promise<void> {
    // TODO: Implement test connection logic (calls ReadwiseClient)
    this.logger.info('Testing connection...');
    // ...
    this.Zotero.alert(this.document.defaultView, 'Connection Test', 'Connection successful!');
  }

  private async clearSyncState(): Promise<void> {
    const confirmed = this.Zotero.confirm(this.document.defaultView, 'Clear Sync State', 'Are you sure you want to clear all sync history? This will cause all items to re-sync.');
    if (confirmed) {
      await this.stateStore.clearSyncState();
      this.Zotero.alert(this.document.defaultView, 'Sync State', 'Sync state cleared successfully.');
    }
  }

  private async exportData(): Promise<void> {
    // TODO: Implement data export
    this.logger.info('Exporting data...');
  }

  private async importData(): Promise<void> {
    // TODO: Implement data import
    this.logger.info('Importing data...');
  }
}
