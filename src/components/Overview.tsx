import { useEffect, useState } from 'react';
import {
  Grid,
  GridItem,
  Card,
  Text,
  Heading,
  VStack,
  Stat,
  Table,
  Badge,
  HStack,
  Button,
  NumberInput,
  Select,
  IconButton,
  createListCollection,
  Portal
} from '@chakra-ui/react';
import { Trash } from 'lucide-react';
import { usePlanner } from '../hooks/usePlanner';

export function Overview () {
  const {
    accounts,
    setups,
    positions,
    updatePosition,
    deletePosition,
    overviewHistoryPreferences,
    updateOverviewHistoryPreferences
  } = usePlanner();

  // Aggregate Stats
  const totalEquity = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const totalInitial = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
  const totalPnL = totalEquity - totalInitial;
  const pnlPercent = totalInitial > 0 ? (totalPnL / totalInitial) * 100 : 0;

  const accountMap = new Map(accounts.map(account => [account.id, account]));
  const setupMap = new Map(setups.map(setup => [setup.id, setup]));
  const accountCollection = createListCollection({
    items: [
      { label: 'All', value: '__all' },
      ...accounts.map(account => ({ label: account.name, value: account.id })),
    ],
  });
  const setupCollection = createListCollection({
    items: [
      { label: 'All', value: '__all' },
      ...setups.map(setup => ({ label: setup.name, value: setup.id })),
    ],
  });
  const allPositions = positions.map(position => ({
    position,
    accountName: accountMap.get(position.accountId)?.name || 'Unknown',
    setupName: setupMap.get(position.setupId)?.name || (position.setupId ? 'Unknown' : 'Manual'),
  }));
  const activePositions = allPositions.filter(p => p.position.status !== 'closed');
  const closedPositions = allPositions
    .filter(p => p.position.status === 'closed')
    .sort((a, b) => (b.position.closedAt || 0) - (a.position.closedAt || 0));
  const winPositions = allPositions.filter(p => p.position.status === 'closed' && (p.position.pnl || 0) > 0);
  const winRate = allPositions.filter(p => p.position.status === 'closed').length > 0
    ? (winPositions.length / allPositions.filter(p => p.position.status === 'closed').length) * 100
    : 0;

  const [historyPage, setHistoryPage] = useState(1);
  const [draftPnL, setDraftPnL] = useState<Record<string, string>>({});
  const savedAccountIds = overviewHistoryPreferences.accountIds.filter(id => accountMap.has(id));
  const savedSetupIds = overviewHistoryPreferences.setupIds.filter(id => setupMap.has(id));
  const savedPerPage = Math.max(1, overviewHistoryPreferences.perPage || 10);

  useEffect(() => {
    const accountsChanged = savedAccountIds.length !== overviewHistoryPreferences.accountIds.length;
    const setupsChanged = savedSetupIds.length !== overviewHistoryPreferences.setupIds.length;
    const perPageChanged = savedPerPage !== overviewHistoryPreferences.perPage;
    if (accountsChanged || setupsChanged || perPageChanged) {
      updateOverviewHistoryPreferences({
        accountIds: savedAccountIds,
        setupIds: savedSetupIds,
        perPage: savedPerPage,
      });
    }
  }, [
    savedAccountIds,
    savedSetupIds,
    savedPerPage,
    overviewHistoryPreferences.accountIds,
    overviewHistoryPreferences.setupIds,
    overviewHistoryPreferences.perPage,
    updateOverviewHistoryPreferences,
  ]);

  const filteredHistory = closedPositions.filter(p => {
    const accountOk = savedAccountIds.length === 0 || savedAccountIds.includes(p.position.accountId);
    const setupOk = savedSetupIds.length === 0 || savedSetupIds.includes(p.position.setupId);
    return accountOk && setupOk;
  });
  const pageCount = Math.max(1, Math.ceil(filteredHistory.length / savedPerPage));
  const currentPage = Math.min(historyPage, pageCount);
  const pagedHistory = filteredHistory.slice(
    (currentPage - 1) * savedPerPage,
    currentPage * savedPerPage
  );

  const handlePerPageChange = (value: string) => {
    const parsed = Number(value);
    const next = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
    setHistoryPage(1);
    updateOverviewHistoryPreferences({ perPage: next });
  };

  const commitPnL = (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
    if (!position) return;
    const raw = draftPnL[positionId] ?? position.pnl?.toString() ?? '';
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
      position.pnl = undefined;
      updatePosition(position);
      setDraftPnL(prev => ({ ...prev, [positionId]: '' }));
      return;
    }
    const nextValue = Number(trimmed);
    if (!Number.isFinite(nextValue)) {
      // Revert to the last known good value if parsing fails.
      setDraftPnL(prev => ({ ...prev, [positionId]: position.pnl?.toString() ?? '' }));
      return;
    }
    position.pnl = nextValue;
    updatePosition(position);
    setDraftPnL(prev => ({ ...prev, [positionId]: nextValue.toString() }));
  };

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
                  {winPositions.length} / {allPositions.filter(p => p.position.status === 'closed').length} trades
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
                  <Table.ColumnHeader>Setup</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Current BE</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Risk</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Leverage</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Margin</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Notional Cost</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Paid Fees</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {activePositions.map(({ position, accountName, setupName }) => {
                  const marginEstimate = position.getMarginEstimate ? position.getMarginEstimate() : 0;
                  const notionalCost = position.steps.reduce((sum, step) => sum + step.cost, 0);
                  return (
                    <Table.Row key={position.id}>
                      <Table.Cell fontWeight="bold" color="accentAlt">{position.symbol}</Table.Cell>
                      <Table.Cell>{accountName}</Table.Cell>
                      <Table.Cell>{setupName}</Table.Cell>
                      <Table.Cell>
                        <Badge bg={position.status === 'planning' ? 'brand' : 'success'} color="bg">
                          {position.status}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="end">{position.currentBE?.toFixed(2) || '-'}</Table.Cell>
                      <Table.Cell textAlign="end">${position.riskAmount.toFixed(2)}</Table.Cell>
                      <Table.Cell textAlign="end">{position.leverage ? `${position.leverage}x` : '-'}</Table.Cell>
                      <Table.Cell textAlign="end">{marginEstimate > 0 ? `$${marginEstimate.toFixed(4)}` : '-'}</Table.Cell>
                      <Table.Cell textAlign="end">{notionalCost > 0 ? `$${notionalCost.toFixed(4)}` : '-'}</Table.Cell>
                      <Table.Cell textAlign="end">{position.feeTotal ? `$${position.feeTotal.toFixed(4)}` : '-'}</Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          )}
        </Card.Body>
      </Card.Root>

      <Heading size="sm" mt={4} color="info">History</Heading>
      <Card.Root bg="surface" color="fg" borderColor="border">
        <Card.Body>
          <VStack align="stretch" gap={4}>
            <HStack align="start" justify="space-between" gap={6} flexWrap="wrap">
              <VStack align="start" gap={2}>
                <Text fontSize="sm" color="muted">Accounts</Text>
                <Select.Root
                  multiple
                  size="sm"
                  width="240px"
                  collection={accountCollection}
                  value={savedAccountIds.length === 0 ? ['__all'] : savedAccountIds}
                  onValueChange={(e) => {
                    const raw = e.value || [];
                    const values = raw.length > 0 && raw[raw.length - 1] !== '__all'
                      ? raw.filter(v => v !== '__all')
                      : [];
                    setHistoryPage(1);
                    if (values.length === 0) {
                      updateOverviewHistoryPreferences({ accountIds: [] });
                      return;
                    }
                    updateOverviewHistoryPreferences({ accountIds: values });
                  }}
                >
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="All accounts" />
                      <Select.Indicator />
                    </Select.Trigger>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content bg="surface" color="fg" borderColor="border" boxShadow="lg" zIndex="dropdown">
                        {accountCollection.items.map(item => (
                          <Select.Item item={item} key={item.value}>
                            <Select.ItemText>{item.label}</Select.ItemText>
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </VStack>

              <VStack align="start" gap={2}>
                <Text fontSize="sm" color="muted">Setups</Text>
                <Select.Root
                  multiple
                  size="sm"
                  width="240px"
                  collection={setupCollection}
                  value={savedSetupIds.length === 0 ? ['__all'] : savedSetupIds}
                  onValueChange={(e) => {
                    const raw = e.value || [];
                    const values = raw.length > 0 && raw[raw.length - 1] !== '__all'
                      ? raw.filter(v => v !== '__all')
                      : [];
                    setHistoryPage(1);
                    if (values.length === 0) {
                      updateOverviewHistoryPreferences({ setupIds: [] });
                      return;
                    }
                    updateOverviewHistoryPreferences({ setupIds: values });
                  }}
                >
                  <Select.HiddenSelect />
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="All setups" />
                      <Select.Indicator />
                    </Select.Trigger>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content bg="surface" color="fg" borderColor="border" boxShadow="lg" zIndex="dropdown">
                        {setupCollection.items.map(item => (
                          <Select.Item item={item} key={item.value}>
                            <Select.ItemText>{item.label}</Select.ItemText>
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </VStack>

              <VStack align="start" gap={2}>
                <Text fontSize="sm" color="muted">Per Page</Text>
                <NumberInput.Root
                  size="sm"
                  w="120px"
                  min={1}
                  value={savedPerPage.toString()}
                  onValueChange={(e) => handlePerPageChange(e.value)}
                >
                  <NumberInput.Control />
                  <NumberInput.Input />
                </NumberInput.Root>
              </VStack>
            </HStack>

            {filteredHistory.length === 0 ? (
              <Text color="muted">No closed positions yet.</Text>
            ) : (
              <Table.Root variant="outline" size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Closed At</Table.ColumnHeader>
                    <Table.ColumnHeader>Account</Table.ColumnHeader>
                    <Table.ColumnHeader>Setup</Table.ColumnHeader>
                    <Table.ColumnHeader>Symbol</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Risk</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Leverage</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Margin</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Notional Cost</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Paid Fees</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Realized PnL</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {pagedHistory.map(({ position, accountName, setupName }) => {
                    const marginEstimate = position.getMarginEstimate ? position.getMarginEstimate() : 0;
                    const notionalCost = position.steps.reduce((sum, step) => sum + step.cost, 0);
                    return (
                      <Table.Row key={position.id}>
                        <Table.Cell>{new Date(position.closedAt || position.createdAt).toLocaleString()}</Table.Cell>
                        <Table.Cell>{accountName}</Table.Cell>
                        <Table.Cell>{setupName}</Table.Cell>
                        <Table.Cell fontWeight="bold" color="accentAlt">{position.symbol}</Table.Cell>
                        <Table.Cell textAlign="end">${position.riskAmount.toFixed(2)}</Table.Cell>
                        <Table.Cell textAlign="end">{position.leverage ? `${position.leverage}x` : '-'}</Table.Cell>
                        <Table.Cell textAlign="end">{marginEstimate > 0 ? `$${marginEstimate.toFixed(4)}` : '-'}</Table.Cell>
                        <Table.Cell textAlign="end">{notionalCost > 0 ? `$${notionalCost.toFixed(4)}` : '-'}</Table.Cell>
                        <Table.Cell textAlign="end">{position.feeTotal ? `$${position.feeTotal.toFixed(4)}` : '-'}</Table.Cell>
                        <Table.Cell textAlign="end">
                          <HStack justify="flex-end">
                            {/** Keep a draft string so users can type partial negatives like "-" and commit on blur/enter. */}
                            <NumberInput.Root
                              size="sm"
                              w="120px"
                              value={draftPnL[position.id] ?? position.pnl?.toString() ?? ''}
                              onValueChange={(e) => {
                                setDraftPnL(prev => ({ ...prev, [position.id]: e.value }));
                              }}
                            >
                              <NumberInput.Input
                                color={position.pnl && position.pnl > 0 ? 'success' : 'danger'}
                                fontWeight="bold"
                                textAlign="end"
                                onBlur={() => commitPnL(position.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    commitPnL(position.id);
                                    (e.currentTarget as HTMLInputElement).blur();
                                  }
                                }}
                              />
                            </NumberInput.Root>
                          </HStack>
                        </Table.Cell>
                        <Table.Cell textAlign="end">
                          <IconButton
                            aria-label="Delete"
                            size="sm"
                            color="danger"
                            variant="ghost"
                            onClick={() => deletePosition(position.id)}
                          >
                            <Trash size={14} />
                          </IconButton>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            )}

            {filteredHistory.length > 0 && (
              <HStack justify="space-between">
                <Text fontSize="sm" color="muted">
                  Page {currentPage} of {pageCount} • {filteredHistory.length} total
                </Text>
                <HStack>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setHistoryPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setHistoryPage(Math.min(pageCount, currentPage + 1))}
                    disabled={currentPage === pageCount}
                  >
                    Next
                  </Button>
                </HStack>
              </HStack>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  );
}
