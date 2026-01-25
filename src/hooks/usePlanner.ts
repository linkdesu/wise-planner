import { useSyncExternalStore } from 'react';
import { plannerStore } from '../store/PlannerStore';

export function usePlanner () {
  const store = useSyncExternalStore(
    (cb) => plannerStore.subscribe(cb),
    () => plannerStore
  );

  return {
    accounts: store.accounts,
    setups: store.setups,
    addAccount: (a: any) => store.addAccount(a),
    updateAccount: (a: any) => store.updateAccount(a),
    deleteAccount: (id: string) => store.deleteAccount(id),
    addSetup: (s: any) => store.addSetup(s),
    updateSetup: (s: any) => store.updateSetup(s),
    deleteSetup: (id: string) => store.deleteSetup(id),
    exportData: () => store.exportData(),
    importData: (json: string) => store.importData(json),
  };
}
