import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../theme/monokai';
import { PositionWorkspace } from './PositionWorkspace';
vi.mock('../hooks/usePlanner', () => {
  const accountId = 'acc-1';
  return {
    usePlanner: () => ({
      accounts: [
        {
          id: accountId,
          name: 'Test',
          initialBalance: 10000,
          currentBalance: 10000,
        },
      ],
      setups: [
        {
          id: 'setup-1',
          name: 'Test Setup',
          resizingTimes: 2,
          resizingRatios: [1, 1],
        },
      ],
      positions: [
        {
          id: 'pos-1',
          accountId,
          side: 'long',
          symbol: 'BTCUSDT',
          setupId: 'setup-1',
          status: 'planning',
          entryPrice: 0,
          stopLossPrice: 95,
          leverage: 1,
          totalSizePercent: 100,
          riskAmount: 100,
          steps: [
            {
              id: 'step-1',
              price: 120,
              size: 3.3333,
              cost: 400,
              orderType: 'taker',
              fee: 0,
              isFilled: false,
              predictedBE: 120,
            },
            {
              id: 'step-2',
              price: 100,
              size: 3.3333,
              cost: 333,
              orderType: 'taker',
              fee: 0,
              isFilled: false,
              predictedBE: 110,
            },
          ],
          pnl: undefined,
          feeTotal: 0,
          currentBE: 0,
          predictedBE: 110,
          createdAt: Date.now(),
          closedAt: undefined,
        },
      ],
      addPosition: vi.fn(),
      updatePosition: vi.fn(),
      deletePosition: vi.fn(),
    }),
  };
});

describe('PositionWorkspace', () => {
  it('should render derived total size and notional cost', () => {
    render(
      <ChakraProvider theme={theme}>
        <PositionWorkspace />
      </ChakraProvider>
    );

    expect(screen.getByText('Total Size (Base)')).toBeInTheDocument();
    expect(screen.getByText('Notional Cost')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('6.6666'))).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('$') && content.includes('733.00'))
    ).toBeInTheDocument();
  });
});
