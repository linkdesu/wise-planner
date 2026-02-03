import { Card, Grid, GridItem, Heading, Stat, VStack } from '@chakra-ui/react';
import { useMemo } from 'react';
import { usePlanner } from '../hooks/usePlanner';

export function Overview() {
  const { accounts, positions } = usePlanner();

  // Aggregate Stats
  const totalEquity = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const totalInitial = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
  const totalPnL = totalEquity - totalInitial;
  const pnlPercent = totalInitial > 0 ? (totalPnL / totalInitial) * 100 : 0;

  const activePositions = useMemo(
    () => positions.filter((p) => p.status !== 'closed'),
    [positions]
  );
  const closedPositions = useMemo(
    () => positions.filter((p) => p.status === 'closed'),
    [positions]
  );
  const winPositions = useMemo(
    () => closedPositions.filter((p) => (p.pnl || 0) > 0),
    [closedPositions]
  );
  const winRate = closedPositions.length > 0 ? (winPositions.length / closedPositions.length) * 100 : 0;

  return (
    <VStack gap={6} align="stretch">
      <Heading size="md" color="accent" h="40px" display="flex" alignItems="center">
        Dashboard Overview
      </Heading>

      <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={6}>
        <GridItem>
          <Card.Root bg="surface" borderColor="danger" color="fg">
            <Card.Body>
              <Stat.Root>
                <Stat.Label color="muted">Total Equity</Stat.Label>
                <Stat.ValueText color="fg">
                  ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Stat.ValueText>
                <Stat.HelpText>
                  {totalPnL >= 0 ? <Stat.UpIndicator /> : <Stat.DownIndicator />}
                  {pnlPercent.toFixed(2)}%
                </Stat.HelpText>
              </Stat.Root>
            </Card.Body>
          </Card.Root>
        </GridItem>
        <GridItem>
          <Card.Root bg="surface" color="fg" borderColor="border">
            <Card.Body>
              <Stat.Root>
                <Stat.Label color="muted">Total PnL</Stat.Label>
                <Stat.ValueText color={totalPnL >= 0 ? 'success' : 'danger'}>
                  {totalPnL >= 0 ? '+' : ''}$
                  {totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Stat.ValueText>
              </Stat.Root>
            </Card.Body>
          </Card.Root>
        </GridItem>
        <GridItem>
          <Card.Root bg="surface" color="fg" borderColor="border">
            <Card.Body>
              <Stat.Root>
                <Stat.Label color="muted">Active Positions</Stat.Label>
                <Stat.ValueText color="info">{activePositions.length}</Stat.ValueText>
              </Stat.Root>
            </Card.Body>
          </Card.Root>
        </GridItem>
        <GridItem>
          <Card.Root bg="surface" color="fg" borderColor="border">
            <Card.Body>
              <Stat.Root>
                <Stat.Label color="muted">Win Rate</Stat.Label>
                <Stat.ValueText color="warning">{winRate.toFixed(1)}%</Stat.ValueText>
                <Stat.HelpText color="muted">
                  {winPositions.length} /{' '}
                  {closedPositions.length} trades
                </Stat.HelpText>
              </Stat.Root>
            </Card.Body>
          </Card.Root>
        </GridItem>
      </Grid>

    </VStack>
  );
}
