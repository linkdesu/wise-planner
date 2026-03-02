import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Decimal from 'decimal.js';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PositionModel } from '../models/PositionModel';
import { PositionTagModel } from '../models/PositionTagModel';
import { SetupModel } from '../models/SetupModel';
import { TagFieldModel } from '../models/TagFieldModel';
import { TagValueModel } from '../models/TagValueModel';
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
  let tagFields: TagFieldModel[];
  let tagValues: TagValueModel[];
  let positionTags: PositionTagModel[];

  const onUpdate = vi.fn((updater: (p: PositionModel) => void) => {
    updater(position);
  });
  const onSetPositionTag = vi.fn();

  const renderEditor = () =>
    render(
      <ChakraProvider value={system}>
        <PositionEditor
          open
          position={position}
          setups={[setup]}
          allSetups={[setup]}
          tagFields={tagFields}
          tagValues={tagValues}
          positionTags={positionTags}
          accountBalance={10000}
          accountFees={{ makerFee: 0, takerFee: 0 }}
          onUpdate={onUpdate}
          onRequestDelete={vi.fn()}
          onSetPositionTag={onSetPositionTag}
          onClose={vi.fn()}
        />
      </ChakraProvider>
    );

  const rerenderEditor = (rerender: (ui: ReactNode) => void) => {
    rerender(
      <ChakraProvider value={system}>
        <PositionEditor
          open
          position={position}
          setups={[setup]}
          allSetups={[setup]}
          tagFields={tagFields}
          tagValues={tagValues}
          positionTags={positionTags}
          accountBalance={10000}
          accountFees={{ makerFee: 0, takerFee: 0 }}
          onUpdate={onUpdate}
          onRequestDelete={vi.fn()}
          onSetPositionTag={onSetPositionTag}
          onClose={vi.fn()}
        />
      </ChakraProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setup = buildSetup();
    position = buildPosition(setup);
    position.recalculateRiskDriven(setup, 10000);
    tagFields = [new TagFieldModel({ id: 'field-1', name: 'Entry Strategy', isActive: true })];
    tagValues = [
      new TagValueModel({ id: 'value-breakout', fieldId: 'field-1', label: 'Breakout' }),
      new TagValueModel({ id: 'value-pullback', fieldId: 'field-1', label: 'Pullback' }),
    ];
    positionTags = [];
  });

  it('should keep risk amount and price when stop loss changes', () => {
    const { rerender } = renderEditor();

    position.stopLossPrice = 90;
    position.recalculateRiskDriven(setup, 10000);

    rerenderEditor(rerender);

    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('120')).toBeInTheDocument();
    expect(screen.getByDisplayValue('110')).toBeInTheDocument();
  });

  it('should update margin, BE, total size, and notional cost when stop loss changes', () => {
    const { rerender } = renderEditor();

    position.stopLossPrice = 90;
    position.recalculateRiskDriven(setup, 10000);

    rerenderEditor(rerender);

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

    rerenderEditor(rerender);

    expect(screen.getByDisplayValue('95')).toBeInTheDocument();
    expect(screen.getByDisplayValue('120')).toBeInTheDocument();
    expect(screen.getByDisplayValue('110')).toBeInTheDocument();
  });

  it('should update margin, BE, total size, and notional cost when risk amount changes', () => {
    const { rerender } = renderEditor();

    position.riskAmount = 200;
    position.recalculateRiskDriven(setup, 10000);

    rerenderEditor(rerender);

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
    rerenderEditor(rerender);

    const refreshedCloseButtons = screen.getAllByRole('button', { name: /close/i });
    const enabledCloseButton = refreshedCloseButtons.find((btn) => !btn.hasAttribute('disabled'));
    expect(enabledCloseButton).toBeDefined();
  });

  it('should show extra risk and allow editing filled step size', () => {
    position.steps[0].isFilled = true;
    position.steps[0].size = 5;
    position.recalculateRiskDriven(setup, 10000);

    renderEditor();

    expect(screen.getByText(/extra/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('should add and edit chase steps', async () => {
    const user = userEvent.setup();
    const { rerender } = renderEditor();

    fireEvent.click(screen.getByRole('button', { name: /new\sstep/i }));

    rerenderEditor(rerender);

    const priceInput = screen.getByLabelText('Chase Step 1 Price');
    await user.clear(priceInput);
    await user.type(priceInput, '105');
    fireEvent.blur(priceInput);

    await waitFor(() => {
      expect(position.chaseSteps[0].price).toBe(105);
    });

    const sizeInput = screen.getByLabelText('Chase Step 1 Size');
    await user.clear(sizeInput);
    await user.type(sizeInput, '2');
    fireEvent.blur(sizeInput);

    await waitFor(() => {
      expect(position.chaseSteps[0].size).toBe(2);
    });
  });

  it('should render tag fields and persist tag selection via relation callback', async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.getByText('Entry Strategy')).toBeInTheDocument();

    const selectTrigger = screen.getByRole('combobox', { name: 'Entry Strategy' });
    await user.click(selectTrigger);
    await user.click(screen.getByText('Breakout'));

    expect(onSetPositionTag).toHaveBeenCalledWith('field-1', 'value-breakout');
  });
});
