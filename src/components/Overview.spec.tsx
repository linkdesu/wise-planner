import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import system from '../theme/monokai';
import { Overview } from './Overview';
import { PositionModel } from '../models/PositionModel';
import { SetupModel } from '../models/SetupModel';
import { OverviewHistoryPreferencesModel } from '../models/OverviewHistoryPreferencesModel';

let plannerState: ReturnType<typeof createPlannerState>;
const createPlannerState = () => {
  const accountA = {
    id: 'acc-a',
    name: 'Account A',
    initialBalance: 10000,
    currentBalance: 10000,
    takerFee: 0,
    makerFee: 0,
  };
  const accountB = {
    id: 'acc-b',
    name: 'Account B',
    initialBalance: 10000,
    currentBalance: 10000,
    takerFee: 0,
    makerFee: 0,
  };
  const setupA = new SetupModel({ id: 'setup-a', name: 'Setup A', resizingTimes: 1, resizingRatios: [1] });
  const setupB = new SetupModel({ id: 'setup-b', name: 'Setup B', resizingTimes: 1, resizingRatios: [1] });

  const position1 = new PositionModel({
    id: 'pos-1',
    accountId: accountA.id,
    setupId: setupA.id,
    symbol: 'BTCUSDT',
    status: 'closed',
    riskAmount: 100,
    leverage: 2,
    createdAt: Date.now() - 1000,
    closedAt: Date.now() - 500,
  });
  const position2 = new PositionModel({
    id: 'pos-2',
    accountId: accountA.id,
    setupId: setupB.id,
    symbol: 'ETHUSDT',
    status: 'closed',
    riskAmount: 200,
    leverage: 1,
    createdAt: Date.now() - 2000,
    closedAt: Date.now() - 1500,
  });
  const position3 = new PositionModel({
    id: 'pos-3',
    accountId: accountB.id,
    setupId: setupA.id,
    symbol: 'SOLUSDT',
    status: 'closed',
    riskAmount: 50,
    leverage: 3,
    createdAt: Date.now() - 3000,
    closedAt: Date.now() - 2500,
  });

  return {
    accounts: [accountA, accountB],
    setups: [setupA, setupB],
    positions: [position1, position2, position3],
    overviewHistoryPreferences: new OverviewHistoryPreferencesModel(),
    updatePosition: vi.fn(),
    deletePosition: vi.fn(),
    updateOverviewHistoryPreferences: vi.fn((updates: Partial<OverviewHistoryPreferencesModel>) => {
      plannerState.overviewHistoryPreferences = new OverviewHistoryPreferencesModel({
        ...plannerState.overviewHistoryPreferences,
        ...updates,
      });
    }),
  };
};

vi.mock('../hooks/usePlanner', () => {
  return {
    usePlanner: () => ({
      accounts: plannerState.accounts,
      setups: plannerState.setups,
      positions: plannerState.positions,
      overviewHistoryPreferences: plannerState.overviewHistoryPreferences,
      updatePosition: plannerState.updatePosition,
      deletePosition: plannerState.deletePosition,
      updateOverviewHistoryPreferences: plannerState.updateOverviewHistoryPreferences,
    }),
  };
});

describe('Overview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    plannerState = createPlannerState();
  });

  const renderOverview = () =>
    render(
      <ChakraProvider value={system}>
        <Overview />
      </ChakraProvider>
    );

  it('renders history rows for closed positions', () => {
    renderOverview();

    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.getByText('ETHUSDT')).toBeInTheDocument();
    expect(screen.getByText('SOLUSDT')).toBeInTheDocument();
  });

  it('applies AND filter preferences for account and setup', () => {
    plannerState.overviewHistoryPreferences = new OverviewHistoryPreferencesModel({
      accountIds: ['acc-a'],
      setupIds: ['setup-a'],
      perPage: 10,
    });

    renderOverview();

    expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
    expect(screen.queryByText('ETHUSDT')).toBeNull();
    expect(screen.queryByText('SOLUSDT')).toBeNull();
  });

  it('paginates history based on per-page preference', () => {
    plannerState.overviewHistoryPreferences = new OverviewHistoryPreferencesModel({
      accountIds: [],
      setupIds: [],
      perPage: 1,
    });

    renderOverview();

    expect(screen.getByText('Page 1 of 3 • 3 total')).toBeInTheDocument();
  });
});
