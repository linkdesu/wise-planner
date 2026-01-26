import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import system from '../theme/monokai';
import { PositionWorkspace } from './PositionWorkspace';
import { PositionModel } from '../models/PositionModel';
import { SetupModel } from '../models/SetupModel';
import { toFixed, fromFixed, mulFixed, divFixed } from '../utils/fixedPoint';

let plannerState: ReturnType<typeof createPlannerState>;
const createPlannerState = () => {
  const account = {
    id: 'acc-1',
    name: 'Test',
    initialBalance: 10000,
    currentBalance: 10000,
    takerFee: 0,
    makerFee: 0,
  };
  const setup = new SetupModel({
    id: 'setup-1',
    name: 'Test Setup',
    resizingTimes: 2,
    resizingRatios: [1, 1],
  });
  const position = new PositionModel({
    id: 'pos-1',
    accountId: account.id,
    side: 'long',
    symbol: 'BTCUSDT',
    status: 'planning',
    stopLossPrice: 95,
    riskAmount: 100,
    leverage: 1,
  });
  position.applySetup(setup);
  position.steps[0].price = 120;
  position.steps[1].price = 110;
  position.recalculateRiskDriven(setup, account.currentBalance);

  return {
    accounts: [account],
    setups: [setup],
    positions: [position],
    addPosition: vi.fn(),
    updatePosition: vi.fn((updated: PositionModel) => {
      plannerState.positions = plannerState.positions.map((p) =>
        p.id === updated.id ? updated : p
      );
    }),
    deletePosition: vi.fn(),
  };
};

const computeExpected = (stopLossPrice: number, riskAmount: number) => {
  const prices = [120, 110];
  const ratios = [1, 1];
  const totalRatioFixed = ratios.reduce((sum, ratio) => sum + toFixed(ratio), 0n);
  const leverage = 1;
  const accountBalance = 10000;

  let lossPerCostFixed = 0n;
  prices.forEach((price, idx) => {
    const ratioFixed = toFixed(ratios[idx]);
    const normalizedRatioFixed = divFixed(ratioFixed, totalRatioFixed);
    const lossPerUnit = price - stopLossPrice;
    const lossPerUnitFixed = toFixed(lossPerUnit);
    const priceFixed = toFixed(price);
    const lossPerPriceFixed = divFixed(lossPerUnitFixed, priceFixed);
    lossPerCostFixed += mulFixed(normalizedRatioFixed, lossPerPriceFixed);
  });

  let totalCostFixed = divFixed(toFixed(riskAmount), lossPerCostFixed);
  const capFixed = mulFixed(toFixed(accountBalance), toFixed(leverage));
  if (capFixed > 0n && totalCostFixed > capFixed) {
    totalCostFixed = capFixed;
  }

  let totalSizeFixed = 0n;
  let totalCostAccumFixed = 0n;
  prices.forEach((price, idx) => {
    const ratioFixed = toFixed(ratios[idx]);
    const normalizedRatioFixed = divFixed(ratioFixed, totalRatioFixed);
    const priceFixed = toFixed(price);
    const stepCostFixed = mulFixed(totalCostFixed, normalizedRatioFixed);
    const stepSizeFixed = divFixed(stepCostFixed, priceFixed);
    totalSizeFixed += stepSizeFixed;
    totalCostAccumFixed += stepCostFixed;
  });

  const totalSize = fromFixed(totalSizeFixed);
  const totalCost = fromFixed(totalCostAccumFixed);
  const predictedBE = totalSizeFixed > 0n ? fromFixed(divFixed(totalCostAccumFixed, totalSizeFixed)) : 0;
  const marginEst = leverage > 0 ? totalCost / leverage : totalCost;

  return { totalSize, totalCost, predictedBE, marginEst };
};

vi.mock('../hooks/usePlanner', () => {
  return {
    usePlanner: () => ({
      accounts: plannerState.accounts,
      setups: plannerState.setups,
      positions: plannerState.positions,
      addPosition: plannerState.addPosition,
      updatePosition: plannerState.updatePosition,
      deletePosition: plannerState.deletePosition,
    }),
  };
});

describe('PositionWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    plannerState = createPlannerState();
  });

  const renderWorkspace = () =>
    render(
      <ChakraProvider value={system}>
        <PositionWorkspace />
      </ChakraProvider>
    );

  it('should keep risk amount and price when stop loss changes', () => {
    const { rerender } = renderWorkspace();
    const position = plannerState.positions[0];
    const setup = plannerState.setups[0];
    const accountBalance = plannerState.accounts[0].currentBalance;
    position.stopLossPrice = 90;
    position.recalculateRiskDriven(setup, accountBalance);
    plannerState.updatePosition(position);
    rerender(
      <ChakraProvider value={system}>
        <PositionWorkspace />
      </ChakraProvider>
    );

    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('120')).toBeInTheDocument();
    expect(screen.getByDisplayValue('110')).toBeInTheDocument();
  });

  it('should update margin, BE, total size, and notional cost when stop loss changes', () => {
    const { rerender } = renderWorkspace();
    const position = plannerState.positions[0];
    const setup = plannerState.setups[0];
    const accountBalance = plannerState.accounts[0].currentBalance;
    position.stopLossPrice = 90;
    position.recalculateRiskDriven(setup, accountBalance);
    plannerState.updatePosition(position);
    rerender(
      <ChakraProvider value={system}>
        <PositionWorkspace />
      </ChakraProvider>
    );

    const expected = computeExpected(90, 100);
    const marginControl = screen.getByText('Margin', { selector: 'label' }).closest('div');
    const beControl = screen.getByText('Final Break Even', { selector: 'label' }).closest('div');
    const totalSizeControl = screen.getByText('Total Size (Base Asset)', { selector: 'label' }).closest('div');
    const totalCostControl = screen.getByText('Notional Cost', { selector: 'label' }).closest('div');

    expect(marginControl).not.toBeNull();
    expect(beControl).not.toBeNull();
    expect(totalSizeControl).not.toBeNull();
    expect(totalCostControl).not.toBeNull();

    expect(within(marginControl as HTMLElement).getByText(`$${expected.marginEst.toFixed(4)}`)).toBeInTheDocument();
    expect(within(beControl as HTMLElement).getByText(expected.predictedBE.toFixed(2))).toBeInTheDocument();
    expect(within(totalSizeControl as HTMLElement).getByText(expected.totalSize.toFixed(4))).toBeInTheDocument();
    expect(within(totalCostControl as HTMLElement).getByText(`$${expected.totalCost.toFixed(4)}`)).toBeInTheDocument();
  });

  it('should keep stop loss and price when risk amount changes', () => {
    const { rerender } = renderWorkspace();
    const position = plannerState.positions[0];
    const setup = plannerState.setups[0];
    const accountBalance = plannerState.accounts[0].currentBalance;
    position.riskAmount = 200;
    position.recalculateRiskDriven(setup, accountBalance);
    plannerState.updatePosition(position);
    rerender(
      <ChakraProvider value={system}>
        <PositionWorkspace />
      </ChakraProvider>
    );

    expect(screen.getByDisplayValue('95')).toBeInTheDocument();
    expect(screen.getByDisplayValue('120')).toBeInTheDocument();
    expect(screen.getByDisplayValue('110')).toBeInTheDocument();
  });

  it('should update margin, BE, total size, and notional cost when risk amount changes', () => {
    const { rerender } = renderWorkspace();
    const position = plannerState.positions[0];
    const setup = plannerState.setups[0];
    const accountBalance = plannerState.accounts[0].currentBalance;
    position.riskAmount = 200;
    position.recalculateRiskDriven(setup, accountBalance);
    plannerState.updatePosition(position);
    rerender(
      <ChakraProvider value={system}>
        <PositionWorkspace />
      </ChakraProvider>
    );

    const expected = computeExpected(95, 200);
    const marginControl = screen.getByText('Margin', { selector: 'label' }).closest('div');
    const beControl = screen.getByText('Final Break Even', { selector: 'label' }).closest('div');
    const totalSizeControl = screen.getByText('Total Size (Base Asset)', { selector: 'label' }).closest('div');
    const totalCostControl = screen.getByText('Notional Cost', { selector: 'label' }).closest('div');

    expect(marginControl).not.toBeNull();
    expect(beControl).not.toBeNull();
    expect(totalSizeControl).not.toBeNull();
    expect(totalCostControl).not.toBeNull();

    expect(within(marginControl as HTMLElement).getByText(`$${expected.marginEst.toFixed(4)}`)).toBeInTheDocument();
    expect(within(beControl as HTMLElement).getByText(expected.predictedBE.toFixed(2))).toBeInTheDocument();
    expect(within(totalSizeControl as HTMLElement).getByText(expected.totalSize.toFixed(4))).toBeInTheDocument();
    expect(within(totalCostControl as HTMLElement).getByText(`$${expected.totalCost.toFixed(4)}`)).toBeInTheDocument();
  });
});
