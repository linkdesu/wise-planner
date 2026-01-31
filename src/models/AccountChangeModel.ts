import type { AccountChangeType, IAccountChange } from './types';

export class AccountChangeModel implements IAccountChange {
  id: string;
  accountId: string;
  amount: number;
  type: AccountChangeType;
  note: string;
  createdAt: number;

  constructor(data: Partial<IAccountChange> = {}) {
    this.id = data.id || crypto.randomUUID();
    this.accountId = data.accountId || '';
    this.amount = Number.isFinite(data.amount) ? Number(data.amount) : 0;
    this.type = data.type || 'deposit';
    this.note = data.note || '';
    this.createdAt = data.createdAt || Date.now();
  }
}
