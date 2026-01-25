import type { IAccount } from './types';
import { PositionModel } from './PositionModel';

export class AccountModel implements IAccount {
  id: string;
  name: string;
  initialBalance: number;
  currentBalance: number;
  takerFee: number;
  makerFee: number;
  positions: PositionModel[];

  constructor (data: Partial<IAccount> = {}) {
    this.id = data.id || crypto.randomUUID();
    this.name = data.name || 'Main Account';
    this.initialBalance = data.initialBalance || 10000;
    this.currentBalance = data.currentBalance || this.initialBalance;
    this.takerFee = data.takerFee || 0.0005; // 0.05% default
    this.makerFee = data.makerFee || 0.0002; // 0.02% default
    this.positions = (data.positions || []).map(p => new PositionModel(p));
  }

  addPosition (position: PositionModel) {
    this.positions.push(position);
  }

  calculateStats () {
    let realizedPnL = 0;
    let totalFees = 0;

    // Only count closed positions for realized balance
    this.positions.forEach(p => {
      if (p.status === 'closed' && p.pnl !== undefined) {
        realizedPnL += p.pnl;
        totalFees += p.feeTotal || 0;
      }
    });

    this.currentBalance = this.initialBalance + realizedPnL; // Net of fees usually, assuming PnL is Net
    return { realizedPnL, totalFees, currentBalance: this.currentBalance };
  }
}
