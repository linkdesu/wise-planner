import { describe, it, expect } from 'vitest';
import { PositionModel } from './PositionModel';
import { SetupModel } from './SetupModel';

describe('PositionModel sizing', () => {
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
    expect(position.steps[1].size).toBeCloseTo(3.8710, 3);

    position.stopLossPrice = 90;
    position.recalculateRiskDriven(setup, 10000);

    expect(position.steps[0].size).toBeCloseTo(2.3810, 3);
    expect(position.steps[1].size).toBeCloseTo(2.8571, 3);
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
    expect(position.steps[1].size).toBeCloseTo(3.8710, 3);

    position.riskAmount = 200;
    position.recalculateRiskDriven(setup, 10000);

    expect(position.steps[0].size).toBeCloseTo(6.4516, 3);
    expect(position.steps[1].size).toBeCloseTo(7.7419, 3);
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

    position.riskAmount = 200;
    position.recalculateRiskDriven(setup, 10000);

    expect(position.steps[0].size).toBeCloseTo(5.2174, 3);
    expect(position.steps[1].size).toBeCloseTo(4.3478, 3);
  });
});
