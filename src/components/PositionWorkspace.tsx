import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  HStack,
  Heading,
  IconButton,
  Select,
  Table,
  Tabs,
  Text,
  VStack,
  createListCollection,
} from '@chakra-ui/react';
import { Edit, Plus, Trash } from 'lucide-react';
import { useMemo, useState } from 'react';
import { usePlanner } from '../hooks/usePlanner';
import { PositionModel } from '../models/PositionModel';
import { PositionEditor } from './PositionEditor';
import { PositionHistoryTable } from './PositionHistoryTable';

export function PositionWorkspace() {
  const { accounts, setups, positions, addPosition, updatePosition, deletePosition } = usePlanner();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('active');
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [pendingDeletePositionId, setPendingDeletePositionId] = useState<string | null>(null);
  const activeSetups = setups.filter((setup) => !setup.isDeleted);
  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );
  const setupMap = useMemo(() => new Map(setups.map((setup) => [setup.id, setup])), [setups]);

  const activeAccountId = selectedAccountId || accounts[0]?.id;
  const currentAccount = accounts.find((a) => a.id === activeAccountId);

  const accountCollection = createListCollection({
    items: accounts.map((a) => ({ label: a.name, value: a.id })),
  });

  const handleAddPosition = () => {
    if (!currentAccount) return;
    const newPos = new PositionModel({
      symbol: 'BTCUSDT',
      status: 'planning',
      accountId: currentAccount.id,
      riskAmount: 100,
      leverage: 1,
    });
    if (activeSetups.length > 0) {
      newPos.applySetup(activeSetups[0]);
      newPos.recalculateRiskDriven(activeSetups[0], currentAccount.currentBalance, {
        makerFee: currentAccount.makerFee,
        takerFee: currentAccount.takerFee,
      });
    }

    addPosition(newPos);
    setEditingPositionId(newPos.id);
    setActiveTab('active');
  };

  const handleUpdatePosition = (posId: string, updates: (p: PositionModel) => void) => {
    const pos = positions.find((p) => p.id === posId);
    if (pos) {
      updates(pos);
      updatePosition(pos);
    }
  };

  if (!currentAccount) {
    return <Box>Please create an account first.</Box>;
  }

  const activePositions = positions.filter((p) => p.status !== 'closed');
  const editingPosition = editingPositionId
    ? positions.find((p) => p.id === editingPositionId) || null
    : null;
  const editingAccount = editingPosition ? accountMap.get(editingPosition.accountId) || null : null;
  const pendingDeletePosition = pendingDeletePositionId
    ? positions.find((p) => p.id === pendingDeletePositionId) || null
    : null;
  const pendingDeleteAccount = pendingDeletePosition
    ? accountMap.get(pendingDeletePosition.accountId) || null
    : null;
  const pendingDeleteSetup = pendingDeletePosition
    ? setupMap.get(pendingDeletePosition.setupId) || null
    : null;

  return (
    <Dialog.Root
      open={Boolean(pendingDeletePosition)}
      onOpenChange={({ open }) => {
        if (!open) setPendingDeletePositionId(null);
      }}
      role="alertdialog"
    >
      <VStack gap={6} align="stretch">
        <Heading size="md" color="accent" h="40px" display="flex" alignItems="center">
          Position Workspace
        </Heading>

        <HStack justify="end">
          <HStack>
            <Text color="muted">Account:</Text>
            <Select.Root
              size="sm"
              width="200px"
              collection={accountCollection}
              value={activeAccountId ? [activeAccountId] : []}
              onValueChange={(e) => setSelectedAccountId(e.value[0] || '')}
            >
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="Select account" />
                  <Select.Indicator />
                </Select.Trigger>
              </Select.Control>
              <Select.Positioner>
                <Select.Content bg="surface" color="fg" borderColor="border">
                  {accountCollection.items.map((item) => (
                    <Select.Item item={item} key={item.value}>
                      <Select.ItemText>{item.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
            <Badge bg="subtle" color="brand" fontSize="md">
              ${currentAccount.currentBalance.toFixed(2)}
            </Badge>
            <Button color="success" onClick={handleAddPosition}>
              <Plus size={16} />
              New Plan
            </Button>
          </HStack>
        </HStack>

        <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)}>
          <Tabs.List>
            <Tabs.Trigger value="active" _selected={{ color: 'accentAlt' }}>
              Active
            </Tabs.Trigger>
            <Tabs.Trigger value="history" _selected={{ color: 'accentAlt' }}>
              History
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="active">
            <Card.Root bg="surface" color="fg" borderColor="border">
              <Card.Body>
                <VStack align="stretch" gap={4}>
                  {activePositions.length === 0 ? (
                    <Text color="muted" textAlign="center">
                      No active positions.
                    </Text>
                  ) : (
                    <Table.Root variant="outline" size="sm">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader>Account</Table.ColumnHeader>
                          <Table.ColumnHeader>Setup</Table.ColumnHeader>
                          <Table.ColumnHeader>Symbol</Table.ColumnHeader>
                          <Table.ColumnHeader>Side</Table.ColumnHeader>
                          <Table.ColumnHeader>Status</Table.ColumnHeader>
                          <Table.ColumnHeader>Filled</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="end">Current BE</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="end">Risk</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="end">Leverage</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="end">Margin</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="end">Notional Cost</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="end">Paid Fees</Table.ColumnHeader>
                          <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {activePositions.reverse().map((position) => {
                          const marginEstimate = position.getMarginEstimate
                            ? position.getMarginEstimate()
                            : 0;
                          const notionalCost = position.steps.reduce(
                            (sum, step) => sum + step.size * step.price,
                            0
                          );
                          const accountName = accountMap.get(position.accountId)?.name || 'Unknown';
                          const setupName =
                            setupMap.get(position.setupId)?.name ||
                            (position.setupId ? 'Unknown' : 'Manual');
                          const filledSteps = position.steps.reduce((sum, step) => {
                            if (step.isFilled) {
                              return sum + 1;
                            }
                            return sum;
                          }, 0);
                          const totalSteps = position.steps.length;

                          return (
                            <Table.Row key={position.id}>
                              <Table.Cell>{accountName}</Table.Cell>
                              <Table.Cell>{setupName}</Table.Cell>
                              <Table.Cell fontWeight="bold" color="accentAlt">
                                {position.symbol}
                              </Table.Cell>
                              <Table.Cell color={position.side === 'long' ? 'success' : 'danger'}>
                                {position.side}
                              </Table.Cell>
                              <Table.Cell>
                                <Badge bg={position.status === 'planning' ? 'info' : 'success'}>
                                  {position.status}
                                </Badge>
                              </Table.Cell>
                              <Table.Cell textAlign="end">
                                {filledSteps}/{totalSteps}
                              </Table.Cell>
                              <Table.Cell textAlign="end">
                                {position.currentBE?.toFixed(2) || '-'}
                              </Table.Cell>
                              <Table.Cell textAlign="end">
                                ${position.riskAmount.toFixed(2)}
                              </Table.Cell>
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
                              <Table.Cell textAlign="end">
                                <HStack justify="flex-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    color="info"
                                    onClick={() => {
                                      setEditingPositionId(position.id);
                                      setActiveTab('active');
                                    }}
                                  >
                                    <Edit size={14} /> Edit
                                  </Button>
                                  <IconButton
                                    aria-label="Delete"
                                    size="sm"
                                    px="3"
                                    color="danger"
                                    variant="ghost"
                                    onClick={() => setPendingDeletePositionId(position.id)}
                                  >
                                    <Trash size={14} /> Delete
                                  </IconButton>
                                </HStack>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Root>
                  )}
                </VStack>
              </Card.Body>
            </Card.Root>
          </Tabs.Content>
          <Tabs.Content value="history">
            <PositionHistoryTable />
          </Tabs.Content>
        </Tabs.Root>
      </VStack>

      <PositionEditor
        open={Boolean(editingPositionId)}
        position={editingPosition}
        setups={activeSetups}
        allSetups={setups}
        accountBalance={editingAccount?.currentBalance ?? 0}
        accountFees={{
          makerFee: editingAccount?.makerFee ?? 0,
          takerFee: editingAccount?.takerFee ?? 0,
        }}
        onUpdate={(updater) => {
          if (!editingPositionId) return;
          handleUpdatePosition(editingPositionId, updater);
        }}
        onRequestDelete={() => {
          if (!editingPositionId) return;
          setPendingDeletePositionId(editingPositionId);
        }}
        onClose={() => setEditingPositionId(null)}
      />

      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content bg="surface" color="fg" borderColor="border">
          <Dialog.Header>
            <Dialog.Title>Delete Position</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <VStack align="start" gap={2}>
              <Text>
                This will delete position
                {pendingDeletePosition ? ` "${pendingDeletePosition.symbol}"` : ''}.
              </Text>
              <Text color="muted">Account: {pendingDeleteAccount?.name || 'Unknown'}</Text>
              <Text color="muted">Setup: {pendingDeleteSetup?.name || 'Unknown'}</Text>
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.ActionTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </Dialog.ActionTrigger>
            <Button
              colorPalette="red"
              onClick={() => {
                if (!pendingDeletePosition) return;
                deletePosition(pendingDeletePosition.id);
                if (editingPositionId === pendingDeletePosition.id) {
                  setEditingPositionId(null);
                }
                setPendingDeletePositionId(null);
              }}
            >
              Delete Position
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
