import { useState } from 'react';
import {
  Box, Button, Select, VStack, HStack, Card,
  Text, Badge, Grid, GridItem, Field, Input,
  Separator, Checkbox,
  IconButton, Switch,
  Heading, createListCollection
} from '@chakra-ui/react';
import { Plus, Trash } from 'lucide-react';
import { usePlanner } from '../hooks/usePlanner';
import { PositionModel } from '../models/PositionModel';
import { SetupModel } from '../models/SetupModel';
import type { OrderType } from '../models/types';
import { NumberInput } from './ui/NumberInput';

export function PositionWorkspace () {
  const { accounts, setups, positions, addPosition, updatePosition, deletePosition } = usePlanner();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Derived state: Use selected or default to first
  const activeAccountId = selectedAccountId || accounts[0]?.id;
  const currentAccount = accounts.find(a => a.id === activeAccountId);

  // Filter positions for active account
  const accountPositions = positions.filter(p => p.accountId === activeAccountId);
  const accountCollection = createListCollection({
    items: accounts.map(a => ({ label: a.name, value: a.id })),
  });

  const handleAddPosition = () => {
    if (!currentAccount) return;
    const newPos = new PositionModel({
      symbol: 'BTCUSDT',
      status: 'planning',
      accountId: currentAccount.id,
      riskAmount: 100,
      leverage: 1
    });
    // Apply default setup if available
    if (setups.length > 0) {
      newPos.applySetup(setups[0]);
      // Initial calc
      newPos.recalculateRiskDriven(setups[0], currentAccount.currentBalance, {
        makerFee: currentAccount.makerFee,
        takerFee: currentAccount.takerFee,
      });
    }

    addPosition(newPos);
  };

  const handleDeletePosition = (posId: string) => {
    deletePosition(posId);
  };

  const handleUpdatePosition = (posId: string, updates: (p: PositionModel) => void) => {
    const pos = accountPositions.find(p => p.id === posId);
    if (pos) {
      updates(pos);
      updatePosition(pos);
    }
  };

  if (!currentAccount) {
    return <Box>Please create an account first.</Box>;
  }

  const activePositions = accountPositions.filter(p => p.status !== 'closed');

  return (
    <VStack gap={6} align="stretch">
      <Heading size="md" color="accent" h="40px" display="flex" alignItems="center">Position Workspace</Heading>

      <HStack justify="space-between">
        <HStack>
          <Text color="muted">Active Account:</Text>
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
              <Select.Content bg="surface" color="fg" borderColor="border" boxShadow="lg">
                {accountCollection.items.map(item => (
                  <Select.Item item={item} key={item.value}>
                    <Select.ItemText>{item.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
          <Badge bg="success" color="bg" fontSize="md">
            ${currentAccount.currentBalance.toFixed(2)}
          </Badge>
        </HStack>
        <HStack>
          <Button onClick={handleAddPosition} bg="accent" color="bg" _hover={{ bg: 'accentAlt', color: 'bg' }}>
            <Plus size={16} />
            New Plan
          </Button>
        </HStack>
      </HStack>

      <Box>
        {activePositions.length === 0 && <Text color="muted" textAlign="center">No active positions.</Text>}
        <VStack align="stretch" gap={4}>
          {activePositions.map(pos => (
            <PositionCard
              key={pos.id}
              position={pos}
              setups={setups}
              accountBalance={currentAccount.currentBalance}
              accountFees={{ makerFee: currentAccount.makerFee, takerFee: currentAccount.takerFee }}
              onUpdate={(updater) => handleUpdatePosition(pos.id, updater)}
              onDelete={() => handleDeletePosition(pos.id)}
            />
          ))}
        </VStack>
      </Box>

    </VStack>
  );
}

// --- Sub-components ---

function PositionCard ({ position, setups, accountBalance, accountFees, onUpdate, onDelete }: {
  position: PositionModel,
  setups: SetupModel[],
  accountBalance: number,
  accountFees: { makerFee: number; takerFee: number },
  onUpdate: (fn: (p: PositionModel) => void) => void,
  onDelete: () => void
}) {
  const { makerFee, takerFee } = accountFees;
  const setupCollection = createListCollection({
    items: setups.map(s => ({ label: s.name, value: s.id })),
  });
  const orderTypeCollection = createListCollection({
    items: [
      { label: 'Taker', value: 'taker' },
      { label: 'Maker', value: 'maker' },
    ],
  });
  const handleSetupChange = (setupId: string) => {
    const setup = setups.find(s => s.id === setupId);
    if (setup) {
      onUpdate(p => {
        p.applySetup(setup);
        p.recalculateRiskDriven(setup, accountBalance, { makerFee, takerFee });
      });
    }
  };

  const isOpened = position.status === 'opened';

  // Estimate margin
  const marginEst = position.getMarginEstimate ? position.getMarginEstimate() : 0;
  const totalSize = position.steps.reduce((sum, step) => sum + step.size, 0);
  const totalCost = position.steps.reduce((sum, step) => sum + step.cost, 0);
  const totalFees = position.feeTotal || 0;
  const marginUsagePct = accountBalance > 0
    ? (marginEst / accountBalance) * 100
    : 0;
  const canClose = position.pnl !== undefined && !Number.isNaN(position.pnl);

  return (
    <Card.Root
      borderTopWidth="4px"
      borderColor={position.side === 'long' ? 'success' : 'danger'}
      bg="surface"
      color="fg"
    >
      <Card.Body>
        <Grid templateColumns="repeat(12, 1fr)" gap={4}>
          {/* Header Row */}
          <GridItem colSpan={12}>
            <HStack justify="space-between">
              <HStack>
                <HStack>
                  <Text
                    fontSize="sm"
                    color={position.side === 'long' ? 'success' : 'danger'}
                    fontWeight="bold"
                    w="5ch"
                    textAlign="center"
                  >
                    {position.side.toUpperCase()}
                  </Text>
                  <Switch.Root
                    checked={position.side === 'short'}
                    onCheckedChange={(e) => {
                      onUpdate(p => {
                        p.side = e.checked ? 'short' : 'long';
                        // Recalculate immediately on side switch as Risk/SL relationship inverts
                        const setup = setups.find(s => s.id === p.setupId);
                        if (setup) {
                          p.recalculateRiskDriven(setup, accountBalance, { makerFee, takerFee });
                        }
                      });
                    }}
                    colorPalette="pink"
                    size="sm"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control />
                  </Switch.Root>
                </HStack>

                <Input
                  value={position.symbol}
                  onChange={e => onUpdate(p => p.symbol = e.target.value.toUpperCase())}
                  w="180px"
                  placeholder="SYMBOL"
                  fontWeight="bold"
                />
                <Select.Root
                  size="sm"
                  width="240px"
                  collection={setupCollection}
                  value={position.setupId ? [position.setupId] : []}
                  onValueChange={(e) => handleSetupChange(e.value[0] || '')}
                >
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Strategy" />
                      <Select.Indicator />
                    </Select.Trigger>
                  </Select.Control>
                  <Select.Positioner>
                    <Select.Content bg="surface" color="fg" borderColor="border" boxShadow="lg">
                      {setupCollection.items.map(item => (
                        <Select.Item item={item} key={item.value}>
                          <Select.ItemText>{item.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
                <Badge bg={isOpened ? 'success' : 'brand'} color="bg">{position.status.toUpperCase()}</Badge>
              </HStack>
              <HStack>
                <IconButton aria-label="Delete" size="sm" onClick={onDelete} variant="ghost" color="danger">
                  <Trash size={14} />
                </IconButton>
              </HStack>
            </HStack>
          </GridItem>

          <GridItem colSpan={12}><Separator my={2} borderColor="borderSubtle" /></GridItem>

          <GridItem colSpan={2}>
            <Field.Root>
              <Field.Label fontSize="xs" color="muted">Risk Amount ($)</Field.Label>
              <NumberInput
                key={`risk-${position.id}-${position.riskAmount}`}
                value={position.riskAmount.toString()}
                onCommit={(raw) => {
                  const next = Number(raw);
                  if (!Number.isFinite(next)) return;
                  onUpdate(p => {
                    p.riskAmount = next;
                    const setup = setups.find(s => s.id === p.setupId);
                    if (setup) {
                      p.recalculateRiskDriven(setup, accountBalance, { makerFee, takerFee });
                    }
                  });
                }}
              />
            </Field.Root>
          </GridItem>
          <GridItem colSpan={2}>
            <Field.Root>
              <Field.Label fontSize="xs" color="muted">Stop Loss Price</Field.Label>
              <NumberInput
                key={`sl-${position.id}-${position.stopLossPrice}`}
                value={position.stopLossPrice.toString()}
                onCommit={(raw) => {
                  const next = Number(raw);
                  if (!Number.isFinite(next)) return;
                  onUpdate(p => {
                    p.stopLossPrice = next;
                    const setup = setups.find(s => s.id === p.setupId);
                    if (setup) {
                      p.recalculateRiskDriven(setup, accountBalance, { makerFee, takerFee });
                    }
                  });
                }}
              />
            </Field.Root>
          </GridItem>
          <GridItem colSpan={2}>
            <Field.Root>
              <Field.Label fontSize="xs" color="muted">Leverage (x)</Field.Label>
              <NumberInput
                key={`lev-${position.id}-${position.leverage || 1}`}
                value={(position.leverage || 1).toString()}
                min={1}
                onCommit={(raw) => {
                  const nextRaw = Number(raw);
                  const next = Number.isFinite(nextRaw)
                    ? Math.min(125, Math.max(1, nextRaw))
                    : 1;
                  onUpdate(p => {
                    p.leverage = next;
                    const setup = setups.find(s => s.id === p.setupId);
                    if (setup) {
                      p.recalculateRiskDriven(setup, accountBalance, { makerFee, takerFee });
                    }
                  });
                }}
              />
            </Field.Root>
          </GridItem>

          <GridItem colSpan={12}><Separator my={2} borderColor="borderSubtle" /></GridItem>

          <GridItem colSpan={2}>
            <Field.Root>
              <Field.Label fontSize="xs" color="muted">Margin</Field.Label>
              <Text fontSize="xl" fontWeight="bold" color="brand">
                {marginEst > 0 ? `$${marginEst.toFixed(4)}` : '-'}
              </Text>
              <Text fontSize="sm" fontWeight="bold" color="fg">
                {marginEst > 0 ? `${marginUsagePct.toFixed(4)}%` : '-'}
              </Text>
            </Field.Root>
          </GridItem>
          <GridItem colSpan={2}>
            <Field.Root>
              <Field.Label fontSize="xs" color="muted">Notional Cost</Field.Label>
              <Text fontSize="xl" fontWeight="bold" color="fg">{totalCost > 0 ? `$${totalCost.toFixed(4)}` : '-'}</Text>
            </Field.Root>
          </GridItem>
          <GridItem colSpan={2}>
            <Field.Root>
              <Field.Label fontSize="xs" color="muted">Paid Fees</Field.Label>
              <Text fontSize="xl" fontWeight="bold" color="warning">{totalFees > 0 ? `$${totalFees.toFixed(4)}` : '-'}</Text>
            </Field.Root>
          </GridItem>
          <GridItem colSpan={2}>
            <Field.Root>
              <Field.Label fontSize="xs" color="muted">Total Size (Base Asset)</Field.Label>
              <Text fontSize="xl" fontWeight="bold" color="fg">{totalSize > 0 ? totalSize.toFixed(4) : '-'}</Text>
            </Field.Root>
          </GridItem>
          <GridItem colSpan={2}>
            <Field.Root>
              <Field.Label fontSize="xs" color="muted">Final Break Even</Field.Label>
              <Text fontSize="xl" fontWeight="bold" color="info">{position.predictedBE?.toFixed(2) || '-'}</Text>
            </Field.Root>
          </GridItem>


          {/* Resizing Steps Table */}
          <GridItem colSpan={12}>
            <Text fontSize="sm" fontWeight="bold" mb={2} color="accentAlt">Resizing Steps (Calculated)</Text>
            <Grid templateColumns="repeat(16, 1fr)" gap={1} mb={2} fontSize="xs" color="muted">
              <GridItem colSpan={1}>#</GridItem>
              <GridItem colSpan={3}>Price</GridItem>
              <GridItem colSpan={3}>Size</GridItem>
              <GridItem colSpan={2}>Est. Cost</GridItem>
              <GridItem colSpan={2}>Fee</GridItem>
              <GridItem colSpan={2}>Pred. BE</GridItem>
              <GridItem colSpan={2}>Order</GridItem>
              <GridItem colSpan={1}>Fill</GridItem>
            </Grid>
            {position.steps.map((step, idx) => (
              <Grid key={step.id} templateColumns="repeat(16, 1fr)" gap={1} mb={2} alignItems="center">
                <GridItem colSpan={1} fontSize="sm">{idx + 1}</GridItem>
                <GridItem colSpan={3}>
                  <NumberInput
                    key={`step-${step.id}-${step.price}`}
                    size="sm"
                    w="90%"
                    value={step.price.toString()}
                    disabled={step.isFilled}
                    onCommit={(raw) => {
                      const next = Number(raw);
                      if (!Number.isFinite(next)) return;
                      onUpdate(p => {
                        p.steps[idx].price = next;
                        const setup = setups.find(s => s.id === p.setupId);
                        if (setup) {
                          p.recalculateRiskDriven(setup, accountBalance, { makerFee, takerFee });
                        }
                      });
                    }}
                  />
                </GridItem>
                <GridItem colSpan={3}>
                  <Text fontSize="sm" fontWeight="bold">{step.size.toFixed(4)}</Text>
                </GridItem>
                <GridItem colSpan={2}>
                  <Text fontSize="xs" color="muted">${step.cost.toFixed(0)}</Text>
                </GridItem>
                <GridItem colSpan={2}>
                  <Text fontSize="xs" color="warning">{step.fee ? `$${step.fee.toFixed(4)}` : '-'}</Text>
                </GridItem>
                <GridItem colSpan={2}>
                  <Text fontSize="xs" color="info">{step.predictedBE?.toFixed(2) || '-'}</Text>
                </GridItem>
                <GridItem colSpan={2}>
                  <Select.Root
                    size="xs"
                    collection={orderTypeCollection}
                    value={[step.orderType]}
                    onValueChange={(e) => onUpdate(p => {
                      p.steps[idx].orderType = (e.value[0] || 'taker') as OrderType;
                      const setup = setups.find(s => s.id === p.setupId);
                      if (setup) {
                        p.recalculateRiskDriven(setup, accountBalance, { makerFee, takerFee });
                      }
                    })}
                  >
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText />
                        <Select.Indicator />
                      </Select.Trigger>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content bg="surface" color="fg" borderColor="border" boxShadow="lg">
                        {orderTypeCollection.items.map(item => (
                          <Select.Item item={item} key={item.value}>
                            <Select.ItemText>{item.label}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </GridItem>
                <GridItem colSpan={1}>
                  <Checkbox.Root
                    checked={step.isFilled}
                    colorPalette="green"
                    onCheckedChange={(e) => onUpdate(p => {
                      p.steps[idx].isFilled = !!e.checked;
                      // Logic: If any step is filled, status must be OPENED
                      if (e.checked && p.status === 'planning') {
                        p.status = 'opened';
                      }

                      const setup = setups.find(s => s.id === p.setupId);
                      if (setup) {
                        p.recalculateRiskDriven(setup, accountBalance, { makerFee, takerFee });
                      }
                    })}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                  </Checkbox.Root>
                </GridItem>
              </Grid>
            ))}
          </GridItem>

          <GridItem colSpan={12}>
            <Separator my={3} borderColor="borderSubtle" />
            <HStack justify="space-between">
              <HStack>
                <Text fontSize="sm" color="muted">Realized PnL (Net)</Text>
                <NumberInput
                  key={`pnl-${position.id}-${position.pnl ?? ''}`}
                  size="sm"
                  w="140px"
                  value={position.pnl?.toString() ?? ''}
                  onCommit={(raw) => onUpdate(p => {
                    const trimmed = raw.trim();
                    if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
                      p.pnl = undefined;
                      return;
                    }
                    const next = Number(trimmed);
                    if (Number.isFinite(next)) {
                      p.pnl = next;
                    }
                  })}
                  inputProps={{
                    'aria-label': 'Realized PnL',
                    color: position.pnl && position.pnl > 0 ? 'success' : 'danger',
                    fontWeight: 'bold',
                  }}
                />
              </HStack>
              <Button
                size="sm"
                bg="danger"
                color="bg"
                _hover={{ bg: 'accentAlt', color: 'bg' }}
                disabled={!canClose}
                onClick={() => onUpdate(p => {
                  p.status = 'closed';
                  p.closedAt = Date.now();
                })}
              >
                Close
              </Button>
            </HStack>
          </GridItem>
        </Grid>
      </Card.Body>
    </Card.Root>
  );
}
