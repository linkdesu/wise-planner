import type { IPosition, IResizingStep, PositionStatus, ISetup } from './types';
import { toFixed, fromFixed, mulFixed, divFixed } from '../utils/fixedPoint';

export class PositionModel implements IPosition {
  id: string;
  accountId: string;
  side: 'long' | 'short';
  symbol: string;
  setupId: string;
  status: PositionStatus;
  entryPrice: number;
  stopLossPrice: number;
  riskAmount: number;
  steps: IResizingStep[];
  pnl?: number;
  feeTotal?: number;
  currentBE?: number;
  predictedBE?: number;
  createdAt: number;
  closedAt?: number;
  leverage: number; // New property

  constructor (data: Partial<IPosition & { accountId?: string }> = {}) {
    this.id = data.id || crypto.randomUUID();
    this.accountId = data.accountId || '';
    this.side = data.side || 'long';
    this.symbol = data.symbol || '';
    this.setupId = data.setupId || '';
    this.status = data.status || 'planning';
    this.entryPrice = data.entryPrice || 0;
    this.stopLossPrice = data.stopLossPrice || 0;
    this.riskAmount = data.riskAmount || 100;
    this.steps = data.steps || [];
    this.createdAt = data.createdAt || Date.now();
    this.pnl = data.pnl;
    this.feeTotal = data.feeTotal;
    this.currentBE = data.currentBE;
    this.predictedBE = data.predictedBE;
    this.closedAt = data.closedAt;
    this.leverage = data.leverage || 1;
  }

  /**
   * Initialize or update resizing steps based on a Setup config.
   */
  applySetup (setup: ISetup) {
    this.setupId = setup.id;

    if (this.steps.length !== setup.resizingTimes) {
      this.steps = Array.from({ length: setup.resizingTimes }, (_, i) => ({
        id: crypto.randomUUID(),
        price: 0,
        size: 0,
        cost: 0,
        orderType: 'taker',
        fee: 0,
        isFilled: false,
        predictedBE: 0
      }));
    }
  }

  /**
   * Recalculate sizing using user-input risk and stop loss with a margin cap.
   */
  recalculateRiskDriven (setup: ISetup, accountBalance = 0) {
    const totalRatioFixed = this._getTotalRatioFixed(setup);
    if (totalRatioFixed === 0n) return;

    const lossPerCostFixed = this._getLossPerCostFixed(setup, totalRatioFixed);
    if (lossPerCostFixed <= 0n) return;

    const totalCostFixed = this._getTotalCostFromRisk(accountBalance, lossPerCostFixed);
    this._distributeCost(totalCostFixed, setup, totalRatioFixed);
  }

  private _getTotalRatioFixed (setup: ISetup): bigint {
    return setup.resizingRatios.reduce((sum, ratio) => sum + toFixed(ratio), 0n);
  }

  private _getLossPerCostFixed (setup: ISetup, totalRatioFixed: bigint): bigint {
    if (totalRatioFixed === 0n) return 0n;

    let lossPerCostFixed = 0n;

    this.steps.forEach((step, idx) => {
      const ratio = setup.resizingRatios[idx] || 0;
      const ratioFixed = toFixed(ratio);
      if (ratioFixed <= 0n || step.price <= 0) return;
      const normalizedRatioFixed = divFixed(ratioFixed, totalRatioFixed);
      if (normalizedRatioFixed <= 0n) return;

      const lossPerUnit = this.side === 'long'
        ? step.price - this.stopLossPrice
        : this.stopLossPrice - step.price;

      const lossPerUnitFixed = toFixed(lossPerUnit);
      const priceFixed = toFixed(step.price);
      if (priceFixed === 0n) return;
      const lossPerPriceFixed = divFixed(lossPerUnitFixed, priceFixed);
      lossPerCostFixed += mulFixed(normalizedRatioFixed, lossPerPriceFixed);
    });

    return lossPerCostFixed;
  }

  private _getTotalCostFromRisk (accountBalance: number, lossPerCostFixed: bigint): bigint {
    if (lossPerCostFixed <= 0n || this.riskAmount <= 0) return 0n;

    let totalCostFixed = divFixed(toFixed(this.riskAmount), lossPerCostFixed);

    if (accountBalance > 0 && this.leverage > 0) {
      const targetNotionalFixed = mulFixed(toFixed(accountBalance), toFixed(this.leverage));
      if (targetNotionalFixed > 0n && totalCostFixed > targetNotionalFixed) {
        totalCostFixed = targetNotionalFixed;
      }
    }

    return totalCostFixed;
  }

  private _distributeCost (totalCostFixed: bigint, setup: ISetup, totalRatioFixed: bigint) {
    if (totalCostFixed <= 0n || totalRatioFixed <= 0n) return;

    let totalFilledSizeFixed = 0n;
    let totalFilledCostFixed = 0n;
    let cumSizeFixed = 0n;
    let cumCostFixed = 0n;

    this.steps.forEach((step, idx) => {
      const ratio = setup.resizingRatios[idx] || 0;
      const ratioFixed = toFixed(ratio);
      const normalizedRatioFixed = totalRatioFixed > 0n ? divFixed(ratioFixed, totalRatioFixed) : 0n;
      const priceFixed = toFixed(step.price);

      if (step.price <= 0 || normalizedRatioFixed <= 0n || priceFixed === 0n) return;

      const stepCostFixed = mulFixed(totalCostFixed, normalizedRatioFixed);
      const stepSizeFixed = divFixed(stepCostFixed, priceFixed);
      step.size = fromFixed(stepSizeFixed);
      step.cost = fromFixed(stepCostFixed);

      cumSizeFixed += stepSizeFixed;
      cumCostFixed += stepCostFixed;
      step.predictedBE = cumSizeFixed > 0n ? fromFixed(divFixed(cumCostFixed, cumSizeFixed)) : 0;

      if (step.isFilled) {
        totalFilledSizeFixed += stepSizeFixed;
        totalFilledCostFixed += stepCostFixed;
      }
    });

    this.predictedBE = cumSizeFixed > 0n ? fromFixed(divFixed(cumCostFixed, cumSizeFixed)) : 0;
    this.currentBE = totalFilledSizeFixed > 0n ? fromFixed(divFixed(totalFilledCostFixed, totalFilledSizeFixed)) : 0;
  }

  getMarginEstimate (): number {
    const totalCost = this.steps.reduce((sum, s) => sum + s.cost, 0);
    return this.leverage > 0 ? totalCost / this.leverage : totalCost;
  }

}
