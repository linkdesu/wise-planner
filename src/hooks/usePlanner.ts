import { useSyncExternalStore } from 'react';
import { AccountChangeModel } from '../models/AccountChangeModel';
import { AccountModel } from '../models/AccountModel';
import { PositionModel } from '../models/PositionModel';
import { SetupModel } from '../models/SetupModel';
import type { JSONValue } from '../models/types';
import { plannerStore } from '../store/PlannerStore';

export function usePlanner() {
  const state = useSyncExternalStore(
    (cb) => plannerStore.subscribe(cb),
    () => plannerStore.snapshot
  );

  return {
    accounts: state.accounts,
    accountChanges: state.accountChanges,
    setups: state.setups,
    positions: state.positions,
    configs: state.configs,
    isLoading: state.isLoading,
    addAccount: (a: AccountModel) => plannerStore.addAccount(a),
    updateAccount: (a: AccountModel) => plannerStore.updateAccount(a),
    deleteAccount: (id: string) => plannerStore.deleteAccount(id),
    addAccountChange: (change: AccountChangeModel) => plannerStore.addAccountChange(change),
    updateAccountChange: (change: AccountChangeModel) => plannerStore.updateAccountChange(change),
    deleteAccountChange: (id: string) => plannerStore.deleteAccountChange(id),
    addSetup: (s: SetupModel) => plannerStore.addSetup(s),
    updateSetup: (s: SetupModel) => plannerStore.updateSetup(s),
    deleteSetup: (id: string) => plannerStore.deleteSetup(id),
    addPosition: (p: PositionModel) => plannerStore.addPosition(p),
    updatePosition: (p: PositionModel) => plannerStore.updatePosition(p),
    deletePosition: (id: string) => plannerStore.deletePosition(id),
    getConfigValue: <T extends JSONValue>(key: string, fallback: T) =>
      plannerStore.getConfigValue(key, fallback),
    setConfigValue: (key: string, value: JSONValue) => plannerStore.setConfigValue(key, value),
    exportData: () => plannerStore.exportData(),
    importData: async (json: string) => plannerStore.importData(json),
    clearAllData: async () => plannerStore.clearAllData(),
  };
}
