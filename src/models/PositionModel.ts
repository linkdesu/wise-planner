import Decimal from 'decimal.js';
import type { IPosition, IResizingStep, ISetup, PositionStatus } from './types';

Decimal.set({ precision: 8, rounding: Decimal.ROUND_HALF_UP });

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

  constructor(data: Partial<IPosition & { accountId?: string }> = {}) {
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
  applySetup(setup: ISetup) {
    this.setupId = setup.id;

    if (this.steps.length !== setup.resizingTimes) {
      this.steps = Array.from({ length: setup.resizingTimes }, (_) => ({
        id: crypto.randomUUID(),
        price: 0,
        size: 0,
        cost: 0,
        orderType: 'taker',
        fee: 0,
        isFilled: false,
        predictedBE: 0,
      }));
    }
  }

  /**
   * Recalculate sizing using user-input risk and stop loss with a margin cap.
   */
  recalculateRiskDriven(
    setup: ISetup,
    accountBalance = 0,
    fees?: { makerFee: number; takerFee: number }
  ) {
    this.feeTotal = 0;
    const totalRatio = this._getTotalRatio(setup);
    if (totalRatio.lte(0)) return;

    console.log(`==================== Calculate Steps Size for ${setup.name} ====================`);

    const unfilledTotalRatio = this._getUnfilledTotalRatio(setup);
    const filledRisk = this._calcFilledRisk();
    const remainingRisk = Math.max(this.riskAmount - filledRisk, 0);
    console.log(`remainingRisk: ${remainingRisk} = ${this.riskAmount} - ${filledRisk}`);
    const lossPerCost = unfilledTotalRatio.gt(0)
      ? this._calcLossPerCost(setup, unfilledTotalRatio, (_, step) => !step.isFilled)
      : new Decimal(0);

    const totalCost =
      remainingRisk > 0 && lossPerCost.gt(0)
        ? this._calcNationalCostFromRisk(accountBalance, lossPerCost, remainingRisk)
        : new Decimal(0);
    this._distributeCost(totalCost, setup, fees);
  }

  private _getTotalRatio(setup: ISetup): Decimal {
    return setup.resizingRatios.reduce((sum, ratio) => sum.plus(ratio), new Decimal(0));
  }

  private _getUnfilledTotalRatio(setup: ISetup): Decimal {
    return setup.resizingRatios.reduce((sum, ratio, idx) => {
      if (this.steps[idx]?.isFilled) return sum;
      return sum.plus(ratio);
    }, new Decimal(0));
  }

  private _calcFilledRisk(): number {
    return this.steps.reduce((sum, step) => {
      if (!step.isFilled || step.price <= 0 || step.size <= 0) return sum;
      const lossPerUnit =
        this.side === 'long' ? step.price - this.stopLossPrice : this.stopLossPrice - step.price;
      if (lossPerUnit <= 0) return sum;
      return sum + step.size * lossPerUnit;
    }, 0);
  }

  private _calcLossPerCost(
    setup: ISetup,
    totalRatio: Decimal,
    includeStep?: (idx: number, step: IResizingStep) => boolean
  ): Decimal {
    if (totalRatio.lte(0)) return new Decimal(0);

    let lossPerCost = new Decimal(0);

    console.log(`==================== Loss Per Cost ====================`);

    this.steps.forEach((step, idx) => {
      if (includeStep && !includeStep(idx, step)) return;

      console.log(`==================== Step ${idx} ====================`);

      const ratio = setup.resizingRatios[idx] || 0;
      const ratioDec = new Decimal(ratio);
      if (ratioDec.lte(0) || step.price <= 0) return;
      const normalizedRatio = ratioDec.div(totalRatio);
      console.log(`normalizedRatio: ${normalizedRatio} = ${ratioDec} / ${totalRatio}`);

      if (normalizedRatio.lte(0)) return;

      const lossPerUnit =
        this.side === 'long' ? step.price - this.stopLossPrice : this.stopLossPrice - step.price;
      console.log(`lossPerUnit: ${lossPerUnit} = ${step.price} - ${this.stopLossPrice}`);

      const lossPerUnitDec = new Decimal(lossPerUnit);
      const priceDec = new Decimal(step.price);
      if (priceDec.lte(0)) return;
      const lossPerPrice = lossPerUnitDec.div(priceDec);
      console.log(`lossPerPrice: ${lossPerPrice} = ${lossPerUnit} / ${priceDec}`);
      lossPerCost = lossPerCost.plus(normalizedRatio.times(lossPerPrice));
      console.log(
        `lossPerCost: ${lossPerCost} = ${lossPerCost} + ${normalizedRatio} x ${lossPerPrice}`
      );
    });

    return lossPerCost;
  }

  private _calcNationalCostFromRisk(
    accountBalance: number,
    lossPerCost: Decimal,
    riskAmount: number
  ): Decimal {
    if (lossPerCost.lte(0) || riskAmount <= 0) return new Decimal(0);

    console.log(`==================== Total Cost ====================`);

    let margin = new Decimal(riskAmount).div(lossPerCost);
    console.log(`margin: ${margin} = ${riskAmount} / ${lossPerCost}`);

    if (accountBalance > 0 && this.leverage > 0) {
      const notionalCost = new Decimal(accountBalance).times(this.leverage);
      console.log(`notionalCost: ${notionalCost} = ${accountBalance} x ${this.leverage}`);
      if (notionalCost.gt(0) && margin.gt(notionalCost)) {
        margin = notionalCost;
      }
    }

    return margin;
  }

  private _distributeCost(
    totalCost: Decimal,
    setup: ISetup,
    fees?: { makerFee: number; takerFee: number }
  ) {
    console.log(`==================== Distribute cost: ${totalCost} ====================`);

    let totalFilledSize = new Decimal(0);
    let totalFilledCost = new Decimal(0);
    let totalFilledFee = new Decimal(0);
    let cumulativeSize = new Decimal(0);
    let cumulativeCost = new Decimal(0);
    let totalUnfilledRatio = new Decimal(0);

    this.steps.forEach((step, idx) => {
      const ratio = setup.resizingRatios[idx] || 0;
      const ratioDec = new Decimal(ratio);
      if (!step.isFilled && ratioDec.gt(0)) {
        totalUnfilledRatio = totalUnfilledRatio.plus(ratioDec);
      }
    });
    const remainingCost = totalCost;

    this.steps.forEach((step, idx) => {
      const ratio = setup.resizingRatios[idx] || 0;
      const ratioDec = new Decimal(ratio);
      const priceDec = new Decimal(step.price);

      if (step.price <= 0 || priceDec.lte(0)) return;

      const feeRate = step.orderType === 'maker' ? fees?.makerFee || 0 : fees?.takerFee || 0;

      if (step.isFilled) {
        const sizeDec = new Decimal(step.size);
        const stepCost = priceDec.times(sizeDec);
        const stepFee = stepCost.times(feeRate);
        step.cost = stepCost.toNumber();
        step.fee = stepFee.toNumber();

        cumulativeSize = cumulativeSize.plus(sizeDec);
        cumulativeCost = cumulativeCost.plus(stepCost).plus(stepFee);
        step.predictedBE = cumulativeSize.gt(0) ? cumulativeCost.div(cumulativeSize).toNumber() : 0;

        totalFilledSize = totalFilledSize.plus(sizeDec);
        totalFilledCost = totalFilledCost.plus(stepCost).plus(stepFee);
        totalFilledFee = totalFilledFee.plus(stepFee);
        return;
      }

      console.log(`==================== Step ${idx} ====================`);

      const normalizedRatio = totalUnfilledRatio.gt(0)
        ? ratioDec.div(totalUnfilledRatio)
        : new Decimal(0);
      console.log(`normalizedRatio: ${normalizedRatio} = ${ratioDec} / ${totalUnfilledRatio}`);

      if (normalizedRatio.lte(0) || remainingCost.lte(0)) return;

      const stepCost = remainingCost.times(normalizedRatio);
      console.log(`stepCost: ${stepCost} = ${remainingCost} x ${normalizedRatio}`);
      const stepSize = stepCost.div(priceDec);
      console.log(`stepSize: ${stepSize} = ${stepCost} / ${priceDec}`);
      const stepFee = stepCost.times(feeRate);
      console.log(`stepFee: ${stepFee} = ${stepCost} x ${feeRate}`);
      step.size = stepSize.toNumber();
      step.cost = stepCost.toNumber();
      step.fee = stepFee.toNumber();

      cumulativeSize = cumulativeSize.plus(stepSize);
      cumulativeCost = cumulativeCost.plus(stepCost).plus(stepFee);
      step.predictedBE = cumulativeSize.gt(0) ? cumulativeCost.div(cumulativeSize).toNumber() : 0;
      console.log(`step.predictedBE: ${step.predictedBE} = ${cumulativeCost} / ${cumulativeSize}`);

      if (step.isFilled) {
        totalFilledSize = totalFilledSize.plus(stepSize);
        totalFilledCost = totalFilledCost.plus(stepCost).plus(stepFee);
        totalFilledFee = totalFilledFee.plus(stepFee);
      }
    });

    this.predictedBE = cumulativeSize.gt(0) ? cumulativeCost.div(cumulativeSize).toNumber() : 0;
    this.currentBE = totalFilledSize.gt(0) ? totalFilledCost.div(totalFilledSize).toNumber() : 0;
    this.feeTotal = totalFilledFee.toNumber();
  }

  getMarginEstimate(): number {
    const totalCost = this.steps.reduce((sum, step) => sum + step.size * step.price, 0);
    return this.leverage > 0 ? totalCost / this.leverage : totalCost;
  }
}
