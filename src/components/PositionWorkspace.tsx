import { useState, useEffect } from 'react';
import {
  Box, Button, Select, VStack, HStack, Card, CardBody,
  Text, Badge, Grid, GridItem, FormControl, FormLabel, Input,
  NumberInput, NumberInputField, Divider, Checkbox,
  IconButton,
  Tabs, TabList, Tab, TabPanels, TabPanel
} from '@chakra-ui/react';
import { Plus, Trash } from 'lucide-react';
import { usePlanner } from '../hooks/usePlanner';
import { PositionModel } from '../models/PositionModel';
import { AccountModel } from '../models/AccountModel';
import { SetupModel } from '../models/SetupModel';

export function PositionWorkspace () {
  const { accounts, setups, updateAccount } = usePlanner();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Auto-select first account
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts]);

  const currentAccount = accounts.find(a => a.id === selectedAccountId);

  const handleAddPosition = () => {
    if (!currentAccount) return;
    const newPos = new PositionModel({ symbol: 'BTCUSDT', status: 'planning' });
    // Apply default setup if available
    if (setups.length > 0) {
      newPos.applySetup(setups[0]);
      newPos.recalculate(setups[0]);
    }

    // We need to mutate the account and save properties
    // Since usePlanner provides updateAccount, we should clone/modify
    currentAccount.addPosition(newPos);
    updateAccount(currentAccount);
  };

  const handleDeletePosition = (posId: string) => {
    if (!currentAccount) return;
    currentAccount.positions = currentAccount.positions.filter(p => p.id !== posId);
    updateAccount(currentAccount);
  };

  const handleUpdatePosition = (posId: string, updates: (p: PositionModel) => void) => {
    if (!currentAccount) return;
    const pos = currentAccount.positions.find(p => p.id === posId);
    if (pos) {
      updates(pos);
      // Trigger storage update
      updateAccount(currentAccount);
    }
  };

  if (!currentAccount) {
    return <Box>Please create an account first.</Box>;
  }

  const activePositions = currentAccount.positions.filter(p => p.status !== 'closed');
  const closedPositions = currentAccount.positions.filter(p => p.status === 'closed').sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));

  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <HStack>
          <Text color="monokai.gray.300">Active Account:</Text>
          <Select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            w="200px"
          >
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Badge colorScheme="green" fontSize="md">
            ${currentAccount.currentBalance.toFixed(2)}
          </Badge>
        </HStack>
        <Button leftIcon={<Plus size={16} />} onClick={handleAddPosition} colorScheme="orange">
          New Plan
        </Button>
      </HStack>

      <Tabs variant="soft-rounded" colorScheme="orange">
        <TabList>
          <Tab>Active ({activePositions.length})</Tab>
          <Tab>History ({closedPositions.length})</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            <VStack align="stretch" spacing={4}>
              {activePositions.length === 0 && <Text color="monokai.gray.300" textAlign="center">No active positions.</Text>}
              {activePositions.map(pos => (
                <PositionCard
                  key={pos.id}
                  position={pos}
                  setups={setups}
                  onUpdate={(updater) => handleUpdatePosition(pos.id, updater)}
                  onDelete={() => handleDeletePosition(pos.id)}
                />
              ))}
            </VStack>
          </TabPanel>
          <TabPanel px={0}>
            <VStack align="stretch" spacing={4}>
              {closedPositions.map(pos => (
                <ClosedPositionCard
                  key={pos.id}
                  position={pos}
                  onDelete={() => handleDeletePosition(pos.id)}
                />
              ))}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
}

// --- Sub-components ---

function PositionCard ({ position, setups, onUpdate, onDelete }: {
  position: PositionModel,
  setups: SetupModel[],
  account?: AccountModel, // Optional or remove if strictly unused. But to minimize diff, let's remove.
  onUpdate: (fn: (p: PositionModel) => void) => void,
  onDelete: () => void
}) {
  // Local re-render trigger just in case

  const handleSetupChange = (setupId: string) => {
    const setup = setups.find(s => s.id === setupId);
    if (setup) {
      onUpdate(p => {
        p.applySetup(setup);
        p.recalculate(setup);
      });
    }
  };

  const handleRecalculate = () => {
    const setup = setups.find(s => s.id === position.setupId);
    if (setup) {
      onUpdate(p => p.recalculate(setup));
    }
  };

  // Auto-recalculate on blur of key fields
  const handleBlur = () => handleRecalculate();

  const isPlanning = position.status === 'planning';

  return (
    <Card borderTopWidth="4px" borderColor={isPlanning ? 'monokai.purple' : 'monokai.green'}>
      <CardBody>
        <Grid templateColumns="repeat(12, 1fr)" gap={4}>
          {/* Header Row */}
          <GridItem colSpan={12}>
            <HStack justify="space-between">
              <HStack>
                <Input
                  value={position.symbol}
                  onChange={e => onUpdate(p => p.symbol = e.target.value.toUpperCase())}
                  w="120px"
                  placeholder="Symbol"
                  fontWeight="bold"
                  isDisabled={!isPlanning}
                />
                <Select
                  value={position.setupId}
                  onChange={e => handleSetupChange(e.target.value)}
                  w="180px"
                  isDisabled={!isPlanning}
                  placeholder="Select Strategy"
                >
                  {setups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                {position.status === 'opened' && <Badge colorScheme="green">OPENED</Badge>}
                {position.status === 'planning' && <Badge colorScheme="purple">PLANNING</Badge>}
              </HStack>
              <HStack>
                {isPlanning && (
                  <Button size="sm" colorScheme="green" onClick={() => onUpdate(p => p.status = 'opened')}>
                    Execute Plan
                  </Button>
                )}
                {position.status === 'opened' && (
                  <Button size="sm" colorScheme="red" variant="outline" onClick={() => onUpdate(p => {
                    p.status = 'closed';
                    p.closedAt = Date.now();
                    // Naive close: Assume all unfilled are cancelled?
                    // Real PnL logic needs exit price.
                    // For now, prompt or simple close.
                    // Let's ask user to enter avg exit price in closed view, or here?
                    // For simplicity: Mark closed, let user edit PnL in History or below.
                  })}>
                    Close Position
                  </Button>
                )}
                <IconButton aria-label="Delete" size="sm" icon={<Trash size={14} />} onClick={onDelete} variant="ghost" colorScheme="red" />
              </HStack>
            </HStack>
          </GridItem>

          <GridItem colSpan={12}><Divider my={2} borderColor="monokai.gray.200" /></GridItem>

          {/* Main Inputs */}
          <GridItem colSpan={3}>
            <FormControl>
              <FormLabel fontSize="sm" color="monokai.gray.300">Stop Loss</FormLabel>
              <NumberInput value={position.stopLossPrice} onChange={(_, v) => onUpdate(p => p.stopLossPrice = Number(v))} onBlur={handleBlur} isDisabled={!isPlanning}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
          </GridItem>
          <GridItem colSpan={3}>
            <FormControl>
              <FormLabel fontSize="sm" color="monokai.gray.300">Risk Amount ($)</FormLabel>
              <NumberInput value={position.riskAmount} onChange={(_, v) => onUpdate(p => p.riskAmount = Number(v))} onBlur={handleBlur} isDisabled={!isPlanning}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
          </GridItem>
          <GridItem colSpan={3}>
            <FormControl>
              <FormLabel fontSize="sm" color="monokai.gray.300">Predicted BE</FormLabel>
              <Text fontSize="lg" fontWeight="bold" color="monokai.blue">{position.predictedBE?.toFixed(2) || '-'}</Text>
            </FormControl>
          </GridItem>
          <GridItem colSpan={3}>
            <FormControl>
              <FormLabel fontSize="sm" color="monokai.gray.300">Current BE</FormLabel>
              <Text fontSize="lg" fontWeight="bold" color="monokai.green">{position.currentBE?.toFixed(2) || '-'}</Text>
            </FormControl>
          </GridItem>


          {/* Resizing Steps Table */}
          <GridItem colSpan={12}>
            <Text fontSize="sm" fontWeight="bold" mb={2} color="monokai.yellow">Resizing Steps</Text>
            {/* Header */}
            <Grid templateColumns="repeat(12, 1fr)" gap={2} mb={2} fontSize="xs" color="monokai.gray.300">
              <GridItem colSpan={1}>#</GridItem>
              <GridItem colSpan={3}>Price</GridItem>
              <GridItem colSpan={2}>Order</GridItem>
              <GridItem colSpan={2}>Size (Units)</GridItem>
              <GridItem colSpan={2}>Est. Cost</GridItem>
              <GridItem colSpan={2}>Status</GridItem>
            </Grid>
            {position.steps.map((step, idx) => (
              <Grid key={step.id} templateColumns="repeat(12, 1fr)" gap={2} mb={2} alignItems="center">
                <GridItem colSpan={1} fontSize="sm">{idx + 1}</GridItem>
                <GridItem colSpan={3}>
                  <NumberInput size="sm" value={step.price} onChange={(_, v) => onUpdate(p => { p.steps[idx].price = Number(v); })} onBlur={handleBlur} isDisabled={!isPlanning && step.isFilled}>
                    <NumberInputField />
                  </NumberInput>
                </GridItem>
                <GridItem colSpan={2}>
                  <Select size="sm" value={step.orderType} onChange={e => onUpdate(p => { p.steps[idx].orderType = e.target.value as any; })}>
                    <option value="taker">Taker</option>
                    <option value="maker">Maker</option>
                  </Select>
                </GridItem>
                <GridItem colSpan={2}>
                  <Text fontSize="sm">{step.size.toFixed(4)}</Text>
                </GridItem>
                <GridItem colSpan={2}>
                  <Text fontSize="sm" color="monokai.gray.300">${step.cost.toFixed(2)}</Text>
                </GridItem>
                <GridItem colSpan={2}>
                  <Checkbox
                    isChecked={step.isFilled}
                    colorScheme="green"
                    onChange={(e) => onUpdate(p => {
                      p.steps[idx].isFilled = e.target.checked;
                      // Trigger Re-calc of Current BE on fill change
                      const setup = setups.find(s => s.id === p.setupId);
                      if (setup) p.recalculate(setup);
                    })}
                    isDisabled={position.status === 'closed'}
                  >
                    Filled
                  </Checkbox>
                </GridItem>
              </Grid>
            ))}
          </GridItem>
        </Grid>
      </CardBody>
    </Card>
  );
}

function ClosedPositionCard ({ position, onDelete }: { position: PositionModel, onDelete: () => void }) {
  const { updateAccount, accounts } = usePlanner();
  const account = accounts.find(a => a.positions.some(p => p.id === position.id));

  // We handle PnL editing here for the record
  const handlePnLChange = (val: number) => {
    if (account) {
      const p = account.positions.find(pos => pos.id === position.id);
      if (p) {
        p.pnl = val;
        account.calculateStats();
        updateAccount(account);
      }
    }
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
