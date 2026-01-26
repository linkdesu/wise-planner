import type { IPosition, IResizingStep, PositionStatus, ISetup } from './types';

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
  totalSizePercent: number;

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
    this.totalSizePercent = data.totalSizePercent ?? 10;
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
    const totalRatio = this._getTotalRatio(setup);
    if (totalRatio === 0) return;

    const weightedLossPerUnit = this._getWeightedLossPerUnit(setup);
    if (weightedLossPerUnit <= 0) return;

    const totalSize = this._getTotalSizeFromRisk(setup, accountBalance, weightedLossPerUnit);
    this._distributeSize(totalSize, setup, totalRatio);
  }

  private _getTotalRatio (setup: ISetup): number {
    return setup.resizingRatios.reduce((a, b) => a + b, 0);
  }

  private _getWeightedAveragePrice (setup: ISetup): number {
    let ratioSum = 0;
    let ratioWeightedPriceSum = 0;

    this.steps.forEach((step, idx) => {
      const ratio = setup.resizingRatios[idx] || 0;
      if (ratio <= 0 || step.price <= 0) return;
      ratioSum += ratio;
      ratioWeightedPriceSum += ratio * step.price;
    });

    if (ratioSum > 0) {
      return ratioWeightedPriceSum / ratioSum;
    }
    return 0;
  }

  private _getWeightedLossPerUnit (setup: ISetup): number {
    const totalRatio = this._getTotalRatio(setup);
    if (totalRatio === 0) return 0;

    let weightedLossSum = 0;
    this.steps.forEach((step, idx) => {
      const ratio = setup.resizingRatios[idx] || 0;
      const normalizedRatio = ratio / totalRatio;
      if (step.price <= 0 || normalizedRatio <= 0) return;

      const lossPerUnit = this.side === 'long'
        ? step.price - this.stopLossPrice
        : this.stopLossPrice - step.price;

      weightedLossSum += normalizedRatio * lossPerUnit;
    });

    return weightedLossSum;
  }

  private _getTotalSizeFromRisk (setup: ISetup, accountBalance: number, weightedLossPerUnit: number): number {
    const percent = Math.min(100, Math.max(0, this.totalSizePercent));
    if (weightedLossPerUnit <= 0 || this.riskAmount <= 0) return 0;

    let totalSize = this.riskAmount / weightedLossPerUnit;

    if (accountBalance > 0 && percent > 0) {
      const weightedAvgPrice = this._getWeightedAveragePrice(setup);
      if (weightedAvgPrice > 0) {
        const targetMargin = (accountBalance * percent) / 100;
        const targetNotional = targetMargin * (this.leverage > 0 ? this.leverage : 1);
        const capSize = targetNotional / weightedAvgPrice;
        if (capSize > 0) {
          totalSize = Math.min(totalSize, capSize);
        }
      }
    }

    return totalSize;
  }

  private _distributeSize (totalSize: number, setup: ISetup, totalRatio: number) {
    let totalCost = 0;
    let totalFilledSize = 0;
    let totalFilledCost = 0;
    let cumSize = 0;
    let cumCost = 0;

    this.steps.forEach((step, idx) => {
      const ratio = setup.resizingRatios[idx] || 0;
      const normalizedRatio = totalRatio > 0 ? (ratio / totalRatio) : 0;

      step.size = totalSize * normalizedRatio;
      step.cost = step.size * step.price;

      cumSize += step.size;
      cumCost += step.cost;
      step.predictedBE = cumSize > 0 ? cumCost / cumSize : 0;

      totalCost += step.cost;

      if (step.isFilled) {
        totalFilledSize += step.size;
        totalFilledCost += step.cost;
      }
    });

    this.predictedBE = totalSize > 0 ? totalCost / totalSize : 0;
    this.currentBE = totalFilledSize > 0 ? totalFilledCost / totalFilledSize : 0;
  }

  getMarginEstimate (): number {
    const totalCost = this.steps.reduce((sum, s) => sum + s.cost, 0);
    return this.leverage > 0 ? totalCost / this.leverage : totalCost;
  }

}
