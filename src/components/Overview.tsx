import {
  Badge,
  Button,
  Card,
  createListCollection,
  Grid,
  GridItem,
  Heading,
  HStack,
  IconButton,
  Pagination,
  Stat,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DATETIME_Format, OVERVIEW_HISTORY_PER_PAGE_KEY } from '../const';
import { usePlanner } from '../hooks/usePlanner';
import { MultiSelect } from './ui/MultiSelect';
import { NumberInput } from './ui/NumberInput';

export function Overview() {
  const {
    accounts,
    setups,
    positions,
    updatePosition,
    deletePosition,
    getConfigValue,
    setConfigValue,
  } = usePlanner();

  // Aggregate Stats
  const totalEquity = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const totalInitial = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
  const totalPnL = totalEquity - totalInitial;
  const pnlPercent = totalInitial > 0 ? (totalPnL / totalInitial) * 100 : 0;

  const activeSetups = setups.filter((setup) => !setup.isDeleted);
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const setupMap = new Map(setups.map((setup) => [setup.id, setup]));
  const activeSetupMap = new Map(activeSetups.map((setup) => [setup.id, setup]));
  const accountCollection = createListCollection({
    items: [
      { label: 'All', value: '__all' },
      ...accounts.map((account) => ({ label: account.name, value: account.id })),
    ],
  });
  const setupCollection = createListCollection({
    items: [
      { label: 'All', value: '__all' },
      ...activeSetups.map((setup) => ({ label: setup.name, value: setup.id })),
    ],
  });
  const allPositions = positions.map((position) => ({
    position,
    accountName: accountMap.get(position.accountId)?.name || 'Unknown',
    setupName: setupMap.get(position.setupId)?.name || (position.setupId ? 'Unknown' : 'Manual'),
  }));
  const activePositions = allPositions.filter((p) => p.position.status !== 'closed');
  const closedPositions = allPositions
    .filter((p) => p.position.status === 'closed')
    .sort((a, b) => (b.position.closedAt || 0) - (a.position.closedAt || 0));
  const winPositions = allPositions.filter(
    (p) => p.position.status === 'closed' && (p.position.pnl || 0) > 0
  );
  const winRate =
    allPositions.filter((p) => p.position.status === 'closed').length > 0
      ? (winPositions.length / allPositions.filter((p) => p.position.status === 'closed').length) *
        100
      : 0;

  const [historyPage, setHistoryPage] = useState(1);
  const [historyAccountIds, setHistoryAccountIds] = useState<string[]>([]);
  const [historySetupIds, setHistorySetupIds] = useState<string[]>([]);
  const rawPerPage = getConfigValue<number>(OVERVIEW_HISTORY_PER_PAGE_KEY, 10);
  const savedPerPage = Math.max(1, Number(rawPerPage) || 10);

  const validHistoryAccountIds = historyAccountIds.filter((id) => accountMap.has(id));
  const validHistorySetupIds = historySetupIds.filter((id) => activeSetupMap.has(id));

  useEffect(() => {
    if (savedPerPage !== rawPerPage) {
      setConfigValue(OVERVIEW_HISTORY_PER_PAGE_KEY, savedPerPage);
    }
  }, [savedPerPage, rawPerPage, setConfigValue]);

  const filteredHistory = closedPositions.filter((p) => {
    const accountOk =
      validHistoryAccountIds.length === 0 || validHistoryAccountIds.includes(p.position.accountId);
    const setupOk =
      validHistorySetupIds.length === 0 || validHistorySetupIds.includes(p.position.setupId);
    return accountOk && setupOk;
  });
  const pageCount = Math.max(1, Math.ceil(filteredHistory.length / savedPerPage));
  const currentPage = Math.min(historyPage, pageCount);
  const pagedHistory = filteredHistory.slice(
    (currentPage - 1) * savedPerPage,
    currentPage * savedPerPage
  );

  const handlePerPageChange = (raw: string) => {
    const parsed = Number(raw);
    const next = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
    setHistoryPage(1);
    setConfigValue(OVERVIEW_HISTORY_PER_PAGE_KEY, next);
  };

  const commitPnL = (positionId: string, raw: string) => {
    const position = positions.find((p) => p.id === positionId);
    if (!position) return;
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
      position.pnl = undefined;
      updatePosition(position);
      return;
    }
    const nextValue = Number(trimmed);
    if (!Number.isFinite(nextValue)) {
      return;
    }
    position.pnl = nextValue;
    updatePosition(position);
  };

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
                  {allPositions.filter((p) => p.position.status === 'closed').length} trades
                </Stat.HelpText>
              </Stat.Root>
            </Card.Body>
          </Card.Root>
        </GridItem>
      </Grid>

      <Heading size="sm" mt={4} color="info">
        Active Positions
      </Heading>
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
                  const marginEstimate = position.getMarginEstimate
                    ? position.getMarginEstimate()
                    : 0;
                  const notionalCost = position.steps.reduce(
                    (sum, step) => sum + step.size * step.price,
                    0
                  );
                  return (
                    <Table.Row key={position.id}>
                      <Table.Cell fontWeight="bold" color="accentAlt">
                        {position.symbol}
                      </Table.Cell>
                      <Table.Cell>{accountName}</Table.Cell>
                      <Table.Cell>{setupName}</Table.Cell>
                      <Table.Cell>
                        <Badge bg={position.status === 'planning' ? 'info' : 'success'}>
                          {position.status}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        {position.currentBE?.toFixed(2) || '-'}
                      </Table.Cell>
                      <Table.Cell textAlign="end">${position.riskAmount.toFixed(2)}</Table.Cell>
                      <Table.Cell textAlign="end">
                        {position.leverage ? `${position.leverage}x` : '-'}
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        {marginEstimate > 0 ? `$${marginEstimate.toFixed(4)}` : '-'}
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        {notionalCost > 0 ? `$${notionalCost.toFixed(4)}` : '-'}
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        {position.feeTotal ? `$${position.feeTotal.toFixed(4)}` : '-'}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          )}
        </Card.Body>
      </Card.Root>

      <Heading size="sm" mt={4} color="info">
        History
      </Heading>
      <Card.Root bg="surface" color="fg" borderColor="border">
        <Card.Body>
          <VStack align="stretch" gap={4}>
            <HStack align="start" gap={6} flexWrap="wrap">
              <VStack align="start" gap={2}>
                <Text fontSize="sm" color="muted">
                  Accounts
                </Text>
                <MultiSelect
                  size="sm"
                  width="240px"
                  collection={accountCollection}
                  value={validHistoryAccountIds.length === 0 ? ['__all'] : validHistoryAccountIds}
                  placeholder="All accounts"
                  onCommit={(raw) => {
                    const values =
                      raw.length > 0 && raw[raw.length - 1] !== '__all'
                        ? raw.filter((v) => v !== '__all')
                        : [];
                    setHistoryPage(1);
                    setHistoryAccountIds(values);
                  }}
                />
              </VStack>

              <VStack align="start" gap={2}>
                <Text fontSize="sm" color="muted">
                  Setups
                </Text>
                <MultiSelect
                  size="sm"
                  width="240px"
                  collection={setupCollection}
                  value={validHistorySetupIds.length === 0 ? ['__all'] : validHistorySetupIds}
                  placeholder="All setups"
                  onCommit={(raw) => {
                    const values =
                      raw.length > 0 && raw[raw.length - 1] !== '__all'
                        ? raw.filter((v) => v !== '__all')
                        : [];
                    setHistoryPage(1);
                    setHistorySetupIds(values);
                  }}
                />
              </VStack>

              <VStack align="start" gap={2}>
                <Text fontSize="sm" color="muted">
                  Per Page
                </Text>
                <NumberInput
                  key={`per-page-${savedPerPage}`}
                  size="sm"
                  w="120px"
                  min={1}
                  value={savedPerPage.toString()}
                  onCommit={handlePerPageChange}
                />
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
                    <Table.ColumnHeader textAlign="end">Stop Loss Price</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Paid Fees</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Realized PnL</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {pagedHistory.map(({ position, accountName, setupName }) => {
                    const marginEstimate = position.getMarginEstimate
                      ? position.getMarginEstimate()
                      : 0;
                    const notionalCost = position.steps.reduce(
                      (sum, step) => sum + step.size * step.price,
                      0
                    );
                    return (
                      <Table.Row key={position.id}>
                        <Table.Cell>
                          {dayjs(position.closedAt || position.createdAt).format(DATETIME_Format)}
                        </Table.Cell>
                        <Table.Cell>{accountName}</Table.Cell>
                        <Table.Cell>{setupName}</Table.Cell>
                        <Table.Cell fontWeight="bold" color="accentAlt">
                          {position.symbol}
                        </Table.Cell>
                        <Table.Cell textAlign="end">${position.riskAmount.toFixed(2)}</Table.Cell>
                        <Table.Cell textAlign="end">
                          {position.leverage ? `${position.leverage}x` : '-'}
                        </Table.Cell>
                        <Table.Cell textAlign="end">
                          {marginEstimate > 0 ? `$${marginEstimate.toFixed(4)}` : '-'}
                        </Table.Cell>
                        <Table.Cell textAlign="end">
                          {notionalCost > 0 ? `$${notionalCost.toFixed(4)}` : '-'}
                        </Table.Cell>
                        <Table.Cell textAlign="end">
                          {position.stopLossPrice > 0
                            ? `$${position.stopLossPrice.toFixed(4)}`
                            : '-'}
                        </Table.Cell>
                        <Table.Cell textAlign="end">
                          {position.feeTotal ? `$${position.feeTotal.toFixed(4)}` : '-'}
                        </Table.Cell>
                        <Table.Cell textAlign="end">
                          <HStack justify="flex-end">
                            <NumberInput
                              key={`pnl-${position.id}-${position.pnl ?? ''}`}
                              size="sm"
                              w="120px"
                              value={position.pnl?.toString() ?? ''}
                              onCommit={(raw) => commitPnL(position.id, raw)}
                              inputProps={{
                                color: position.pnl && position.pnl > 0 ? 'success' : 'danger',
                                fontWeight: 'bold',
                                textAlign: 'end',
                              }}
                            />
                          </HStack>
                        </Table.Cell>
                        <Table.Cell textAlign="end">
                          <IconButton
                            aria-label="Delete"
                            size="sm"
                            px="3"
                            color="danger"
                            variant="ghost"
                            onClick={() => deletePosition(position.id)}
                          >
                            <Trash size={14} /> Delete
                          </IconButton>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            )}

            {filteredHistory.length > 0 && (
              <Pagination.Root
                count={filteredHistory.length}
                pageSize={savedPerPage}
                page={currentPage}
                onPageChange={(details) => setHistoryPage(details.page)}
              >
                <HStack justify="space-between" align="center">
                  <Text as="div" fontSize="sm" color="muted">
                    <Pagination.PageText format="short" color="monokai.gray.300" />
                  </Text>
                  <HStack>
                    <Pagination.PrevTrigger asChild>
                      <IconButton variant="ghost" color="muted">
                        <ChevronLeft />
                      </IconButton>
                    </Pagination.PrevTrigger>
                    <Pagination.Items
                      render={(page) => (
                        <Button
                          variant="ghost"
                          key={`history-page-${page.value}`}
                          size="sm"
                          color={page.value === currentPage ? 'accentAlt' : 'muted'}
                        >
                          {page.value}
                        </Button>
                      )}
                    />
                    <Pagination.NextTrigger asChild>
                      <IconButton variant="ghost" color="muted">
                        <ChevronRight />
                      </IconButton>
                    </Pagination.NextTrigger>
                  </HStack>
                </HStack>
              </Pagination.Root>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  );
}
