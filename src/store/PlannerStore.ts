import { AccountModel } from '../models/AccountModel';
import { SetupModel } from '../models/SetupModel';
import { PositionModel } from '../models/PositionModel';
import { OverviewHistoryPreferencesModel } from '../models/OverviewHistoryPreferencesModel';
import * as db from './db';

export class PlannerStore {
  accounts: AccountModel[] = [];
  setups: SetupModel[] = [];
  positions: PositionModel[] = [];
  overviewHistoryPreferences: OverviewHistoryPreferencesModel = new OverviewHistoryPreferencesModel();
  isLoading: boolean = true;
  listeners: Set<() => void> = new Set();

  // Snapshot for useSyncExternalStore
  snapshot = {
    accounts: this.accounts,
    setups: this.setups,
    positions: this.positions,
    overviewHistoryPreferences: this.overviewHistoryPreferences,
    isLoading: this.isLoading
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

  async loadFromDB () {
    const [storedAccounts, storedSetups, storedPositions, storedOverviewHistoryPreferences] = await Promise.all([
      db.getAllAccounts(),
      db.getAllSetups(),
      db.getAllPositions(),
      db.getConfig('overview-history')
    ]);

    // Re-hydrate plain objects into Models including methods
    this.accounts = storedAccounts.map(d => new AccountModel(d));
    this.setups = storedSetups.map(d => new SetupModel(d));
    this.positions = storedPositions.map(d => new PositionModel(d));
    this.overviewHistoryPreferences = storedOverviewHistoryPreferences
      ? new OverviewHistoryPreferencesModel(storedOverviewHistoryPreferences)
      : new OverviewHistoryPreferencesModel();

    // Create defaults if absolutely nothing exists
    if (this.accounts.length === 0 && this.setups.length === 0) {
      this.createDefaultSetup();
      this.createDefaultAccount();
    }

    if (!storedOverviewHistoryPreferences) {
      db.saveConfig(this.overviewHistoryPreferences).catch(e => console.error('DB Save Error', e));
    }

    // Recalculate account stats based on positions
    this.recalcAllAccounts();
  }

  updateSnapshot () {
    this.snapshot = {
      accounts: [...this.accounts],
      setups: [...this.setups],
      positions: [...this.positions],
      overviewHistoryPreferences: this.overviewHistoryPreferences,
      isLoading: this.isLoading
    };
    this.notify();
  }

  recalcAllAccounts () {
    this.accounts.forEach(acc => {
      acc.calculateStats(this.positions);
    });
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
    // Basic delete
    this.accounts = this.accounts.filter(a => a.id !== id);
    // Ideally cascade delete positions in DB too, but for now memory only
    this.positions = this.positions.filter(p => p.accountId !== id);

    this.updateSnapshot();
    db.deleteAccount(id).catch(e => console.error('DB Delete Error', e));
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

  updateOverviewHistoryPreferences (updates: Partial<OverviewHistoryPreferencesModel>) {
    const next = new OverviewHistoryPreferencesModel({
      ...this.overviewHistoryPreferences,
      ...updates,
    });
    this.overviewHistoryPreferences = next;
    this.updateSnapshot();
    db.saveConfig(next).catch(e => console.error('DB Update Error', e));
  }

  // Import/Export
  exportData (): string {
    return JSON.stringify({
      accounts: this.accounts,
      setups: this.setups,
      positions: this.positions,
      configs: [this.overviewHistoryPreferences],
    }, null, 2);
  }

  async importData (json: string) {
    try {
      const data = JSON.parse(json);
      const accounts = (data.accounts || []).map((d: Partial<AccountModel>) => new AccountModel(d));
      const setups = (data.setups || []).map((d: Partial<SetupModel>) => new SetupModel(d));
      const positions = (data.positions || []).map((d: Partial<PositionModel>) => new PositionModel(d));
      const configs = (data.configs || []).map((d: Partial<OverviewHistoryPreferencesModel>) => new OverviewHistoryPreferencesModel(d));

      // Update DB
      await db.bulkSave(accounts, setups, positions, configs);

      // Update Memory
      this.accounts = accounts;
      this.setups = setups;
      this.positions = positions;
      this.overviewHistoryPreferences = configs.find((c: OverviewHistoryPreferencesModel) => c.id === 'overview-history')
        || new OverviewHistoryPreferencesModel();
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
