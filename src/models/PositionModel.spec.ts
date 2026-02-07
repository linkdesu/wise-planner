import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import { PositionModel } from './PositionModel';
import { SetupModel } from './SetupModel';

describe('PositionModel sizing', () => {
  const calcTotalRisk = (position: PositionModel) => {
    const result = position.steps.reduce((sum, step) => {
      if (step.price <= 0 || step.size <= 0) return sum;
      const lossPerUnit =
        position.side === 'long'
          ? new Decimal(step.price).minus(position.stopLossPrice)
          : new Decimal(position.stopLossPrice).minus(step.price);
      if (lossPerUnit.lte(0)) return sum;
      return sum.plus(new Decimal(step.size).times(lossPerUnit));
    }, new Decimal(0));

    return result.toNumber();
  };

  it('should preserve step prices, risk amount and stop loss price during recalculation', () => {
    const setup = new SetupModel({ resizingTimes: 2, resizingRatios: [1, 1] });
    const position = new PositionModel({
      side: 'long',
      riskAmount: 100,
      stopLossPrice: 95,
    });
    position.applySetup(setup);
    position.steps[0].price = 120;
    position.steps[1].price = 100;

    position.recalculateRiskDriven(setup, 10000);

    expect(position.steps[0].price).toBe(120);
    expect(position.steps[1].price).toBe(100);
    expect(position.riskAmount).toBe(100);
    expect(position.stopLossPrice).toBe(95);
    expect(calcTotalRisk(position)).toBeLessThanOrEqual(position.riskAmount);
  });

  it('should properly recalculate size for steps after stop loss price changed', () => {
    const setup = new SetupModel({ resizingTimes: 2, resizingRatios: [1, 1] });
    const position = new PositionModel({
      side: 'long',
      riskAmount: 100,
      stopLossPrice: 95,
    });
    position.applySetup(setup);
    position.steps[0].price = 120;
    position.steps[1].price = 100;

    position.recalculateRiskDriven(setup, 10000);

    expect(position.steps[0].size).toBeCloseTo(3.2258, 3);
    expect(position.steps[1].size).toBeCloseTo(3.871, 3);
    expect(calcTotalRisk(position)).toBeLessThanOrEqual(position.riskAmount);

    position.stopLossPrice = 90;
    position.recalculateRiskDriven(setup, 10000);

    expect(position.steps[0].size).toBeCloseTo(2.381, 3);
    expect(position.steps[1].size).toBeCloseTo(2.8571, 3);
    expect(calcTotalRisk(position)).toBeLessThanOrEqual(position.riskAmount);
  });

  it('should properly recalculate size for steps after risk amount changed', () => {
    const setup = new SetupModel({ resizingTimes: 2, resizingRatios: [1, 1] });
    const position = new PositionModel({
      side: 'long',
      riskAmount: 100,
      stopLossPrice: 95,
    });
    position.applySetup(setup);
    position.steps[0].price = 120;
    position.steps[1].price = 100;

    position.recalculateRiskDriven(setup, 10000);

    expect(position.steps[0].size).toBeCloseTo(3.2258, 3);
    expect(position.steps[1].size).toBeCloseTo(3.871, 3);
    expect(calcTotalRisk(position)).toBeLessThanOrEqual(position.riskAmount);

    position.riskAmount = 200;
    position.recalculateRiskDriven(setup, 10000);

    expect(position.steps[0].size).toBeCloseTo(6.4516, 3);
    expect(position.steps[1].size).toBeCloseTo(7.7419, 3);
    expect(calcTotalRisk(position)).toBeLessThanOrEqual(position.riskAmount);
  });

  it('should also support short positions', () => {
    const setup = new SetupModel({ resizingTimes: 2, resizingRatios: [1, 1] });
    const position = new PositionModel({
      side: 'short',
      riskAmount: 100,
      stopLossPrice: 130,
    });
    position.applySetup(setup);
    position.steps[0].price = 100;
    position.steps[1].price = 120;

    position.recalculateRiskDriven(setup, 10000);

    expect(position.steps[0].size).toBeCloseTo(2.6087, 3);
    expect(position.steps[1].size).toBeCloseTo(2.1739, 3);
    expect(calcTotalRisk(position)).toBeLessThanOrEqual(position.riskAmount);

    position.riskAmount = 200;
    position.recalculateRiskDriven(setup, 10000);

    expect(position.steps[0].size).toBeCloseTo(5.2174, 3);
    expect(position.steps[1].size).toBeCloseTo(4.3478, 3);
    expect(calcTotalRisk(position)).toBeLessThanOrEqual(position.riskAmount);
  });

  it('should include fees in break-even calculations', () => {
    const setup = new SetupModel({ resizingTimes: 1, resizingRatios: [1] });
    const position = new PositionModel({
      side: 'long',
      riskAmount: 10,
      stopLossPrice: 90,
    });
    position.applySetup(setup);
    position.steps[0].price = 100;

    position.recalculateRiskDriven(setup, 10000);
    position.steps[0].isFilled = true;
    position.recalculateRiskDriven(setup, 10000, { makerFee: 0.01, takerFee: 0.01 });

    expect(position.predictedBE).toBeCloseTo(101, 4);
    expect(position.currentBE).toBeCloseTo(101, 4);
    expect(position.feeTotal).toBeCloseTo(1, 4);
    expect(calcTotalRisk(position)).toBeLessThanOrEqual(position.riskAmount);
  });

  it('should preserve filled step sizes while recalculating others', () => {
    const setup = new SetupModel({ resizingTimes: 2, resizingRatios: [1, 1] });
    const position = new PositionModel({
      side: 'long',
      riskAmount: 100,
      stopLossPrice: 95,
    });
    position.applySetup(setup);
    position.steps[0].price = 120;
    position.steps[1].price = 100;

    position.recalculateRiskDriven(setup, 10000);
    const filledSize = position.steps[0].size;
    const priorUnfilledSize = position.steps[1].size;

    position.steps[0].isFilled = true;
    position.riskAmount = 200;
    position.recalculateRiskDriven(setup, 10000);

    expect(position.steps[0].size).toBeCloseTo(filledSize, 6);
    expect(position.steps[1].size).not.toBeCloseTo(priorUnfilledSize, 6);
    expect(calcTotalRisk(position)).toBeLessThanOrEqual(position.riskAmount);
  });
});
