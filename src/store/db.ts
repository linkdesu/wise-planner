import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { AccountModel } from '../models/AccountModel';
import { SetupModel } from '../models/SetupModel';
import { PositionModel } from '../models/PositionModel';

interface PlannerDB extends DBSchema {
  accounts: {
    key: string;
    value: AccountModel;
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
}

const DB_NAME = 'position-planner-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<PlannerDB>>;

export function initDB () {
  if (!dbPromise) {
    dbPromise = openDB<PlannerDB>(DB_NAME, DB_VERSION, {
      upgrade (db) {
        if (!db.objectStoreNames.contains('accounts')) {
          db.createObjectStore('accounts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('setups')) {
          db.createObjectStore('setups', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('positions')) {
          const posStore = db.createObjectStore('positions', { keyPath: 'id' });
          posStore.createIndex('by-account', 'accountId');
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllAccounts (): Promise<AccountModel[]> {
  const db = await initDB();
  return db.getAll('accounts');
}

export async function getAllSetups (): Promise<SetupModel[]> {
  const db = await initDB();
  return db.getAll('setups');
}

export async function getAllPositions (): Promise<PositionModel[]> {
  const db = await initDB();
  return db.getAll('positions');
}

export async function saveAccount (account: AccountModel) {
  const db = await initDB();
  return db.put('accounts', account);
}

export async function deleteAccount (id: string) {
  const db = await initDB();
  return db.delete('accounts', id);
}

export async function saveSetup (setup: SetupModel) {
  const db = await initDB();
  return db.put('setups', setup);
}

export async function deleteSetup (id: string) {
  const db = await initDB();
  return db.delete('setups', id);
}

export async function savePosition (position: PositionModel) {
  const db = await initDB();
  return db.put('positions', position);
}

export async function deletePosition (id: string) {
  const db = await initDB();
  return db.delete('positions', id);
}

export async function clearAll () {
  const db = await initDB();
  const tx = db.transaction(['accounts', 'setups', 'positions'], 'readwrite');
  await Promise.all([
    tx.objectStore('accounts').clear(),
    tx.objectStore('setups').clear(),
    tx.objectStore('positions').clear(),
    tx.done,
  ]);
}

export async function bulkSave (accounts: AccountModel[], setups: SetupModel[], positions: PositionModel[]) {
  const db = await initDB();
  const tx = db.transaction(['accounts', 'setups', 'positions'], 'readwrite');

  await tx.objectStore('accounts').clear();
  await tx.objectStore('setups').clear();
  await tx.objectStore('positions').clear();

  for (const acc of accounts) {
    await tx.objectStore('accounts').put(acc);
  }
  for (const setup of setups) {
    await tx.objectStore('setups').put(setup);
  }
  for (const pos of positions) {
    await tx.objectStore('positions').put(pos);
  }

  await tx.done;
}
