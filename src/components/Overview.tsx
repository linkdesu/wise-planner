import { Grid, GridItem, Card, Text, Heading, VStack, Stat, Table, Badge } from '@chakra-ui/react';
import { usePlanner } from '../hooks/usePlanner';

export function Overview () {
  const { accounts, positions } = usePlanner();

  // Aggregate Stats
  const totalEquity = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const totalInitial = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
  const totalPnL = totalEquity - totalInitial;
  const pnlPercent = totalInitial > 0 ? (totalPnL / totalInitial) * 100 : 0;

  const allPositions = positions.map(p => {
    const acc = accounts.find(a => a.id === p.accountId);
    return { ...p, accountName: acc?.name || 'Unknown' };
  });
  const activePositions = allPositions.filter(p => p.status !== 'closed');
  const winPositions = allPositions.filter(p => p.status === 'closed' && (p.pnl || 0) > 0);
  const winRate = allPositions.filter(p => p.status === 'closed').length > 0
    ? (winPositions.length / allPositions.filter(p => p.status === 'closed').length) * 100
    : 0;

  return (
    <VStack gap={6} align="stretch">
      <Heading size="md" color="accent" h="40px" display="flex" alignItems="center">Dashboard Overview</Heading>

      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={6}>
        <GridItem>
          <Card.Root bg="surface" borderColor="danger" color="fg">
            <Card.Body>
              <Stat.Root>
                <Stat.Label color="muted">Total Equity</Stat.Label>
                <Stat.ValueText color="fg">${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Stat.ValueText>
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
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                  {winPositions.length} / {allPositions.filter(p => p.status === 'closed').length} trades
                </Stat.HelpText>
              </Stat.Root>
            </Card.Body>
          </Card.Root>
        </GridItem>
      </Grid>

      <Heading size="sm" mt={4} color="info">Recent Active Positions</Heading>
      <Card.Root bg="surface" color="fg" borderColor="border">
        <Card.Body>
          {activePositions.length === 0 ? (
            <Text color="muted">No active positions. Go to Workspace to plan one.</Text>
          ) : (
            <Table.Root variant="outline" size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Symbol</Table.ColumnHeader>
                  <Table.ColumnHeader>Account</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Current BE</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Risk</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {activePositions.map(p => (
                  <Table.Row key={p.id}>
                    <Table.Cell fontWeight="bold" color="accentAlt">{p.symbol}</Table.Cell>
                    <Table.Cell>{p.accountName}</Table.Cell>
                    <Table.Cell>
                      <Badge bg={p.status === 'planning' ? 'brand' : 'success'} color="bg">{p.status}</Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="end">{p.currentBE?.toFixed(2) || '-'}</Table.Cell>
                    <Table.Cell textAlign="end">${p.riskAmount}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Card.Body>
      </Card.Root>
    </VStack>
  );
}
