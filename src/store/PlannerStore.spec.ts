import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountChangeModel } from '../models/AccountChangeModel';
import { AccountModel } from '../models/AccountModel';
import { PositionModel } from '../models/PositionModel';
import { PositionTagModel } from '../models/PositionTagModel';
import { SetupModel } from '../models/SetupModel';
import { TagFieldModel } from '../models/TagFieldModel';
import { TagValueModel } from '../models/TagValueModel';
import { PlannerStore } from './PlannerStore';
import * as db from './db';

vi.mock('./db', () => {
  const resolved = Promise.resolve();
  return {
    getAllAccounts: vi.fn(async () => []),
    getAllAccountChanges: vi.fn(async () => []),
    getAllSetups: vi.fn(async () => []),
    getAllPositions: vi.fn(async () => []),
    getAllTagFields: vi.fn(async () => []),
    getAllTagValues: vi.fn(async () => []),
    getAllPositionTags: vi.fn(async () => []),
    getAllConfigs: vi.fn(async () => []),
    saveAccount: vi.fn(async () => resolved),
    saveAccountChange: vi.fn(async () => resolved),
    deleteAccount: vi.fn(async () => resolved),
    deleteAccountChange: vi.fn(async () => resolved),
    saveSetup: vi.fn(async () => resolved),
    deleteSetup: vi.fn(async () => resolved),
    savePosition: vi.fn(async () => resolved),
    deletePosition: vi.fn(async () => resolved),
    saveTagField: vi.fn(async () => resolved),
    deleteTagField: vi.fn(async () => resolved),
    saveTagValue: vi.fn(async () => resolved),
    deleteTagValue: vi.fn(async () => resolved),
    savePositionTag: vi.fn(async () => resolved),
    deletePositionTag: vi.fn(async () => resolved),
    deletePositionTagsByPosition: vi.fn(async () => resolved),
    deletePositionTagsByField: vi.fn(async () => resolved),
    deletePositionTagsByValue: vi.fn(async () => resolved),
    deleteTagValuesByField: vi.fn(async () => resolved),
    saveConfig: vi.fn(async () => resolved),
    deleteConfig: vi.fn(async () => resolved),
    bulkSave: vi.fn(async () => resolved),
    clearAll: vi.fn(async () => resolved),
  };
});

async function waitForLoaded(store: PlannerStore) {
  for (let i = 0; i < 20; i += 1) {
    if (!store.isLoading) return;
    // Allow the async init path to settle.

    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('PlannerStore deletion rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cascades position deletion when deleting an account', async () => {
    const account = new AccountModel({ id: 'acc-1', name: 'A' });
    const setup = new SetupModel({
      id: 'setup-1',
      name: 'S',
      resizingTimes: 1,
      resizingRatios: [1],
    });
    const pos1 = new PositionModel({
      id: 'pos-1',
      accountId: account.id,
      setupId: setup.id,
      status: 'planning',
    });
    const pos2 = new PositionModel({
      id: 'pos-2',
      accountId: account.id,
      setupId: setup.id,
      status: 'opened',
    });

    vi.mocked(db.getAllAccounts).mockResolvedValue([account]);
    vi.mocked(db.getAllAccountChanges).mockResolvedValue([]);
    vi.mocked(db.getAllSetups).mockResolvedValue([setup]);
    vi.mocked(db.getAllPositions).mockResolvedValue([pos1, pos2]);
    vi.mocked(db.getAllTagFields).mockResolvedValue([]);
    vi.mocked(db.getAllTagValues).mockResolvedValue([]);
    vi.mocked(db.getAllPositionTags).mockResolvedValue([]);
    vi.mocked(db.getAllConfigs).mockResolvedValue([]);

    const store = new PlannerStore();
    await waitForLoaded(store);

    store.deleteAccount(account.id);

    expect(store.accounts.find((a) => a.id === account.id)).toBeUndefined();
    expect(store.positions.filter((p) => p.accountId === account.id)).toHaveLength(0);
    expect(db.deletePosition).toHaveBeenCalledTimes(2);
    expect(db.deletePosition).toHaveBeenCalledWith(pos1.id);
    expect(db.deletePosition).toHaveBeenCalledWith(pos2.id);
    expect(db.deleteAccount).toHaveBeenCalledWith(account.id);
  });

  it('soft-deletes setups that are referenced by positions', async () => {
    const account = new AccountModel({ id: 'acc-1', name: 'A' });
    const setup = new SetupModel({
      id: 'setup-1',
      name: 'S',
      resizingTimes: 1,
      resizingRatios: [1],
    });
    const pos = new PositionModel({
      id: 'pos-1',
      accountId: account.id,
      setupId: setup.id,
      status: 'opened',
    });

    vi.mocked(db.getAllAccounts).mockResolvedValue([account]);
    vi.mocked(db.getAllAccountChanges).mockResolvedValue([]);
    vi.mocked(db.getAllSetups).mockResolvedValue([setup]);
    vi.mocked(db.getAllPositions).mockResolvedValue([pos]);
    vi.mocked(db.getAllTagFields).mockResolvedValue([]);
    vi.mocked(db.getAllTagValues).mockResolvedValue([]);
    vi.mocked(db.getAllPositionTags).mockResolvedValue([]);
    vi.mocked(db.getAllConfigs).mockResolvedValue([]);

    const store = new PlannerStore();
    await waitForLoaded(store);

    store.deleteSetup(setup.id);

    const updatedSetup = store.setups.find((s) => s.id === setup.id);
    expect(updatedSetup?.isDeleted).toBe(true);
    expect(db.saveSetup).toHaveBeenCalled();
    expect(db.deleteSetup).not.toHaveBeenCalled();
  });

  it('hard-deletes setups that are not referenced', async () => {
    const account = new AccountModel({ id: 'acc-1', name: 'A' });
    const setup = new SetupModel({
      id: 'setup-1',
      name: 'S',
      resizingTimes: 1,
      resizingRatios: [1],
    });

    vi.mocked(db.getAllAccounts).mockResolvedValue([account]);
    vi.mocked(db.getAllAccountChanges).mockResolvedValue([]);
    vi.mocked(db.getAllSetups).mockResolvedValue([setup]);
    vi.mocked(db.getAllPositions).mockResolvedValue([]);
    vi.mocked(db.getAllTagFields).mockResolvedValue([]);
    vi.mocked(db.getAllTagValues).mockResolvedValue([]);
    vi.mocked(db.getAllPositionTags).mockResolvedValue([]);
    vi.mocked(db.getAllConfigs).mockResolvedValue([]);

    const store = new PlannerStore();
    await waitForLoaded(store);

    store.deleteSetup(setup.id);

    expect(store.setups.find((s) => s.id === setup.id)).toBeUndefined();
    expect(db.deleteSetup).toHaveBeenCalledWith(setup.id);
  });

  it('recalculates account balance with manual changes', async () => {
    const account = new AccountModel({ id: 'acc-1', name: 'A', initialBalance: 100 });
    const pos = new PositionModel({
      id: 'pos-1',
      accountId: account.id,
      status: 'closed',
      pnl: 15,
      closedAt: Date.now(),
    });
    const deposit = new AccountChangeModel({
      id: 'chg-1',
      accountId: account.id,
      type: 'deposit',
      amount: 10,
    });
    const loss = new AccountChangeModel({
      id: 'chg-2',
      accountId: account.id,
      type: 'loss',
      amount: 3,
    });

    vi.mocked(db.getAllAccounts).mockResolvedValue([account]);
    vi.mocked(db.getAllAccountChanges).mockResolvedValue([deposit, loss]);
    vi.mocked(db.getAllSetups).mockResolvedValue([]);
    vi.mocked(db.getAllPositions).mockResolvedValue([pos]);
    vi.mocked(db.getAllTagFields).mockResolvedValue([]);
    vi.mocked(db.getAllTagValues).mockResolvedValue([]);
    vi.mocked(db.getAllPositionTags).mockResolvedValue([]);
    vi.mocked(db.getAllConfigs).mockResolvedValue([]);

    const store = new PlannerStore();
    await waitForLoaded(store);

    const updated = store.accounts.find((a) => a.id === account.id);
    expect(updated?.currentBalance).toBe(122);
  });

  it('cascades positionTag rows when deleting a tag value', async () => {
    const field = new TagFieldModel({ id: 'field-1', name: 'Entry Strategy', isActive: true });
    const value = new TagValueModel({ id: 'value-1', fieldId: field.id, label: 'Breakout' });
    const relation = new PositionTagModel({
      id: 'relation-1',
      positionId: 'pos-1',
      fieldId: field.id,
      valueId: value.id,
    });

    vi.mocked(db.getAllAccounts).mockResolvedValue([]);
    vi.mocked(db.getAllAccountChanges).mockResolvedValue([]);
    vi.mocked(db.getAllSetups).mockResolvedValue([]);
    vi.mocked(db.getAllPositions).mockResolvedValue([]);
    vi.mocked(db.getAllTagFields).mockResolvedValue([field]);
    vi.mocked(db.getAllTagValues).mockResolvedValue([value]);
    vi.mocked(db.getAllPositionTags).mockResolvedValue([relation]);
    vi.mocked(db.getAllConfigs).mockResolvedValue([]);

    const store = new PlannerStore();
    await waitForLoaded(store);

    store.deleteTagValue(value.id);

    expect(store.tagValues.find((v) => v.id === value.id)).toBeUndefined();
    expect(store.positionTags.find((tag) => tag.valueId === value.id)).toBeUndefined();
    expect(db.deletePositionTagsByValue).toHaveBeenCalledWith(value.id);
  });

  it('upserts one position tag per field and position', async () => {
    const field = new TagFieldModel({ id: 'field-1', name: 'Entry Strategy', isActive: true });
    const oldValue = new TagValueModel({ id: 'value-1', fieldId: field.id, label: 'Breakout' });
    const newValue = new TagValueModel({ id: 'value-2', fieldId: field.id, label: 'Pullback' });

    vi.mocked(db.getAllAccounts).mockResolvedValue([]);
    vi.mocked(db.getAllAccountChanges).mockResolvedValue([]);
    vi.mocked(db.getAllSetups).mockResolvedValue([]);
    vi.mocked(db.getAllPositions).mockResolvedValue([]);
    vi.mocked(db.getAllTagFields).mockResolvedValue([field]);
    vi.mocked(db.getAllTagValues).mockResolvedValue([oldValue, newValue]);
    vi.mocked(db.getAllPositionTags).mockResolvedValue([]);
    vi.mocked(db.getAllConfigs).mockResolvedValue([]);

    const store = new PlannerStore();
    await waitForLoaded(store);

    store.setPositionTag('pos-1', field.id, oldValue.id);
    store.setPositionTag('pos-1', field.id, newValue.id);

    const relations = store.positionTags.filter(
      (tag) => tag.positionId === 'pos-1' && tag.fieldId === field.id
    );
    expect(relations).toHaveLength(1);
    expect(relations[0].valueId).toBe(newValue.id);
  });
});
