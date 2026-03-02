import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { AccountChangeModel } from '../models/AccountChangeModel';
import { AccountModel } from '../models/AccountModel';
import { Config } from '../models/ConfigModel';
import { PositionModel } from '../models/PositionModel';
import { PositionTagModel } from '../models/PositionTagModel';
import { SetupModel } from '../models/SetupModel';
import { TagFieldModel } from '../models/TagFieldModel';
import { TagValueModel } from '../models/TagValueModel';
import { CORE_TAG_FIELDS, CORE_TAG_VALUES } from '../models/tagDefaults';
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
  tagFields: {
    key: string;
    value: TagFieldModel;
  };
  tagValues: {
    key: string;
    value: TagValueModel;
    indexes: { 'by-field': string };
  };
  positionTags: {
    key: string;
    value: PositionTagModel;
    indexes: { 'by-position': string; 'by-field': string; 'by-value': string };
  };
  configs: {
    key: string;
    value: Config;
  };
}

const DB_NAME = 'position-planner-db';
const DB_VERSION = 6;

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
        if (!db.objectStoreNames.contains('tagFields')) {
          db.createObjectStore('tagFields', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('tagValues')) {
          const tagValueStore = db.createObjectStore('tagValues', { keyPath: 'id' });
          tagValueStore.createIndex('by-field', 'fieldId');
        }
        if (!db.objectStoreNames.contains('positionTags')) {
          const positionTagStore = db.createObjectStore('positionTags', { keyPath: 'id' });
          positionTagStore.createIndex('by-position', 'positionId');
          positionTagStore.createIndex('by-field', 'fieldId');
          positionTagStore.createIndex('by-value', 'valueId');
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

        if (oldVersion < 6) {
          const tagFieldStore = tx.objectStore('tagFields');
          const tagValueStore = tx.objectStore('tagValues');
          const existingFieldCount = await tagFieldStore.count();
          const existingValueCount = await tagValueStore.count();
          if (existingFieldCount === 0) {
            for (const field of CORE_TAG_FIELDS) {
              tagFieldStore.put(field);
            }
          }
          if (existingValueCount === 0) {
            for (const value of CORE_TAG_VALUES) {
              tagValueStore.put(value);
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

export async function getAllTagFields(): Promise<TagFieldModel[]> {
  const db = await initDB();
  return db.getAll('tagFields');
}

export async function getAllTagValues(): Promise<TagValueModel[]> {
  const db = await initDB();
  return db.getAll('tagValues');
}

export async function getAllPositionTags(): Promise<PositionTagModel[]> {
  const db = await initDB();
  return db.getAll('positionTags');
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

export async function saveTagField(tagField: TagFieldModel) {
  const db = await initDB();
  return db.put('tagFields', tagField);
}

export async function saveTagValue(tagValue: TagValueModel) {
  const db = await initDB();
  return db.put('tagValues', tagValue);
}

export async function savePositionTag(positionTag: PositionTagModel) {
  const db = await initDB();
  return db.put('positionTags', positionTag);
}

export async function saveConfig(config: Config) {
  const db = await initDB();
  return db.put('configs', config);
}

export async function deletePosition(id: string) {
  const db = await initDB();
  return db.delete('positions', id);
}

export async function deleteTagField(id: string) {
  const db = await initDB();
  return db.delete('tagFields', id);
}

export async function deleteTagValue(id: string) {
  const db = await initDB();
  return db.delete('tagValues', id);
}

export async function deletePositionTag(id: string) {
  const db = await initDB();
  return db.delete('positionTags', id);
}

export async function deletePositionTagsByPosition(positionId: string) {
  const db = await initDB();
  const tx = db.transaction('positionTags', 'readwrite');
  const ids = await tx.store.index('by-position').getAllKeys(positionId);
  for (const id of ids) {
    await tx.store.delete(id);
  }
  await tx.done;
}

export async function deletePositionTagsByField(fieldId: string) {
  const db = await initDB();
  const tx = db.transaction('positionTags', 'readwrite');
  const ids = await tx.store.index('by-field').getAllKeys(fieldId);
  for (const id of ids) {
    await tx.store.delete(id);
  }
  await tx.done;
}

export async function deletePositionTagsByValue(valueId: string) {
  const db = await initDB();
  const tx = db.transaction('positionTags', 'readwrite');
  const ids = await tx.store.index('by-value').getAllKeys(valueId);
  for (const id of ids) {
    await tx.store.delete(id);
  }
  await tx.done;
}

export async function deleteTagValuesByField(fieldId: string) {
  const db = await initDB();
  const tx = db.transaction('tagValues', 'readwrite');
  const ids = await tx.store.index('by-field').getAllKeys(fieldId);
  for (const id of ids) {
    await tx.store.delete(id);
  }
  await tx.done;
}

export async function deleteConfig(key: string) {
  const db = await initDB();
  return db.delete('configs', key);
}

export async function clearAll() {
  const db = await initDB();
  const tx = db.transaction(
    [
      'accounts',
      'accountChanges',
      'setups',
      'positions',
      'tagFields',
      'tagValues',
      'positionTags',
      'configs',
    ],
    'readwrite'
  );
  await Promise.all([
    tx.objectStore('accounts').clear(),
    tx.objectStore('accountChanges').clear(),
    tx.objectStore('setups').clear(),
    tx.objectStore('positions').clear(),
    tx.objectStore('tagFields').clear(),
    tx.objectStore('tagValues').clear(),
    tx.objectStore('positionTags').clear(),
    tx.objectStore('configs').clear(),
    tx.done,
  ]);
}

export async function bulkSave(
  accounts: AccountModel[],
  accountChanges: AccountChangeModel[],
  setups: SetupModel[],
  positions: PositionModel[],
  tagFields: TagFieldModel[],
  tagValues: TagValueModel[],
  positionTags: PositionTagModel[],
  configs: Config[]
) {
  const db = await initDB();
  const tx = db.transaction(
    [
      'accounts',
      'accountChanges',
      'setups',
      'positions',
      'tagFields',
      'tagValues',
      'positionTags',
      'configs',
    ],
    'readwrite'
  );

  await tx.objectStore('accounts').clear();
  await tx.objectStore('accountChanges').clear();
  await tx.objectStore('setups').clear();
  await tx.objectStore('positions').clear();
  await tx.objectStore('tagFields').clear();
  await tx.objectStore('tagValues').clear();
  await tx.objectStore('positionTags').clear();
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
  for (const tagField of tagFields) {
    await tx.objectStore('tagFields').put(tagField);
  }
  for (const tagValue of tagValues) {
    await tx.objectStore('tagValues').put(tagValue);
  }
  for (const positionTag of positionTags) {
    await tx.objectStore('positionTags').put(positionTag);
  }
  for (const config of configs) {
    await tx.objectStore('configs').put(config);
  }

  await tx.done;
}
