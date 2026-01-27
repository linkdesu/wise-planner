import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountModel } from '../models/AccountModel';
import { SetupModel } from '../models/SetupModel';
import { PositionModel } from '../models/PositionModel';
import { PlannerStore } from './PlannerStore';
import * as db from './db';

vi.mock('./db', () => {
  const resolved = Promise.resolve();
  return {
    getAllAccounts: vi.fn(async () => []),
    getAllSetups: vi.fn(async () => []),
    getAllPositions: vi.fn(async () => []),
    getAllConfigs: vi.fn(async () => []),
    saveAccount: vi.fn(async () => resolved),
    deleteAccount: vi.fn(async () => resolved),
    saveSetup: vi.fn(async () => resolved),
    deleteSetup: vi.fn(async () => resolved),
    savePosition: vi.fn(async () => resolved),
    deletePosition: vi.fn(async () => resolved),
    saveConfig: vi.fn(async () => resolved),
    deleteConfig: vi.fn(async () => resolved),
    bulkSave: vi.fn(async () => resolved),
    clearAll: vi.fn(async () => resolved),
  };
});

async function waitForLoaded (store: PlannerStore) {
  for (let i = 0; i < 20; i += 1) {
    if (!store.isLoading) return;
    // Allow the async init path to settle.
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

describe('PlannerStore deletion rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cascades position deletion when deleting an account', async () => {
    const account = new AccountModel({ id: 'acc-1', name: 'A' });
    const setup = new SetupModel({ id: 'setup-1', name: 'S', resizingTimes: 1, resizingRatios: [1] });
    const pos1 = new PositionModel({ id: 'pos-1', accountId: account.id, setupId: setup.id, status: 'planning' });
    const pos2 = new PositionModel({ id: 'pos-2', accountId: account.id, setupId: setup.id, status: 'opened' });

    vi.mocked(db.getAllAccounts).mockResolvedValue([account]);
    vi.mocked(db.getAllSetups).mockResolvedValue([setup]);
    vi.mocked(db.getAllPositions).mockResolvedValue([pos1, pos2]);
    vi.mocked(db.getAllConfigs).mockResolvedValue([]);

    const store = new PlannerStore();
    await waitForLoaded(store);

    store.deleteAccount(account.id);

    expect(store.accounts.find(a => a.id === account.id)).toBeUndefined();
    expect(store.positions.filter(p => p.accountId === account.id)).toHaveLength(0);
    expect(db.deletePosition).toHaveBeenCalledTimes(2);
    expect(db.deletePosition).toHaveBeenCalledWith(pos1.id);
    expect(db.deletePosition).toHaveBeenCalledWith(pos2.id);
    expect(db.deleteAccount).toHaveBeenCalledWith(account.id);
  });

  it('soft-deletes setups that are referenced by positions', async () => {
    const account = new AccountModel({ id: 'acc-1', name: 'A' });
    const setup = new SetupModel({ id: 'setup-1', name: 'S', resizingTimes: 1, resizingRatios: [1] });
    const pos = new PositionModel({ id: 'pos-1', accountId: account.id, setupId: setup.id, status: 'opened' });

    vi.mocked(db.getAllAccounts).mockResolvedValue([account]);
    vi.mocked(db.getAllSetups).mockResolvedValue([setup]);
    vi.mocked(db.getAllPositions).mockResolvedValue([pos]);
    vi.mocked(db.getAllConfigs).mockResolvedValue([]);

    const store = new PlannerStore();
    await waitForLoaded(store);

    store.deleteSetup(setup.id);

    const updatedSetup = store.setups.find(s => s.id === setup.id);
    expect(updatedSetup?.isDeleted).toBe(true);
    expect(db.saveSetup).toHaveBeenCalled();
    expect(db.deleteSetup).not.toHaveBeenCalled();
  });

  it('hard-deletes setups that are not referenced', async () => {
    const account = new AccountModel({ id: 'acc-1', name: 'A' });
    const setup = new SetupModel({ id: 'setup-1', name: 'S', resizingTimes: 1, resizingRatios: [1] });

    vi.mocked(db.getAllAccounts).mockResolvedValue([account]);
    vi.mocked(db.getAllSetups).mockResolvedValue([setup]);
    vi.mocked(db.getAllPositions).mockResolvedValue([]);
    vi.mocked(db.getAllConfigs).mockResolvedValue([]);

    const store = new PlannerStore();
    await waitForLoaded(store);

    store.deleteSetup(setup.id);

    expect(store.setups.find(s => s.id === setup.id)).toBeUndefined();
    expect(db.deleteSetup).toHaveBeenCalledWith(setup.id);
  });
});
