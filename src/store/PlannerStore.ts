import { AccountModel } from '../models/AccountModel';
import { SetupModel } from '../models/SetupModel';

const STORAGE_KEY = 'planner_data_v1';

export class PlannerStore {
  accounts: AccountModel[] = [];
  setups: SetupModel[] = [];
  listeners: Set<() => void> = new Set();

  constructor () {
    this.load();
    if (this.setups.length === 0) {
      this.createDefaultSetup();
    }
    if (this.accounts.length === 0) {
      this.createDefaultAccount();
    }
  }

  createDefaultSetup () {
    this.setups.push(new SetupModel({ name: 'Standard 3-Step', resizingTimes: 3, resizingRatios: [1, 1, 1] }));
    this.save();
  }

  createDefaultAccount () {
    this.accounts.push(new AccountModel({ name: 'Default Account', initialBalance: 10000 }));
    this.save();
  }

  load () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.accounts = (data.accounts || []).map((d: any) => new AccountModel(d));
        this.setups = (data.setups || []).map((d: any) => new SetupModel(d));
      }
    } catch (e) {
      console.error('Failed to load data', e);
    }
  }

  save () {
    const data = {
      accounts: this.accounts,
      setups: this.setups,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    this.notify();
  }

  // CRUD for Accounts
  addAccount (account: AccountModel) {
    this.accounts.push(account);
    this.save();
  }

  updateAccount (account: AccountModel) {
    const idx = this.accounts.findIndex(a => a.id === account.id);
    if (idx !== -1) {
      this.accounts[idx] = account; // In generic terms, typically we mutate or replace.
      this.save();
    }
  }

  deleteAccount (id: string) {
    this.accounts = this.accounts.filter(a => a.id !== id);
    this.save();
  }

  // CRUD for Setups
  addSetup (setup: SetupModel) {
    this.setups.push(setup);
    this.save();
  }

  updateSetup (setup: SetupModel) {
    const idx = this.setups.findIndex(s => s.id === setup.id);
    if (idx !== -1) {
      this.setups[idx] = setup;
      this.save();
    }
  }

  deleteSetup (id: string) {
    this.setups = this.setups.filter(s => s.id !== id);
    this.save();
  }

  // Import/Export
  exportData (): string {
    return JSON.stringify({
      accounts: this.accounts,
      setups: this.setups,
    }, null, 2);
  }

  importData (json: string) {
    try {
      const data = JSON.parse(json);
      this.accounts = (data.accounts || []).map((d: any) => new AccountModel(d));
      this.setups = (data.setups || []).map((d: any) => new SetupModel(d));
      this.save();
    } catch (e) {
      console.error('Import failed', e);
      throw e;
    }
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
