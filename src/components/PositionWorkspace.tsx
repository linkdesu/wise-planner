import { useState } from 'react';
import {
  Box, Button, Select, VStack, HStack, Card, CardBody,
  Text, Badge, Grid, GridItem, FormControl, FormLabel, Input,
  NumberInput, NumberInputField, Divider, Checkbox,
  IconButton, Switch
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
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <HStack>
          <Text color="monokai.gray.300">Active Account:</Text>
          <Select
            value={activeAccountId || ''}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            w="200px"
          >
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Badge colorScheme="green" fontSize="md">
            ${currentAccount.currentBalance.toFixed(2)}
          </Badge>
        </HStack>
        <HStack>
          <Button leftIcon={<Plus size={16} />} onClick={handleAddPosition} colorScheme="orange">
            New Plan
          </Button>
        </HStack>
      </HStack>

      <Box>
        {activePositions.length === 0 && <Text color="monokai.gray.300" textAlign="center">No active positions.</Text>}
        <VStack align="stretch" spacing={4}>
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
          <Text fontSize="lg" fontWeight="bold" mb={4} color="monokai.gray.300">History</Text>
          <VStack align="stretch" spacing={4}>
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
    <Card borderTopWidth="4px" borderColor={position.side === 'long' ? 'monokai.green' : 'monokai.pink'}>
      <CardBody>
        <Grid templateColumns="repeat(12, 1fr)" gap={4}>
          {/* Header Row */}
          <GridItem colSpan={12}>
            <HStack justify="space-between">
              <HStack>
                <HStack>
                  <Text fontSize="sm" color={position.side === 'long' ? 'monokai.green' : 'monokai.pink'} fontWeight="bold">
                    {position.side.toUpperCase()}
                  </Text>
                  <Switch
                    isChecked={position.side === 'short'}
                    onChange={(e) => {
                      onUpdate(p => {
                        p.side = e.target.checked ? 'short' : 'long';
                        // Recalculate immediately on side switch as Risk/SL relationship inverts
                        const setup = setups.find(s => s.id === p.setupId);
                        if (setup) {
                          p.recalculateRiskDriven(setup, accountBalance);
                        }
                      });
                    }}
                    colorScheme="pink"
                    size="sm"
                  />
                </HStack>

                <Input
                  value={position.symbol}
                  onChange={e => onUpdate(p => p.symbol = e.target.value.toUpperCase())}
                  w="180px"
                  placeholder="SYM"
                  fontWeight="bold"
                />
                <Select
                  value={position.setupId}
                  onChange={e => handleSetupChange(e.target.value)}
                  w="160px"
                  placeholder="Strategy"
                >
                  {setups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <Badge colorScheme={isOpened ? 'green' : 'purple'}>{position.status.toUpperCase()}</Badge>
              </HStack>
              <HStack>
                <Button size="sm" colorScheme="red" variant="outline" onClick={() => onUpdate(p => {
                  p.status = 'closed';
                  p.closedAt = Date.now();
                })}>
                  Close
                </Button>
                <IconButton aria-label="Delete" size="sm" icon={<Trash size={14} />} onClick={onDelete} variant="ghost" colorScheme="red" />
              </HStack>
            </HStack>
          </GridItem>

          <GridItem colSpan={12}><Divider my={2} borderColor="monokai.gray.200" /></GridItem>

          <GridItem colSpan={2}>
            <FormControl>
              <FormLabel fontSize="xs" color="monokai.gray.300">Stop Loss Price</FormLabel>
              <NumberInput
                value={position.stopLossPrice}
                onChange={(_, v) => onUpdate(p => p.stopLossPrice = Number(v))}
                onBlur={handleBlur}
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
          </GridItem>
          <GridItem colSpan={2}>
            <FormControl>
              <FormLabel fontSize="xs" color="monokai.gray.300">Risk Amount ($)</FormLabel>
              <NumberInput
                value={position.riskAmount}
                onChange={(_, v) => onUpdate(p => p.riskAmount = Number(v))}
                onBlur={handleBlur}
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
          </GridItem>
          <GridItem colSpan={2}>
            <FormControl>
              <FormLabel fontSize="xs" color="monokai.gray.300">Leverage (x)</FormLabel>
              <NumberInput
                value={position.leverage || 1}
                min={1}
                max={125}
                onChange={(_, v) => onUpdate(p => p.leverage = Number(v) || 1)}
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>
          </GridItem>
          <GridItem colSpan={2}>
            <FormControl>
              <FormLabel fontSize="xs" color="monokai.gray.300">Est. Margin</FormLabel>
              <Text fontSize="lg" fontWeight="bold" color="monokai.gray.300">
                {marginEst > 0 ? `$${marginEst.toFixed(2)}` : '-'}
              </Text>
              <Text fontSize="xs" color="monokai.gray.300">
                {marginEst > 0 ? `${marginUsagePct.toFixed(2)}%` : '-'}
              </Text>
            </FormControl>
          </GridItem>
          <GridItem colSpan={2}>
            <FormControl>
              <FormLabel fontSize="xs" color="monokai.gray.300">Pred. BE</FormLabel>
              <Text fontSize="lg" fontWeight="bold" color="monokai.blue">{position.predictedBE?.toFixed(2) || '-'}</Text>
            </FormControl>
          </GridItem>
          <GridItem colSpan={4}>
            <FormControl>
              <FormLabel fontSize="xs" color="monokai.gray.300">Total Size (Base)</FormLabel>
              <Text fontSize="lg" fontWeight="bold" color="monokai.gray.300">{totalSize > 0 ? totalSize.toFixed(4) : '-'}</Text>
            </FormControl>
          </GridItem>
          <GridItem colSpan={4}>
            <FormControl>
              <FormLabel fontSize="xs" color="monokai.gray.300">Notional Cost</FormLabel>
              <Text fontSize="lg" fontWeight="bold" color="monokai.gray.300">{totalCost > 0 ? `$${totalCost.toFixed(2)}` : '-'}</Text>
            </FormControl>
          </GridItem>


          {/* Resizing Steps Table */}
          <GridItem colSpan={12}>
            <Text fontSize="sm" fontWeight="bold" mb={2} color="monokai.yellow">Resizing Steps (Calculated)</Text>
            <Grid templateColumns="repeat(14, 1fr)" gap={1} mb={2} fontSize="xs" color="monokai.gray.300">
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
                  <NumberInput size="sm" value={step.price} onChange={(_, v) => onUpdate(p => { p.steps[idx].price = Number(v); })} onBlur={handleBlur} isDisabled={step.isFilled}>
                    <NumberInputField />
                  </NumberInput>
                </GridItem>
                <GridItem colSpan={3}>
                  <Text fontSize="sm" fontWeight="bold">{step.size.toFixed(4)}</Text>
                </GridItem>
                <GridItem colSpan={2}>
                  <Text fontSize="xs" color="monokai.gray.300">${step.cost.toFixed(0)}</Text>
                </GridItem>
                <GridItem colSpan={2}>
                  <Text fontSize="xs" color="monokai.blue">{step.predictedBE?.toFixed(2) || '-'}</Text>
                </GridItem>
                <GridItem colSpan={2}>
                  <Select size="xs" value={step.orderType} onChange={e => onUpdate(p => { p.steps[idx].orderType = e.target.value as OrderType; })}>
                    <option value="taker">Taker</option>
                    <option value="maker">Maker</option>
                  </Select>
                </GridItem>
                <GridItem colSpan={1}>
                  <Checkbox
                    isChecked={step.isFilled}
                    colorScheme="green"
                    onChange={(e) => onUpdate(p => {
                      p.steps[idx].isFilled = e.target.checked;
                      // Logic: If any step is filled, status must be OPENED
                      if (e.target.checked && p.status === 'planning') {
                        p.status = 'opened';
                      }

                      const setup = setups.find(s => s.id === p.setupId);
                      if (setup) {
                        p.recalculateRiskDriven(setup, accountBalance);
                      }
                    })}
                  />
                </GridItem>
              </Grid>
            ))}
          </GridItem>
        </Grid>
      </CardBody>
    </Card>
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
    <Card borderLeftWidth="4px" borderColor={position.pnl && position.pnl > 0 ? 'monokai.green' : 'monokai.pink'} bg="monokai.gray.900">
      <CardBody py={2}>
        <HStack justify="space-between">
          <HStack spacing={4}>
            <Text fontWeight="bold">{position.symbol}</Text>
            <Text fontSize="sm" color="monokai.gray.300">{new Date(position.createdAt).toLocaleDateString()}</Text>
            <Badge>{position.setupId ? 'Strategy Executed' : 'Manual'}</Badge>
          </HStack>
          <HStack>
            <Text fontSize="sm" color="monokai.gray.300">Final PnL:</Text>
            <NumberInput size="sm" w="120px" value={position.pnl} onChange={(_, v) => handlePnLChange(Number(v))}>
              <NumberInputField color={position.pnl && position.pnl > 0 ? 'monokai.green' : 'monokai.pink'} fontWeight="bold" />
            </NumberInput>
            <IconButton aria-label="Delete" icon={<Trash size={14} />} size="sm" variant="ghost" onClick={onDelete} />
          </HStack>
        </HStack>
      </CardBody>
    </Card>
  );
}
