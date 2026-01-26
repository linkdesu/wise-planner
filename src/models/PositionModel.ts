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
  sizingMode: 'risk' | 'stopLoss';
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
    this.sizingMode = data.sizingMode === 'stopLoss' ? 'stopLoss' : 'risk';
    this.totalSizePercent = data.totalSizePercent ?? 10;
  }

  /**
   * Initialize or update resizing steps based on a Setup config.
   */
  applySetup (setup: ISetup) {
    this.setupId = setup.id;
    // Requirements: "the size of each step should be fixed, not calculated dynamically" (initially)
    // We initialize steps with 0 size if new.

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
   * Recalculate sizing using total size percent and mode-driven risk/stop loss.
   */
  recalculateRiskDriven (setup: ISetup, accountBalance = 0) {
    const totalRatio = this._getTotalRatio(setup);
    if (totalRatio === 0) return;

    const totalSize = this._getTotalSizeFromPercent(setup, accountBalance);
    this._distributeSize(totalSize, setup, totalRatio);

    const { totalSize: derivedSize, totalCost } = this._getStepTotals();
    if (derivedSize <= 0) {
      return;
    }

    if (this.sizingMode === 'risk') {
      const stopLoss = this._getStopLossFromRisk(derivedSize, totalCost, this.riskAmount, this.side);
      if (Number.isFinite(stopLoss)) {
        this.stopLossPrice = stopLoss;
      }
      return;
    }

    const riskAmount = this._getRiskFromStopLoss(derivedSize, totalCost, this.stopLossPrice, this.side);
    if (Number.isFinite(riskAmount)) {
      this.riskAmount = riskAmount;
    }
  }

  private _getTotalRatio (setup: ISetup): number {
    return setup.resizingRatios.reduce((a, b) => a + b, 0);
  }

  private _getWeightedAveragePrice (setup: ISetup): number {
    let weightSum = 0;
    let weightedPriceSum = 0;
    let ratioSum = 0;
    let ratioWeightedPriceSum = 0;

    this.steps.forEach((step, idx) => {
      const ratio = setup.resizingRatios[idx] || 0;
      if (ratio <= 0 || step.price <= 0) return;
      const weight = ratio / step.price;
      weightSum += weight;
      weightedPriceSum += weight * step.price;
      ratioSum += ratio;
      ratioWeightedPriceSum += ratio * step.price;
    });

    if (weightSum > 0) {
      return weightedPriceSum / weightSum;
    }
    if (ratioSum > 0) {
      return ratioWeightedPriceSum / ratioSum;
    }
    return 0;
  }

  private _getTotalSizeFromPercent (setup: ISetup, accountBalance: number): number {
    const percent = Math.min(100, Math.max(0, this.totalSizePercent));
    if (accountBalance <= 0 || percent <= 0) return 0;
    const weightedAvgPrice = this._getWeightedAveragePrice(setup);
    if (weightedAvgPrice <= 0) return 0;
    const targetNotional = (accountBalance * percent) / 100;
    return targetNotional / weightedAvgPrice;
  }

  private _getStepTotals (): { totalSize: number, totalCost: number } {
    let totalSize = 0;
    let totalCost = 0;
    this.steps.forEach(step => {
      totalSize += step.size;
      totalCost += step.cost;
    });
    return { totalSize, totalCost };
  }

  private _getStopLossFromRisk (totalSize: number, totalCost: number, riskAmount: number, side: 'long' | 'short'): number {
    if (totalSize <= 0) return 0;
    if (side === 'long') {
      return (totalCost - riskAmount) / totalSize;
    }
    return (riskAmount + totalCost) / totalSize;
  }

  private _getRiskFromStopLoss (totalSize: number, totalCost: number, stopLossPrice: number, side: 'long' | 'short'): number {
    if (totalSize <= 0) return 0;
    if (side === 'long') {
      return totalCost - (stopLossPrice * totalSize);
    }
    return (stopLossPrice * totalSize) - totalCost;
  }

  private _distributeSize (totalSize: number, setup: ISetup, totalRatio: number) {
    let totalCost = 0;
    let totalFilledSize = 0;
    let totalFilledCost = 0;
    let cumSize = 0;
    let cumCost = 0;
    let weightSum = 0;
    const weights = this.steps.map((step, idx) => {
      const ratio = setup.resizingRatios[idx] || 0;
      if (ratio <= 0 || step.price <= 0) {
        return 0;
      }
      const weight = ratio / step.price;
      weightSum += weight;
      return weight;
    });

    this.steps.forEach((step, idx) => {
      const ratio = setup.resizingRatios[idx] || 0;
      const normalizedRatio = totalRatio > 0 ? (ratio / totalRatio) : 0;
      const normalizedWeight = weightSum > 0 ? (weights[idx] / weightSum) : 0;
      const allocation = weightSum > 0 ? normalizedWeight : normalizedRatio;

      step.size = totalSize * allocation;
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
