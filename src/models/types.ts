export type OrderType = 'taker' | 'maker';
export type PositionStatus = 'planning' | 'opened' | 'closed';
export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONValue[] | { [key: string]: JSONValue };

export interface IResizingStep {
  id: string;
  price: number;
  size: number;
  cost: number;
  orderType: OrderType;
  fee: number;
  isFilled: boolean;
  isClosed: boolean;
  predictedBE?: number;
}

export interface IPosition {
  id: string;
  side: 'long' | 'short';
  symbol: string;
  setupId: string;
  status: PositionStatus;
  entryPrice: number;
  stopLossPrice: number;
  leverage: number;
  riskAmount: number; // Planned risk amount
  steps: IResizingStep[];
  chaseSteps: IResizingStep[];
  pnl?: number;
  feeTotal?: number;
  currentBE?: number;
  predictedBE?: number;
  extraRisk?: number;
  createdAt: number;
  closedAt?: number;
}

export interface ISetup {
  id: string;
  name: string;
  resizingTimes: number;
  resizingRatios: number[];
  isDeleted?: boolean;
}

export interface IAccount {
  id: string;
  name: string;
  initialBalance: number;
  currentBalance: number;
  takerFee: number; // Percentage, e.g. 0.0005 for 0.05%
  makerFee: number; // Percentage
}

export type AccountChangeType = 'deposit' | 'withdraw' | 'loss' | 'win';

export interface IAccountChange {
  id: string;
  accountId: string;
  amount: number;
  type: AccountChangeType;
  note: string;
  createdAt: number;
}
