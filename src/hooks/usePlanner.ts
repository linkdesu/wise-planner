import { useSyncExternalStore } from 'react';
import { plannerStore } from '../store/PlannerStore';
import { AccountModel } from '../models/AccountModel';
import { SetupModel } from '../models/SetupModel';
import { PositionModel } from '../models/PositionModel';
import { OverviewHistoryPreferencesModel } from '../models/OverviewHistoryPreferencesModel';

export function usePlanner () {
  const state = useSyncExternalStore(
    (cb) => plannerStore.subscribe(cb),
    () => plannerStore.snapshot
  );

  return {
    accounts: state.accounts,
    setups: state.setups,
    positions: state.positions,
    overviewHistoryPreferences: state.overviewHistoryPreferences,
    isLoading: state.isLoading,
    addAccount: (a: AccountModel) => plannerStore.addAccount(a),
    updateAccount: (a: AccountModel) => plannerStore.updateAccount(a),
    deleteAccount: (id: string) => plannerStore.deleteAccount(id),
    addSetup: (s: SetupModel) => plannerStore.addSetup(s),
    updateSetup: (s: SetupModel) => plannerStore.updateSetup(s),
    deleteSetup: (id: string) => plannerStore.deleteSetup(id),
    addPosition: (p: PositionModel) => plannerStore.addPosition(p),
    updatePosition: (p: PositionModel) => plannerStore.updatePosition(p),
    deletePosition: (id: string) => plannerStore.deletePosition(id),
    updateOverviewHistoryPreferences: (updates: Partial<OverviewHistoryPreferencesModel>) =>
      plannerStore.updateOverviewHistoryPreferences(updates),
    exportData: () => plannerStore.exportData(),
    importData: async (json: string) => plannerStore.importData(json),
    clearAllData: async () => plannerStore.clearAllData(),
  };
}
