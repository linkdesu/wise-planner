import { useState } from 'react';
import {
  Box, Button, NativeSelect, VStack, HStack, Card,
  Text, Badge, Grid, GridItem, Field, Input,
  NumberInput, Separator, Checkbox,
  IconButton, Switch,
  Heading
} from '@chakra-ui/react';
import { Plus, Trash } from 'lucide-react';
import { usePlanner } from '../hooks/usePlanner';
import { PositionModel } from '../models/PositionModel';
import { SetupModel } from '../models/SetupModel';
import type { OrderType } from '../models/types';

export function PositionWorkspace () {
  const { accounts, setups, positions, addPosition, updatePosition, deletePosition } = usePlanner();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Derived state: Use selected or default to first
  const activeAccountId = selectedAccountId || accounts[0]?.id;
  const currentAccount = accounts.find(a => a.id === activeAccountId);

  // Filter positions for active account
  const accountPositions = positions.filter(p => p.accountId === activeAccountId);

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
      newPos.recalculateRiskDriven(setups[0], currentAccount.currentBalance);
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
  const closedPositions = accountPositions.filter(p => p.status === 'closed').sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));

  return (
    <VStack gap={6} align="stretch">
      <Heading size="md" color="accent" h="40px" display="flex" alignItems="center">Position Workspace</Heading>

      <HStack justify="space-between">
        <HStack>
          <Text color="muted">Active Account:</Text>
          <NativeSelect.Root w="200px">
            <NativeSelect.Field
              value={activeAccountId || ''}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
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
              onUpdate={(updater) => handleUpdatePosition(pos.id, updater)}
              onDelete={() => handleDeletePosition(pos.id)}
            />
          ))}
        </VStack>
      </Box>

      {closedPositions.length > 0 && (
        <Box mt={8}>
          <Text fontSize="lg" fontWeight="bold" mb={4} color="muted">History</Text>
          <VStack align="stretch" gap={4}>
            {closedPositions.map(pos => (
              <ClosedPositionCard
                key={pos.id}
                position={pos}
                onUpdate={(updater) => handleUpdatePosition(pos.id, updater)}
                onDelete={() => handleDeletePosition(pos.id)}
              />
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  );
}

// --- Sub-components ---

function PositionCard ({ position, setups, accountBalance, onUpdate, onDelete }: {
  position: PositionModel,
  setups: SetupModel[],
  accountBalance: number,
  onUpdate: (fn: (p: PositionModel) => void) => void,
  onDelete: () => void
}) {
  const handleSetupChange = (setupId: string) => {
    const setup = setups.find(s => s.id === setupId);
    if (setup) {
      onUpdate(p => {
        p.applySetup(setup);
        p.recalculateRiskDriven(setup, accountBalance);
      });
    }
  };

  const handleRecalculate = () => {
    const setup = setups.find(s => s.id === position.setupId);
    if (setup) {
      onUpdate(p => p.recalculateRiskDriven(setup, accountBalance));
    }
  };


  // Auto-recalculate on blur of key fields
  const handleBlur = () => handleRecalculate();


  const isOpened = position.status === 'opened';

  // Estimate margin
  const marginEst = position.getMarginEstimate ? position.getMarginEstimate() : 0;
  const totalSize = position.steps.reduce((sum, step) => sum + step.size, 0);
  const totalCost = position.steps.reduce((sum, step) => sum + step.cost, 0);
  const marginUsagePct = accountBalance > 0
    ? (marginEst / accountBalance) * 100
    : 0;

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
                          p.recalculateRiskDriven(setup, accountBalance);
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
                <NativeSelect.Root w="160px">
                  <NativeSelect.Field
                    value={position.setupId}
                    onChange={e => handleSetupChange(e.target.value)}
                    placeholder="Strategy"
                  >
                    {setups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
                <Badge bg={isOpened ? 'success' : 'brand'} color="bg">{position.status.toUpperCase()}</Badge>
              </HStack>
              <HStack>
                <Button size="sm" bg="danger" color="bg" _hover={{ bg: 'accentAlt', color: 'bg' }} onClick={() => onUpdate(p => {
                  p.status = 'closed';
                  p.closedAt = Date.now();
                })}>
                  Close
                </Button>
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
              <NumberInput.Root
                value={position.riskAmount.toString()}
                onValueChange={(e) => onUpdate(p => p.riskAmount = Number(e.value))}
              >
                <NumberInput.Control />
                <NumberInput.Input onBlur={handleBlur} />
              </NumberInput.Root>
            </Field.Root>
          </GridItem>
          <GridItem colSpan={2}>
            <Field.Root>
              <Field.Label fontSize="xs" color="muted">Stop Loss Price</Field.Label>
              <NumberInput.Root
                value={position.stopLossPrice.toString()}
                onValueChange={(e) => onUpdate(p => p.stopLossPrice = Number(e.value))}
              >
                <NumberInput.Control />
                <NumberInput.Input onBlur={handleBlur} />
              </NumberInput.Root>
            </Field.Root>
          </GridItem>
          <GridItem colSpan={2}>
            <Field.Root>
              <Field.Label fontSize="xs" color="muted">Leverage (x)</Field.Label>
              <NumberInput.Root
                value={(position.leverage || 1).toString()}
                min={1}
                max={125}
                onValueChange={(e) => onUpdate(p => p.leverage = Number(e.value) || 1)}
              >
                <NumberInput.Control />
                <NumberInput.Input />
              </NumberInput.Root>
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
            <Grid templateColumns="repeat(14, 1fr)" gap={1} mb={2} fontSize="xs" color="muted">
              <GridItem colSpan={1}>#</GridItem>
              <GridItem colSpan={3}>Price</GridItem>
              <GridItem colSpan={3}>Size</GridItem>
              <GridItem colSpan={2}>Est. Cost</GridItem>
              <GridItem colSpan={2}>Pred. BE</GridItem>
              <GridItem colSpan={2}>Order</GridItem>
              <GridItem colSpan={1}>Fill</GridItem>
            </Grid>
            {position.steps.map((step, idx) => (
              <Grid key={step.id} templateColumns="repeat(14, 1fr)" gap={1} mb={2} alignItems="center">
                <GridItem colSpan={1} fontSize="sm">{idx + 1}</GridItem>
                <GridItem colSpan={3}>
                  <NumberInput.Root
                    size="sm"
                    value={step.price.toString()}
                    disabled={step.isFilled}
                    onValueChange={(e) => onUpdate(p => { p.steps[idx].price = Number(e.value); })}
                  >
                    <NumberInput.Control />
                    <NumberInput.Input onBlur={handleBlur} />
                  </NumberInput.Root>
                </GridItem>
                <GridItem colSpan={3}>
                  <Text fontSize="sm" fontWeight="bold">{step.size.toFixed(4)}</Text>
                </GridItem>
                <GridItem colSpan={2}>
                  <Text fontSize="xs" color="muted">${step.cost.toFixed(0)}</Text>
                </GridItem>
                <GridItem colSpan={2}>
                  <Text fontSize="xs" color="info">{step.predictedBE?.toFixed(2) || '-'}</Text>
                </GridItem>
                <GridItem colSpan={2}>
                  <NativeSelect.Root size="xs">
                    <NativeSelect.Field
                      value={step.orderType}
                      onChange={e => onUpdate(p => { p.steps[idx].orderType = e.target.value as OrderType; })}
                    >
                      <option value="taker">Taker</option>
                      <option value="maker">Maker</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
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
                        p.recalculateRiskDriven(setup, accountBalance);
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
        </Grid>
      </Card.Body>
    </Card.Root>
  );
}

function ClosedPositionCard ({ position, onUpdate, onDelete }: { position: PositionModel, onUpdate: (fn: (p: PositionModel) => void) => void, onDelete: () => void }) {
  // We handle PnL editing here for the record
  const handlePnLChange = (val: number) => {
    onUpdate(p => {
      p.pnl = val;
    });
  };

  return (
    <Card.Root
      borderLeftWidth="4px"
      borderColor={position.pnl && position.pnl > 0 ? 'success' : 'danger'}
      bg="surfaceAlt"
      color="fg"
    >
      <Card.Body py={2}>
        <HStack justify="space-between">
          <HStack gap={4}>
            <Text fontWeight="bold">{position.symbol}</Text>
            <Text fontSize="sm" color="muted">{new Date(position.createdAt).toLocaleDateString()}</Text>
            <Badge>{position.setupId ? 'Strategy Executed' : 'Manual'}</Badge>
          </HStack>
          <HStack>
            <Text fontSize="sm" color="muted">Final PnL:</Text>
            <NumberInput.Root
              size="sm"
              w="120px"
              value={position.pnl?.toString() ?? ''}
              onValueChange={(e) => handlePnLChange(Number(e.value))}
            >
              <NumberInput.Control />
              <NumberInput.Input
                color={position.pnl && position.pnl > 0 ? 'success' : 'danger'}
                fontWeight="bold"
              />
            </NumberInput.Root>
            <IconButton aria-label="Delete" size="sm" variant="ghost" onClick={onDelete}>
              <Trash size={14} />
            </IconButton>
          </HStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}
