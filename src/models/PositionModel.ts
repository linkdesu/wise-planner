import type { IPosition, IResizingStep, PositionStatus, ISetup } from './types';

export class PositionModel implements IPosition {
  id: string;
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

  constructor (data: Partial<IPosition> = {}) {
    this.id = data.id || crypto.randomUUID();
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
  }

  /**
   * Initialize or update resizing steps based on a Setup config.
   * This is typically called when "Planning" a position.
   */
  applySetup (setup: ISetup) {
    this.setupId = setup.id;
    // Calculate total Units based on simple Risk formula:
    // Risk = (Entry - StopLoss) * Units
    // Units = Risk / (Entry - StopLoss)
    // Note: This is an estimated total unit size if we executed everything at Entry.
    // Real resizing logic needs to distribute this risk.

    // For resizing, we usually allocate risk "portions" per step.
    // Example: Ratio 1:1 means 50% risk for step 1, 50% risk for step 2.
    // Or we split the Units?
    // Usually it's units or cost. Let's assume Ratio applies to "Size in Units".

    // BUT, we don't know the future execution prices of steps 2, 3...
    // So distinct planning is needed.

    // Requirements said: "app should automatically create inputs for each resizing which contains price"
    // So initially we prepare the steps structure.

    if (this.steps.length !== setup.resizingTimes) {
      this.steps = Array.from({ length: setup.resizingTimes }, (_, i) => ({
        id: crypto.randomUUID(),
        price: i === 0 ? this.entryPrice : 0, // First step usually at entry
        size: 0,
        cost: 0,
        orderType: 'taker',
        fee: 0,
        isFilled: false,
      }));
    }
  }

  /**
   * Recalculate sizes and Break-Even based on step inputs.
   */
  recalculate (setup: ISetup) {
    const totalRatio = setup.resizingRatios.reduce((a, b) => a + b, 0);
    // Base unit calc on the FIRST step (Entry) logic usually?
    // OR we distribute the RISK Amount across steps?
    // Let's assume we distribute the Risk Amount.

    // Risk per unit = |StepPrice - StopLoss|
    // StepRiskAllocation = TotalRisk * (StepRatio / TotalRatio)
    // StepUnits = StepRiskAllocation / |StepPrice - StopLoss|

    let totalPlannedSize = 0;
    let totalPlannedCost = 0;
    let totalFilledSize = 0;
    let totalFilledCost = 0;

    this.steps.forEach((step, index) => {
      const ratio = setup.resizingRatios[index] || 1;
      const riskAllocation = this.riskAmount * (ratio / totalRatio);
      const priceGap = Math.abs(step.price - this.stopLossPrice);

      if (priceGap > 0 && step.price > 0) {
        step.size = riskAllocation / priceGap;
        step.cost = step.size * step.price;
      } else {
        step.size = 0;
        step.cost = 0;
      }

      totalPlannedSize += step.size;
      totalPlannedCost += step.cost;

      if (step.isFilled) {
        totalFilledSize += step.size;
        totalFilledCost += step.cost;
      }
    });

    this.predictedBE = totalPlannedSize > 0 ? totalPlannedCost / totalPlannedSize : 0;
    this.currentBE = totalFilledSize > 0 ? totalFilledCost / totalFilledSize : 0;
  }
}
