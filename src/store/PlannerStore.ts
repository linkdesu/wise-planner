import { AccountModel } from '../models/AccountModel';
import { SetupModel } from '../models/SetupModel';
import { PositionModel } from '../models/PositionModel';
import { Config } from '../models/ConfigModel';
import type { JSONValue } from '../models/types';
import * as db from './db';

const LEGACY_OVERVIEW_HISTORY_ID = 'overview-history';
const OVERVIEW_HISTORY_PER_PAGE_KEY = 'overview.history.perPage';
const DEPRECATED_OVERVIEW_HISTORY_FILTER_KEYS = [
  'overview.history.accountIds',
  'overview.history.setupIds',
];

function isNonEmptyKey (key: unknown): key is string {
  return typeof key === 'string' && key.trim().length > 0;
}

export class PlannerStore {
  accounts: AccountModel[] = [];
  setups: SetupModel[] = [];
  positions: PositionModel[] = [];
  configs: Config[] = [];
  configMap: Map<string, Config> = new Map();
  isLoading: boolean = true;
  listeners: Set<() => void> = new Set();

  // Snapshot for useSyncExternalStore
  snapshot = {
    accounts: this.accounts,
    setups: this.setups,
    positions: this.positions,
    configs: this.configs,
    isLoading: this.isLoading,
  };

  constructor () {
    this.init();
  }

  async init () {
    try {
      // In Dev mode, we skip complex migration and just load from DB.
      await this.loadFromDB();
    } catch (e) {
      console.error('Failed to initialize store', e);
    } finally {
      this.isLoading = false;
      this.updateSnapshot();
    }
  }

  private setConfigs (configs: Config[]) {
    this.configs = configs;
    this.configMap = new Map(configs.map(config => [config.key, config]));
  }

  private upsertConfigInMemory (config: Config) {
    if (!isNonEmptyKey(config.key)) return;
    const idx = this.configs.findIndex(c => c.key === config.key);
    if (idx === -1) {
      this.configs.push(config);
    } else {
      this.configs[idx] = config;
    }
    this.configMap.set(config.key, config);
  }

  private buildLegacyOverviewHistoryConfigs (rawConfigs: unknown[]): Config[] {
    const legacy = rawConfigs.find((entry: any) => entry?.id === LEGACY_OVERVIEW_HISTORY_ID || entry?.key === LEGACY_OVERVIEW_HISTORY_ID) as any;
    if (!legacy || typeof legacy !== 'object') return [];

    const perPageRaw = Number(legacy.perPage);
    const perPage = Number.isFinite(perPageRaw) && perPageRaw > 0 ? Math.floor(perPageRaw) : 10;

    return [
      new Config({ key: OVERVIEW_HISTORY_PER_PAGE_KEY, value: perPage }),
    ];
  }

  private mergeConfigs (...lists: Config[][]): Config[] {
    const merged = new Map<string, Config>();
    for (const list of lists) {
      for (const config of list) {
        if (!isNonEmptyKey(config.key)) continue;
        merged.set(config.key, config);
      }
    }
    return Array.from(merged.values());
  }

  async loadFromDB () {
    const [storedAccounts, storedSetups, storedPositions, storedConfigs] = await Promise.all([
      db.getAllAccounts(),
      db.getAllSetups(),
      db.getAllPositions(),
      db.getAllConfigs(),
    ]);

    // Re-hydrate plain objects into Models including methods
    this.accounts = storedAccounts.map(d => new AccountModel(d));
    this.setups = storedSetups.map(d => new SetupModel(d));
    this.positions = storedPositions.map(d => new PositionModel(d));

    const configsFromKeys = storedConfigs
      .map(d => new Config(d))
      .filter(config => isNonEmptyKey(config.key));
    const legacyConfigs = this.buildLegacyOverviewHistoryConfigs(storedConfigs);
    const mergedConfigs = this.mergeConfigs(configsFromKeys, legacyConfigs);
    const cleanedConfigs = mergedConfigs.filter(
      config => !DEPRECATED_OVERVIEW_HISTORY_FILTER_KEYS.includes(config.key),
    );
    this.setConfigs(cleanedConfigs);

    if (legacyConfigs.length > 0) {
      try {
        await Promise.all(legacyConfigs.map(config => db.saveConfig(config)));
        await db.deleteConfig(LEGACY_OVERVIEW_HISTORY_ID);
      } catch (error) {
        console.error('Failed to migrate legacy overview history configs', error);
      }
    }

    const deprecatedKeysPresent = DEPRECATED_OVERVIEW_HISTORY_FILTER_KEYS
      .filter(key => mergedConfigs.some(config => config.key === key));
    if (deprecatedKeysPresent.length > 0) {
      Promise.all(deprecatedKeysPresent.map(key => db.deleteConfig(key))).catch((error) => {
        console.error('Failed to delete deprecated overview history filter configs', error);
      });
    }

    // Create defaults if absolutely nothing exists
    if (this.accounts.length === 0 && this.setups.length === 0) {
      this.createDefaultSetup();
      this.createDefaultAccount();
    }

    // Recalculate account stats based on positions
    this.recalcAllAccounts();
  }

  updateSnapshot () {
    this.snapshot = {
      accounts: [...this.accounts],
      setups: [...this.setups],
      positions: [...this.positions],
      configs: [...this.configs],
      isLoading: this.isLoading,
    };
    this.notify();
  }

  recalcAllAccounts () {
    this.accounts.forEach(acc => {
      acc.calculateStats(this.positions);
    });
  }

  getConfigValue<T extends JSONValue> (key: string, fallback: T): T {
    const config = this.configMap.get(key);
    if (!config) return fallback;
    return config.value as T;
  }

  setConfigValue (key: string, value: JSONValue) {
    if (!isNonEmptyKey(key)) return;
    const next = new Config({ key, value });
    this.upsertConfigInMemory(next);
    this.updateSnapshot();
    db.saveConfig(next).catch(e => console.error('DB Update Error', e));
  }

  createDefaultSetup () {
    const setup = new SetupModel({ name: 'Standard 3-Step', resizingTimes: 3, resizingRatios: [1, 1, 1] });
    this.addSetup(setup);
  }

  createDefaultAccount () {
    const account = new AccountModel({ name: 'Default Account', initialBalance: 10000 });
    this.addAccount(account);
  }

  // CRUD for Accounts
  addAccount (account: AccountModel) {
    this.accounts.push(account);
    this.updateSnapshot();
    db.saveAccount(account).catch(e => console.error('DB Save Error', e));
  }

  updateAccount (account: AccountModel) {
    const idx = this.accounts.findIndex(a => a.id === account.id);
    if (idx !== -1) {
      this.accounts[idx] = account;
      this.updateSnapshot();
      db.saveAccount(account).catch(e => console.error('DB Update Error', e));
    }
  }

  deleteAccount (id: string) {
    const positionsToDelete = this.positions.filter(p => p.accountId === id);
    this.accounts = this.accounts.filter(a => a.id !== id);
    this.positions = this.positions.filter(p => p.accountId !== id);
    this.recalcAllAccounts();
    this.updateSnapshot();
    Promise.all([
      ...positionsToDelete.map(position => db.deletePosition(position.id)),
      db.deleteAccount(id),
    ]).catch(e => console.error('DB Delete Error', e));
  }

  // CRUD for Setups
  addSetup (setup: SetupModel) {
    this.setups.push(setup);
    this.updateSnapshot();
    db.saveSetup(setup).catch(e => console.error('DB Save Error', e));
  }

  updateSetup (setup: SetupModel) {
    const idx = this.setups.findIndex(s => s.id === setup.id);
    if (idx !== -1) {
      this.setups[idx] = setup;
      this.updateSnapshot();
      db.saveSetup(setup).catch(e => console.error('DB Update Error', e));
    }
  }

  deleteSetup (id: string) {
    const hasRelatedPositions = this.positions.some(position => position.setupId === id);
    const setup = this.setups.find(s => s.id === id);
    if (!setup) return;

    if (hasRelatedPositions) {
      setup.isDeleted = true;
      this.updateSnapshot();
      db.saveSetup(setup).catch(e => console.error('DB Update Error', e));
      return;
    }

    this.setups = this.setups.filter(s => s.id !== id);
    this.updateSnapshot();
    db.deleteSetup(id).catch(e => console.error('DB Delete Error', e));
  }

  // CRUD for Positions
  addPosition (position: PositionModel) {
    this.positions.push(position);
    this.recalcAllAccounts();
    this.updateSnapshot();
    db.savePosition(position).catch(e => console.error('DB Save Error', e));
  }

  updatePosition (position: PositionModel) {
    const idx = this.positions.findIndex(p => p.id === position.id);
    if (idx !== -1) {
      this.positions[idx] = position;
      this.recalcAllAccounts();
      this.updateSnapshot();
      db.savePosition(position).catch(e => console.error('DB Update Error', e));
    }
  }

  deletePosition (id: string) {
    this.positions = this.positions.filter(p => p.id !== id);
    this.recalcAllAccounts();
    this.updateSnapshot();
    db.deletePosition(id).catch(e => console.error('DB Delete Error', e));
  }

  // Import/Export
  exportData (): string {
    return JSON.stringify({
      accounts: this.accounts,
      setups: this.setups,
      positions: this.positions,
      configs: this.configs,
    }, null, 2);
  }

  async importData (json: string) {
    try {
      const data = JSON.parse(json);
      const accounts = (data.accounts || []).map((d: Partial<AccountModel>) => new AccountModel(d));
      const setups = (data.setups || []).map((d: Partial<SetupModel>) => new SetupModel(d));
      const positions = (data.positions || []).map((d: Partial<PositionModel>) => new PositionModel(d));

      const rawConfigs: unknown[] = data.configs || [];
      const configsFromKeys = rawConfigs
        .map((d) => new Config(d as Partial<Config>))
        .filter(config => isNonEmptyKey(config.key));
      const legacyConfigs = this.buildLegacyOverviewHistoryConfigs(rawConfigs);
      const mergedConfigs = this.mergeConfigs(configsFromKeys, legacyConfigs);
      const cleanedConfigs = mergedConfigs.filter(
        config => !DEPRECATED_OVERVIEW_HISTORY_FILTER_KEYS.includes(config.key),
      );

      // Update DB
      await db.bulkSave(accounts, setups, positions, cleanedConfigs);

      // Update Memory
      this.accounts = accounts;
      this.setups = setups;
      this.positions = positions;
      this.setConfigs(cleanedConfigs);
      this.recalcAllAccounts();
      this.updateSnapshot();
    } catch (e) {
      console.error('Import failed', e);
      throw e;
    }
  }

  async clearAllData () {
    await db.clearAll();
    // Also clear localStorage if any, or just reload to be safe
    window.location.reload();
  }

  subscribe (listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify () {
    this.listeners.forEach(l => l());
  }
}

export const plannerStore = new PlannerStore();
