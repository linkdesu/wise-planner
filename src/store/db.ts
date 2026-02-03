import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { AccountChangeModel } from '../models/AccountChangeModel';
import { AccountModel } from '../models/AccountModel';
import { Config } from '../models/ConfigModel';
import { PositionModel } from '../models/PositionModel';
import { SetupModel } from '../models/SetupModel';
import type { JSONValue } from '../models/types';

interface PlannerDB extends DBSchema {
  accounts: {
    key: string;
    value: AccountModel;
  };
  accountChanges: {
    key: string;
    value: AccountChangeModel;
    indexes: { 'by-account': string };
  };
  setups: {
    key: string;
    value: SetupModel;
  };
  positions: {
    key: string;
    value: PositionModel;
    indexes: { 'by-account': string };
  };
  configs: {
    key: string;
    value: Config;
  };
}

const DB_NAME = 'position-planner-db';
const DB_VERSION = 5;

const LEGACY_OVERVIEW_HISTORY_ID = 'overview-history';
const OVERVIEW_HISTORY_PER_PAGE_KEY = 'overview.history.perPage';

let dbPromise: Promise<IDBPDatabase<PlannerDB>>;

export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<PlannerDB>(DB_NAME, DB_VERSION, {
      upgrade: async (db, oldVersion, _newVersion, tx) => {
        if (!db.objectStoreNames.contains('accounts')) {
          db.createObjectStore('accounts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('accountChanges')) {
          const changeStore = db.createObjectStore('accountChanges', { keyPath: 'id' });
          changeStore.createIndex('by-account', 'accountId');
        }
        if (!db.objectStoreNames.contains('setups')) {
          db.createObjectStore('setups', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('positions')) {
          const posStore = db.createObjectStore('positions', { keyPath: 'id' });
          posStore.createIndex('by-account', 'accountId');
        }

        const configsExists = db.objectStoreNames.contains('configs');
        const needsConfigsRecreate = !configsExists || oldVersion < DB_VERSION;
        let legacyConfigs: any[] = [];

        if (configsExists) {
          try {
            legacyConfigs = await tx.objectStore('configs').getAll();
          } catch (error) {
            console.error('Failed to read legacy configs during upgrade', error);
          }
          if (needsConfigsRecreate) {
            db.deleteObjectStore('configs');
          }
        }

        if (needsConfigsRecreate) {
          const configStore = db.createObjectStore('configs', { keyPath: 'key' });

          const putConfig = (key: string, value: JSONValue) => {
            try {
              configStore.put({ key, value });
            } catch (error) {
              console.error('Failed to migrate config', key, error);
            }
          };

          for (const entry of legacyConfigs) {
            if (!entry || typeof entry !== 'object') continue;

            if (typeof entry.key === 'string' && 'value' in entry) {
              putConfig(entry.key, entry.value as JSONValue);
              continue;
            }

            if (entry.id === LEGACY_OVERVIEW_HISTORY_ID) {
              const perPageRaw = Number(entry.perPage);
              const perPage =
                Number.isFinite(perPageRaw) && perPageRaw > 0 ? Math.floor(perPageRaw) : 10;

              putConfig(OVERVIEW_HISTORY_PER_PAGE_KEY, perPage);
            }
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllAccounts(): Promise<AccountModel[]> {
  const db = await initDB();
  return db.getAll('accounts');
}

export async function getAllAccountChanges(): Promise<AccountChangeModel[]> {
  const db = await initDB();
  return db.getAll('accountChanges');
}

export async function getAllSetups(): Promise<SetupModel[]> {
  const db = await initDB();
  return db.getAll('setups');
}

export async function getAllPositions(): Promise<PositionModel[]> {
  const db = await initDB();
  return db.getAll('positions');
}

export async function getConfig(key: string): Promise<Config | undefined> {
  const db = await initDB();
  return db.get('configs', key);
}

export async function getAllConfigs(): Promise<Config[]> {
  const db = await initDB();
  return db.getAll('configs');
}

export async function saveAccount(account: AccountModel) {
  const db = await initDB();
  return db.put('accounts', account);
}

export async function saveAccountChange(change: AccountChangeModel) {
  const db = await initDB();
  return db.put('accountChanges', change);
}

export async function deleteAccount(id: string) {
  const db = await initDB();
  return db.delete('accounts', id);
}

export async function deleteAccountChange(id: string) {
  const db = await initDB();
  return db.delete('accountChanges', id);
}

export async function saveSetup(setup: SetupModel) {
  const db = await initDB();
  return db.put('setups', setup);
}

export async function deleteSetup(id: string) {
  const db = await initDB();
  return db.delete('setups', id);
}

export async function savePosition(position: PositionModel) {
  const db = await initDB();
  return db.put('positions', position);
}

export async function saveConfig(config: Config) {
  const db = await initDB();
  return db.put('configs', config);
}

export async function deletePosition(id: string) {
  const db = await initDB();
  return db.delete('positions', id);
}

export async function deleteConfig(key: string) {
  const db = await initDB();
  return db.delete('configs', key);
}

export async function clearAll() {
  const db = await initDB();
  const tx = db.transaction(
    ['accounts', 'accountChanges', 'setups', 'positions', 'configs'],
    'readwrite'
  );
  await Promise.all([
    tx.objectStore('accounts').clear(),
    tx.objectStore('accountChanges').clear(),
    tx.objectStore('setups').clear(),
    tx.objectStore('positions').clear(),
    tx.objectStore('configs').clear(),
    tx.done,
  ]);
}

export async function bulkSave(
  accounts: AccountModel[],
  accountChanges: AccountChangeModel[],
  setups: SetupModel[],
  positions: PositionModel[],
  configs: Config[]
) {
  const db = await initDB();
  const tx = db.transaction(
    ['accounts', 'accountChanges', 'setups', 'positions', 'configs'],
    'readwrite'
  );

  await tx.objectStore('accounts').clear();
  await tx.objectStore('accountChanges').clear();
  await tx.objectStore('setups').clear();
  await tx.objectStore('positions').clear();
  await tx.objectStore('configs').clear();

  for (const acc of accounts) {
    await tx.objectStore('accounts').put(acc);
  }
  for (const change of accountChanges) {
    await tx.objectStore('accountChanges').put(change);
  }
  for (const setup of setups) {
    await tx.objectStore('setups').put(setup);
  }
  for (const pos of positions) {
    await tx.objectStore('positions').put(pos);
  }
  for (const config of configs) {
    await tx.objectStore('configs').put(config);
  }

  await tx.done;
}
