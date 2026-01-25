import { Grid, GridItem, Card, CardBody, Text, Heading, VStack, Stat, StatLabel, StatNumber, StatHelpText, StatArrow, Table, Thead, Tbody, Tr, Th, Td, Badge } from '@chakra-ui/react';
import { usePlanner } from '../hooks/usePlanner';

export function Overview () {
  const { accounts } = usePlanner();

  // Aggregate Stats
  const totalEquity = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const totalInitial = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
  const totalPnL = totalEquity - totalInitial;
  const pnlPercent = totalInitial > 0 ? (totalPnL / totalInitial) * 100 : 0;

  const allPositions = accounts.flatMap(acc => acc.positions.map(p => ({ ...p, accountName: acc.name })));
  const activePositions = allPositions.filter(p => p.status !== 'closed');
  const winPositions = allPositions.filter(p => p.status === 'closed' && (p.pnl || 0) > 0);
  const winRate = allPositions.filter(p => p.status === 'closed').length > 0
    ? (winPositions.length / allPositions.filter(p => p.status === 'closed').length) * 100
    : 0;

  return (
    <VStack spacing={6} align="stretch">
      <Heading size="md" color="monokai.yellow">Dashboard Overview</Heading>

      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={6}>
        <GridItem>
          <Card bg="monokai.gray.100" borderColor="monokai.pink">
            <CardBody>
              <Stat>
                <StatLabel color="monokai.gray.300">Total Equity</StatLabel>
                <StatNumber color="monokai.fg">${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</StatNumber>
                <StatHelpText>
                  <StatArrow type={totalPnL >= 0 ? 'increase' : 'decrease'} />
                  {pnlPercent.toFixed(2)}%
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem>
          <Card bg="monokai.gray.100">
            <CardBody>
              <Stat>
                <StatLabel color="monokai.gray.300">Total PnL</StatLabel>
                <StatNumber color={totalPnL >= 0 ? 'monokai.green' : 'monokai.pink'}>
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem>
          <Card bg="monokai.gray.100">
            <CardBody>
              <Stat>
                <StatLabel color="monokai.gray.300">Active Positions</StatLabel>
                <StatNumber color="monokai.blue">{activePositions.length}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem>
          <Card bg="monokai.gray.100">
            <CardBody>
              <Stat>
                <StatLabel color="monokai.gray.300">Win Rate</StatLabel>
                <StatNumber color="monokai.orange">{winRate.toFixed(1)}%</StatNumber>
                <StatHelpText color="monokai.gray.300">
                  {winPositions.length} / {allPositions.filter(p => p.status === 'closed').length} trades
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      <Heading size="sm" mt={4} color="monokai.blue">Recent Active Positions</Heading>
      <Card>
        <CardBody>
          {activePositions.length === 0 ? (
            <Text color="monokai.gray.300">No active positions. Go to Workspace to plan one.</Text>
          ) : (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Symbol</Th>
                  <Th>Account</Th>
                  <Th>Status</Th>
                  <Th isNumeric>Current BE</Th>
                  <Th isNumeric>Risk</Th>
                </Tr>
              </Thead>
              <Tbody>
                {activePositions.map(p => (
                  <Tr key={p.id}>
                    <Td fontWeight="bold" color="monokai.yellow">{p.symbol}</Td>
                    <Td>{p.accountName}</Td>
                    <Td>
                      <Badge colorScheme={p.status === 'planning' ? 'purple' : 'green'}>{p.status}</Badge>
                    </Td>
                    <Td isNumeric>{p.currentBE?.toFixed(2) || '-'}</Td>
                    <Td isNumeric>${p.riskAmount}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </VStack>
  );
}
