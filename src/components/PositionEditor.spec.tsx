import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import Decimal from 'decimal.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PositionModel } from '../models/PositionModel';
import { SetupModel } from '../models/SetupModel';
import system from '../theme/monokai';
import { PositionEditor } from './PositionEditor';

const buildSetup = () =>
  new SetupModel({
    id: 'setup-1',
    name: 'Test Setup',
    resizingTimes: 2,
    resizingRatios: [1, 1],
  });

const buildPosition = (setup: SetupModel) => {
  const position = new PositionModel({
    id: 'pos-1',
    accountId: 'acc-1',
    side: 'long',
    symbol: 'BTCUSDT',
    status: 'planning',
    stopLossPrice: 95,
    riskAmount: 100,
    leverage: 1,
    setupId: setup.id,
  });
  position.applySetup(setup);
  position.steps[0].price = 120;
  position.steps[1].price = 110;
  return position;
};

const computeExpected = (stopLossPrice: number, riskAmount: number) => {
  Decimal.set({ precision: 8, rounding: Decimal.ROUND_HALF_UP });
  const prices = [120, 110];
  const ratios = [1, 1];
  const leverage = 1;
  const accountBalance = 10000;

  const totalRatio = ratios.reduce((sum, ratio) => sum.plus(ratio), new Decimal(0));
  let lossPerCost = new Decimal(0);
  prices.forEach((price, idx) => {
    const ratioDec = new Decimal(ratios[idx]);
    const normalizedRatio = ratioDec.div(totalRatio);
    const lossPerUnit = price - stopLossPrice;
    const lossPerUnitDec = new Decimal(lossPerUnit);
    const priceDec = new Decimal(price);
    const lossPerPrice = lossPerUnitDec.div(priceDec);
    lossPerCost = lossPerCost.plus(normalizedRatio.times(lossPerPrice));
  });

  let totalCost = new Decimal(riskAmount).div(lossPerCost);
  const cap = new Decimal(accountBalance).times(leverage);
  if (cap.gt(0) && totalCost.gt(cap)) {
    totalCost = cap;
  }

  let totalSize = new Decimal(0);
  let totalCostAccum = new Decimal(0);
  prices.forEach((price, idx) => {
    const ratioDec = new Decimal(ratios[idx]);
    const normalizedRatio = ratioDec.div(totalRatio);
    const priceDec = new Decimal(price);
    const stepCost = totalCost.times(normalizedRatio);
    const stepSize = stepCost.div(priceDec);
    const stepCostFromSize = stepSize.times(priceDec);
    totalSize = totalSize.plus(stepSize);
    totalCostAccum = totalCostAccum.plus(stepCostFromSize);
  });

  const totalSizeNumber = totalSize.toNumber();
  const totalCostNumber = totalCostAccum.toNumber();
  const predictedBE = totalSize.gt(0) ? totalCostAccum.div(totalSize).toNumber() : 0;
  const marginEst = leverage > 0 ? totalCostNumber / leverage : totalCostNumber;

  return { totalSize: totalSizeNumber, totalCost: totalCostNumber, predictedBE, marginEst };
};

describe('PositionEditor', () => {
  let setup: SetupModel;
  let position: PositionModel;
  const onUpdate = vi.fn((updater: (p: PositionModel) => void) => {
    updater(position);
  });

  const renderEditor = () =>
    render(
      <ChakraProvider value={system}>
        <PositionEditor
          open
          position={position}
          setups={[setup]}
          allSetups={[setup]}
          accountBalance={10000}
          accountFees={{ makerFee: 0, takerFee: 0 }}
          onUpdate={onUpdate}
          onRequestDelete={vi.fn()}
          onClose={vi.fn()}
        />
      </ChakraProvider>
    );

  beforeEach(() => {
    vi.clearAllMocks();
    setup = buildSetup();
    position = buildPosition(setup);
    position.recalculateRiskDriven(setup, 10000);
  });

  it('should keep risk amount and price when stop loss changes', () => {
    const { rerender } = renderEditor();

    position.stopLossPrice = 90;
    position.recalculateRiskDriven(setup, 10000);

    rerender(
      <ChakraProvider value={system}>
        <PositionEditor
          open
          position={position}
          setups={[setup]}
          allSetups={[setup]}
          accountBalance={10000}
          accountFees={{ makerFee: 0, takerFee: 0 }}
          onUpdate={onUpdate}
          onRequestDelete={vi.fn()}
          onClose={vi.fn()}
        />
      </ChakraProvider>
    );

    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('120')).toBeInTheDocument();
    expect(screen.getByDisplayValue('110')).toBeInTheDocument();
  });

  it('should update margin, BE, total size, and notional cost when stop loss changes', () => {
    const { rerender } = renderEditor();

    position.stopLossPrice = 90;
    position.recalculateRiskDriven(setup, 10000);

    rerender(
      <ChakraProvider value={system}>
        <PositionEditor
          open
          position={position}
          setups={[setup]}
          allSetups={[setup]}
          accountBalance={10000}
          accountFees={{ makerFee: 0, takerFee: 0 }}
          onUpdate={onUpdate}
          onRequestDelete={vi.fn()}
          onClose={vi.fn()}
        />
      </ChakraProvider>
    );

    const expected = computeExpected(90, 100);

    expect(screen.getAllByText(`$${expected.marginEst.toFixed(4)}`).length).toBeGreaterThan(0);
    expect(screen.getAllByText(expected.predictedBE.toFixed(4)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(expected.totalSize.toFixed(4)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(`$${expected.totalCost.toFixed(4)}`).length).toBeGreaterThan(0);
  });

  it('should keep stop loss and price when risk amount changes', () => {
    const { rerender } = renderEditor();

    position.riskAmount = 200;
    position.recalculateRiskDriven(setup, 10000);

    rerender(
      <ChakraProvider value={system}>
        <PositionEditor
          open
          position={position}
          setups={[setup]}
          allSetups={[setup]}
          accountBalance={10000}
          accountFees={{ makerFee: 0, takerFee: 0 }}
          onUpdate={onUpdate}
          onRequestDelete={vi.fn()}
          onClose={vi.fn()}
        />
      </ChakraProvider>
    );

    expect(screen.getByDisplayValue('95')).toBeInTheDocument();
    expect(screen.getByDisplayValue('120')).toBeInTheDocument();
    expect(screen.getByDisplayValue('110')).toBeInTheDocument();
  });

  it('should update margin, BE, total size, and notional cost when risk amount changes', () => {
    const { rerender } = renderEditor();

    position.riskAmount = 200;
    position.recalculateRiskDriven(setup, 10000);

    rerender(
      <ChakraProvider value={system}>
        <PositionEditor
          open
          position={position}
          setups={[setup]}
          allSetups={[setup]}
          accountBalance={10000}
          accountFees={{ makerFee: 0, takerFee: 0 }}
          onUpdate={onUpdate}
          onRequestDelete={vi.fn()}
          onClose={vi.fn()}
        />
      </ChakraProvider>
    );

    const expected = computeExpected(95, 200);

    expect(screen.getAllByText(`$${expected.marginEst.toFixed(4)}`).length).toBeGreaterThan(0);
    expect(screen.getAllByText(expected.predictedBE.toFixed(4)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(expected.totalSize.toFixed(4)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(`$${expected.totalCost.toFixed(4)}`).length).toBeGreaterThan(0);
  });

  it('should disable close until realized PnL is provided', () => {
    const { rerender } = renderEditor();

    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    const closePositionButton = closeButtons.find((btn) => btn.hasAttribute('disabled'));
    expect(closePositionButton).toBeDefined();
    expect(closePositionButton).toBeDisabled();

    position.pnl = 123;

    rerender(
      <ChakraProvider value={system}>
        <PositionEditor
          open
          position={position}
          setups={[setup]}
          allSetups={[setup]}
          accountBalance={10000}
          accountFees={{ makerFee: 0, takerFee: 0 }}
          onUpdate={onUpdate}
          onRequestDelete={vi.fn()}
          onClose={vi.fn()}
        />
      </ChakraProvider>
    );

    const refreshedCloseButtons = screen.getAllByRole('button', { name: /close/i });
    const enabledCloseButton = refreshedCloseButtons.find((btn) => !btn.hasAttribute('disabled'));
    expect(enabledCloseButton).toBeDefined();
  });
});
