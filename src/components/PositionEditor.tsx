import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Field,
  Grid,
  GridItem,
  HStack,
  IconButton,
  Input,
  List,
  Select,
  Separator,
  Switch,
  Text,
  createListCollection,
} from '@chakra-ui/react';
import { Plus, Trash, X } from 'lucide-react';
import { useState } from 'react';
import { PositionModel } from '../models/PositionModel';
import { SetupModel } from '../models/SetupModel';
import type { OrderType } from '../models/types';
import { NumberInput } from './ui/NumberInput';

type PositionEditorProps = {
  open: boolean;
  position: PositionModel | null;
  setups: SetupModel[];
  allSetups: SetupModel[];
  accountBalance: number;
  accountFees: { makerFee: number; takerFee: number };
  onUpdate: (fn: (p: PositionModel) => void) => void;
  onRequestDelete: () => void;
  onClose: () => void;
};

export function PositionEditor({
  open,
  position,
  setups,
  allSetups,
  accountBalance,
  accountFees,
  onUpdate,
  onRequestDelete,
  onClose,
}: PositionEditorProps) {
  const [riskError, setRiskError] = useState<string | null>(null);
  const [stopLossError, setStopLossError] = useState<string | null>(null);
  const [leverageError, setLeverageError] = useState<string | null>(null);

  if (!position) {
    return (
      <Dialog.Root open={open} onOpenChange={({ open: nextOpen }) => !nextOpen && onClose()}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="surface" color="fg" borderColor="border">
            <Dialog.Header>
              <Dialog.Title>Edit Position</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text color="muted">No position selected.</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Close</Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    );
  }

  const { makerFee, takerFee } = accountFees;
  const allSetupsMap = new Map(allSetups.map((setup) => [setup.id, setup]));
  const setupCollection = createListCollection({
    items: setups.map((s) => ({ label: s.name, value: s.id })),
  });
  const orderTypeCollection = createListCollection({
    items: [
      { label: 'Taker', value: 'taker' },
      { label: 'Maker', value: 'maker' },
    ],
  });

  const handleSetupChange = (setupId: string) => {
    const setup = setups.find((s) => s.id === setupId);
    if (setup) {
      onUpdate((p) => {
        p.applySetup(setup);
        p.recalculateRiskDriven(setup, accountBalance, { makerFee, takerFee });
      });
    }
  };

  const handleAddChaseStep = () => {
    onUpdate((p) => {
      p.chaseSteps.push({
        id: crypto.randomUUID(),
        price: 0,
        size: 0,
        cost: 0,
        orderType: 'taker',
        fee: 0,
        isFilled: false,
        isClosed: false,
        predictedBE: 0,
      });
      const setup = setups.find((s) => s.id === p.setupId);
      if (setup) {
        p.recalculateRiskDriven(setup, accountBalance, { makerFee, takerFee });
      }
    });
  };

  const deletedSetup = position.setupId ? allSetupsMap.get(position.setupId) : undefined;
  const isDeletedSetupReference = Boolean(deletedSetup?.isDeleted);

  const isOpened = position.status === 'opened';

  const marginEst = position.getMarginEstimate ? position.getMarginEstimate() : 0;
  const allSteps = [...position.steps, ...position.chaseSteps];
  const finalSize = allSteps.reduce((sum, step) => {
    if (step.isClosed) return sum;
    return sum + step.size;
  }, 0);
  const totalCost = allSteps.reduce((sum, step) => {
    if (step.isClosed) return sum;
    return sum + step.size * step.price;
  }, 0);
  const totalFees = position.feeTotal || 0;
  const marginUsagePct = accountBalance > 0 ? (marginEst / accountBalance) * 100 : 0;
  const canClose = position.pnl !== undefined && !Number.isNaN(position.pnl);
  const stepPrices = allSteps.map((step) => step.price).filter((price) => price > 0);
  const minStepPrice = stepPrices.length > 0 ? Math.min(...stepPrices) : null;
  const maxStepPrice = stepPrices.length > 0 ? Math.max(...stepPrices) : null;
  const computedRiskError = position.riskAmount <= 0 ? 'Risk amount must be greater than 0.' : null;
  const computedLeverageError = position.leverage <= 0 ? 'Leverage must be greater than 0.' : null;
  const computedStopLossError =
    minStepPrice === null || maxStepPrice === null
      ? null
      : position.side === 'long'
        ? position.stopLossPrice >= minStepPrice
          ? 'Stop loss must be below the lowest step price for long.'
          : null
        : position.stopLossPrice <= maxStepPrice
          ? 'Stop loss must be above the highest step price for short.'
          : null;
  const riskErrorMessage = riskError ?? computedRiskError;
  const extraRisk = position.extraRisk || 0;
  const leverageErrorMessage = leverageError ?? computedLeverageError;
  const stopLossErrorMessage = stopLossError ?? computedStopLossError;

  return (
    <Dialog.Root open={open} onOpenChange={({ open: nextOpen }) => !nextOpen && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content bg="surface" color="fg" borderColor="border" maxW="960px">
          <Dialog.Header>
            <HStack justify="space-between">
              <Dialog.Title>Edit Position</Dialog.Title>
              <IconButton aria-label="Close" size="sm" variant="ghost" onClick={onClose}>
                <X size={14} />
              </IconButton>
            </HStack>
          </Dialog.Header>
          <Dialog.Body maxH="80vh" overflowY="auto">
            <Card.Root
              borderTopWidth="4px"
              borderColor={position.side === 'long' ? 'success' : 'danger'}
              bg="surface"
              color="fg"
            >
              <Card.Body>
                <Grid templateColumns="repeat(12, 1fr)" gap={4}>
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
                              setStopLossError(null);
                              onUpdate((p) => {
                                p.side = e.checked ? 'short' : 'long';
                                const setup = setups.find((s) => s.id === p.setupId);
                                if (setup) {
                                  p.recalculateRiskDriven(setup, accountBalance, {
                                    makerFee,
                                    takerFee,
                                  });
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
                          onChange={(e) =>
                            onUpdate((p) => (p.symbol = e.target.value.toUpperCase()))
                          }
                          w="180px"
                          placeholder="SYMBOL"
                          fontWeight="bold"
                        />
                        <Select.Root
                          size="sm"
                          width="240px"
                          collection={setupCollection}
                          value={
                            !isDeletedSetupReference && position.setupId ? [position.setupId] : []
                          }
                          onValueChange={(e) => handleSetupChange(e.value[0] || '')}
                        >
                          <Select.Control>
                            <Select.Trigger>
                              <Select.ValueText placeholder="Strategy" />
                              <Select.Indicator />
                            </Select.Trigger>
                          </Select.Control>
                          <Select.Positioner>
                            <Select.Content
                              bg="surface"
                              color="fg"
                              borderColor="border"
                              boxShadow="lg"
                            >
                              {setupCollection.items.map((item) => (
                                <Select.Item item={item} key={item.value}>
                                  <Select.ItemText>{item.label}</Select.ItemText>
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Positioner>
                        </Select.Root>
                        {isDeletedSetupReference && (
                          <Text fontSize="xs" color="warning">
                            Deleted setup: {deletedSetup?.name || 'Unknown'}
                          </Text>
                        )}
                        <Badge bg={isOpened ? 'success' : 'brand'} color="bg">
                          {position.status.toUpperCase()}
                        </Badge>
                      </HStack>
                      <HStack>
                        <IconButton
                          aria-label="Delete"
                          size="sm"
                          px="3"
                          onClick={onRequestDelete}
                          variant="ghost"
                          color="danger"
                        >
                          <Trash size={14} /> Delete
                        </IconButton>
                      </HStack>
                    </HStack>
                  </GridItem>

                  <GridItem colSpan={12}>
                    <Separator my={2} borderColor="borderSubtle" />
                  </GridItem>

                  <GridItem colSpan={5}>
                    <Field.Root invalid={Boolean(riskErrorMessage)}>
                      <Field.Label fontSize="xs" color="muted">
                        Risk Amount ($)
                      </Field.Label>
                      <HStack align="center">
                        <NumberInput
                          inputProps={{
                            color: riskErrorMessage ? 'danger' : 'fg',
                            'aria-invalid': Boolean(riskErrorMessage),
                          }}
                          key={`risk-${position.id}-${position.riskAmount}`}
                          value={position.riskAmount.toString()}
                          min={1}
                          onCommit={(raw) => {
                            const next = Number(raw);
                            if (!Number.isFinite(next) || next <= 0) {
                              setRiskError('Risk amount must be greater than 0.');
                              return;
                            }
                            setRiskError(null);
                            onUpdate((p) => {
                              p.riskAmount = next;
                              const setup = setups.find((s) => s.id === p.setupId);
                              if (setup) {
                                p.recalculateRiskDriven(setup, accountBalance, {
                                  makerFee,
                                  takerFee,
                                });
                              }
                            });
                          }}
                        />
                        {extraRisk > 0 && (
                          <Text fontSize="xs" color="danger">
                            + ${extraRisk.toFixed(2) + '(extra)'}
                          </Text>
                        )}
                      </HStack>
                      {riskErrorMessage && (
                        <Text fontSize="xs" color="danger">
                          {riskErrorMessage}
                        </Text>
                      )}
                    </Field.Root>
                  </GridItem>
                  <GridItem colSpan={2}>
                    <Field.Root invalid={Boolean(stopLossErrorMessage)}>
                      <Field.Label fontSize="xs" color="muted">
                        Stop Loss Price
                      </Field.Label>
                      <NumberInput
                        inputProps={{
                          color: stopLossErrorMessage ? 'danger' : 'fg',
                          'aria-invalid': Boolean(stopLossErrorMessage),
                        }}
                        key={`sl-${position.id}-${position.stopLossPrice}`}
                        value={position.stopLossPrice.toString()}
                        min={0}
                        onCommit={(raw) => {
                          const next = Number(raw);
                          if (!Number.isFinite(next)) {
                            setStopLossError('Stop loss must be a valid number.');
                            return;
                          }
                          const invalidStopLoss =
                            minStepPrice === null || maxStepPrice === null
                              ? false
                              : position.side === 'long'
                                ? next >= minStepPrice
                                : next <= maxStepPrice;
                          if (invalidStopLoss) {
                            setStopLossError(
                              position.side === 'long'
                                ? 'Stop loss must be below the lowest step price for long position.'
                                : 'Stop loss must be above the highest step price for short position.'
                            );
                            return;
                          }
                          setStopLossError(null);
                          onUpdate((p) => {
                            p.stopLossPrice = next;
                            const setup = setups.find((s) => s.id === p.setupId);
                            if (setup) {
                              p.recalculateRiskDriven(setup, accountBalance, {
                                makerFee,
                                takerFee,
                              });
                            }
                          });
                        }}
                      />
                      {stopLossErrorMessage && (
                        <Text fontSize="xs" color="danger">
                          {stopLossErrorMessage}
                        </Text>
                      )}
                    </Field.Root>
                  </GridItem>
                  <GridItem colSpan={2}>
                    <Field.Root invalid={Boolean(leverageErrorMessage)}>
                      <Field.Label fontSize="xs" color="muted">
                        Leverage (x)
                      </Field.Label>
                      <NumberInput
                        inputProps={{
                          color: leverageErrorMessage ? 'danger' : 'fg',
                          'aria-invalid': Boolean(leverageErrorMessage),
                        }}
                        key={`lev-${position.id}-${position.leverage || 1}`}
                        value={(position.leverage || 1).toString()}
                        min={1}
                        onCommit={(raw) => {
                          const nextRaw = Number(raw);
                          if (!Number.isFinite(nextRaw) || nextRaw <= 0) {
                            setLeverageError('Leverage must be greater than 0.');
                            return;
                          }
                          const next = Math.min(125, nextRaw);
                          setLeverageError(null);
                          onUpdate((p) => {
                            p.leverage = next;
                            const setup = setups.find((s) => s.id === p.setupId);
                            if (setup) {
                              p.recalculateRiskDriven(setup, accountBalance, {
                                makerFee,
                                takerFee,
                              });
                            }
                          });
                        }}
                      />
                      {leverageErrorMessage && (
                        <Text fontSize="xs" color="danger">
                          {leverageErrorMessage}
                        </Text>
                      )}
                    </Field.Root>
                  </GridItem>

                  <GridItem colSpan={12}>
                    <Separator my={2} borderColor="borderSubtle" />
                  </GridItem>

                  <GridItem colSpan={3}>
                    <Field.Root>
                      <Field.Label fontSize="xs" color="muted">
                        Margin
                      </Field.Label>
                      <Text fontSize="xl" fontWeight="bold" color="success">
                        {marginEst > 0 ? `$${marginEst.toFixed(4)}` : '-'}
                      </Text>
                      <Text fontSize="sm" fontWeight="bold">
                        {marginEst > 0 ? `${marginUsagePct.toFixed(2)}%` : '-'}
                      </Text>
                    </Field.Root>
                  </GridItem>
                  <GridItem colSpan={3}>
                    <Field.Root>
                      <Field.Label fontSize="xs" color="muted">
                        Notional Cost
                      </Field.Label>
                      <Text fontSize="xl" fontWeight="bold" color="accent">
                        {totalCost > 0 ? `$${totalCost.toFixed(4)}` : '-'}
                      </Text>
                    </Field.Root>
                  </GridItem>
                  <GridItem colSpan={2}>
                    <Field.Root>
                      <Field.Label fontSize="xs" color="muted">
                        Paid Fees
                      </Field.Label>
                      <Text fontSize="md" fontWeight="bold">
                        {totalFees > 0 ? `$${totalFees.toFixed(4)}` : '-'}
                      </Text>
                    </Field.Root>
                  </GridItem>
                  <GridItem colSpan={2}>
                    <Field.Root>
                      <Field.Label fontSize="xs" color="muted">
                        Final Size (Base)
                      </Field.Label>
                      <Text fontSize="md" fontWeight="bold">
                        {finalSize > 0 ? finalSize.toFixed(4) : '-'}
                      </Text>
                    </Field.Root>
                  </GridItem>
                  <GridItem colSpan={2}>
                    <Field.Root>
                      <Field.Label fontSize="xs" color="muted">
                        Final Break Even
                      </Field.Label>
                      <Text fontSize="xl" fontWeight="bold" color="danger">
                        {position.predictedBE?.toFixed(4) || '-'}
                      </Text>
                    </Field.Root>
                  </GridItem>

                  <GridItem colSpan={12}>
                    <Text fontSize="sm" fontWeight="bold" mb={2} color="accentAlt">
                      Planned Steps (Auto-calculated)
                    </Text>
                    <Text fontSize="xs" mb={2} color="muted">
                      After a step is filled, you should update its price and size manually to
                      reflect the actual trading.
                    </Text>
                    <Grid
                      templateColumns="repeat(17, 1fr)"
                      gap={1}
                      mb={2}
                      fontSize="xs"
                      color="muted"
                    >
                      <GridItem colSpan={1}>#</GridItem>
                      <GridItem colSpan={3}>Price</GridItem>
                      <GridItem colSpan={2}>Size</GridItem>
                      <GridItem colSpan={3}>Est. Cost</GridItem>
                      <GridItem colSpan={2}>Fee</GridItem>
                      <GridItem colSpan={2}>Break Even</GridItem>
                      <GridItem colSpan={2}>Order</GridItem>
                      <GridItem colSpan={1}>Fill</GridItem>
                      <GridItem colSpan={1}>Close</GridItem>
                    </Grid>
                    {position.steps.map((step, idx) => (
                      <Grid
                        key={step.id}
                        templateColumns="repeat(17, 1fr)"
                        gap={1}
                        mb={2}
                        alignItems="center"
                      >
                        <GridItem colSpan={1} fontSize="sm">
                          {idx + 1}
                        </GridItem>
                        <GridItem colSpan={3}>
                          <NumberInput
                            inputProps={{ color: 'fg' }}
                            key={`step-${step.id}-${step.price}`}
                            size="sm"
                            w="90%"
                            min={0}
                            value={step.price.toString()}
                            disabled={step.isClosed}
                            onCommit={(raw) => {
                              const next = Number(raw);
                              if (!Number.isFinite(next)) return;
                              onUpdate((p) => {
                                p.steps[idx].price = next;
                                const setup = setups.find((s) => s.id === p.setupId);
                                if (setup) {
                                  p.recalculateRiskDriven(setup, accountBalance, {
                                    makerFee,
                                    takerFee,
                                  });
                                }
                              });
                            }}
                          />
                        </GridItem>
                        <GridItem colSpan={2}>
                          {step.isFilled && !step.isClosed ? (
                            <NumberInput
                              inputProps={{ color: 'fg' }}
                              key={`step-size-${step.id}-${step.size}`}
                              size="sm"
                              w="90%"
                              min={0}
                              value={step.size.toString()}
                              onCommit={(raw) => {
                                const next = Number(raw);
                                if (!Number.isFinite(next)) return;
                                onUpdate((p) => {
                                  p.steps[idx].size = next;
                                  const setup = setups.find((s) => s.id === p.setupId);
                                  if (setup) {
                                    p.recalculateRiskDriven(setup, accountBalance, {
                                      makerFee,
                                      takerFee,
                                    });
                                  }
                                });
                              }}
                            />
                          ) : (
                            <Text fontSize="sm" fontWeight="bold">
                              {step.size.toFixed(6)}
                            </Text>
                          )}
                        </GridItem>
                        <GridItem colSpan={3} color="accent">
                          <Text fontSize="xs">${step.cost.toFixed(4)}</Text>
                        </GridItem>
                        <GridItem colSpan={2}>
                          <Text fontSize="xs">{step.fee ? `$${step.fee.toFixed(4)}` : '-'}</Text>
                        </GridItem>
                        <GridItem colSpan={2}>
                          <Text fontSize="xs" color="danger">
                            {step.predictedBE?.toFixed(4) || '-'}
                          </Text>
                        </GridItem>
                        <GridItem colSpan={2}>
                          <Select.Root
                            size="xs"
                            collection={orderTypeCollection}
                            value={[step.orderType]}
                            onValueChange={(e) =>
                              onUpdate((p) => {
                                p.steps[idx].orderType = (e.value[0] || 'taker') as OrderType;
                                const setup = setups.find((s) => s.id === p.setupId);
                                if (setup) {
                                  p.recalculateRiskDriven(setup, accountBalance, {
                                    makerFee,
                                    takerFee,
                                  });
                                }
                              })
                            }
                          >
                            <Select.Control>
                              <Select.Trigger>
                                <Select.ValueText />
                                <Select.Indicator />
                              </Select.Trigger>
                            </Select.Control>
                            <Select.Positioner>
                              <Select.Content
                                bg="surface"
                                color="fg"
                                borderColor="border"
                                boxShadow="lg"
                              >
                                {orderTypeCollection.items.map((item) => (
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
                            disabled={step.isClosed}
                            onCheckedChange={(e) =>
                              onUpdate((p) => {
                                if (p.steps[idx].isClosed) return;
                                p.steps[idx].isFilled = !!e.checked;
                                if (!e.checked) {
                                  p.steps[idx].isClosed = false;
                                }
                                if (e.checked && p.status === 'planning') {
                                  p.status = 'opened';
                                }

                                const setup = setups.find((s) => s.id === p.setupId);
                                if (setup) {
                                  p.recalculateRiskDriven(setup, accountBalance, {
                                    makerFee,
                                    takerFee,
                                  });
                                }
                              })
                            }
                          >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control />
                          </Checkbox.Root>
                        </GridItem>
                        <GridItem colSpan={1}>
                          {step.isClosed ? (
                            <Text fontSize="xs" color="muted">
                              Closed
                            </Text>
                          ) : (
                            <IconButton
                              aria-label="Close step"
                              size="xs"
                              variant="ghost"
                              disabled={!step.isFilled}
                              onClick={() =>
                                onUpdate((p) => {
                                  const target = p.steps[idx];
                                  if (!target.isFilled || target.isClosed) return;
                                  target.isClosed = true;
                                  const setup = setups.find((s) => s.id === p.setupId);
                                  if (setup) {
                                    p.recalculateRiskDriven(setup, accountBalance, {
                                      makerFee,
                                      takerFee,
                                    });
                                  }
                                })
                              }
                            >
                              <X size={12} />
                            </IconButton>
                          )}
                        </GridItem>
                      </Grid>
                    ))}
                  </GridItem>

                  <GridItem colSpan={12}>
                    <Separator my={3} borderColor="borderSubtle" />
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" fontWeight="bold" color="accentAlt">
                        Chase Steps (Manual)
                      </Text>
                      <Button
                        size="xs"
                        variant="outline"
                        color="success"
                        onClick={handleAddChaseStep}
                      >
                        <Plus size={12} /> New Step
                      </Button>
                    </HStack>
                    <List.Root fontSize="xs" mb={2} color="muted">
                      <List.Item>Chasing steps will also consuming your risk budget.</List.Item>
                      <List.Item>You could release your risk budget by closing them.</List.Item>
                    </List.Root>
                    <Grid
                      templateColumns="repeat(18, 1fr)"
                      gap={1}
                      mb={2}
                      fontSize="xs"
                      color="muted"
                    >
                      <GridItem colSpan={1}>#</GridItem>
                      <GridItem colSpan={3}>Price</GridItem>
                      <GridItem colSpan={2}>Size</GridItem>
                      <GridItem colSpan={3}>Est. Cost</GridItem>
                      <GridItem colSpan={2}>Fee</GridItem>
                      <GridItem colSpan={2}>Break Even</GridItem>
                      <GridItem colSpan={2}>Order</GridItem>
                      <GridItem colSpan={1}>Fill</GridItem>
                      <GridItem colSpan={1}>Close</GridItem>
                      <GridItem colSpan={1}>Remove</GridItem>
                    </Grid>
                    {position.chaseSteps.length === 0 ? (
                      <Text fontSize="xs" color="muted">
                        No chase steps yet.
                      </Text>
                    ) : (
                      position.chaseSteps.map((step, idx) => (
                        <Grid
                          key={step.id}
                          templateColumns="repeat(18, 1fr)"
                          gap={1}
                          mb={2}
                          alignItems="center"
                        >
                          <GridItem colSpan={1} fontSize="sm">
                            {idx + 1}
                          </GridItem>
                          <GridItem colSpan={3}>
                            <NumberInput
                              inputProps={{
                                color: 'fg',
                                'aria-label': `Chase Step ${idx + 1} Price`,
                              }}
                              key={`chase-${step.id}`}
                              size="sm"
                              w="90%"
                              min={0}
                              value={step.price.toString()}
                              disabled={step.isClosed}
                              onCommit={(raw) => {
                                const next = Number(raw);
                                if (!Number.isFinite(next)) return;
                                onUpdate((p) => {
                                  p.chaseSteps[idx].price = next;
                                  const setup = setups.find((s) => s.id === p.setupId);
                                  if (setup) {
                                    p.recalculateRiskDriven(setup, accountBalance, {
                                      makerFee,
                                      takerFee,
                                    });
                                  }
                                });
                              }}
                            />
                          </GridItem>
                          <GridItem colSpan={2}>
                            <NumberInput
                              inputProps={{
                                color: 'fg',
                                'aria-label': `Chase Step ${idx + 1} Size`,
                              }}
                              key={`chase-size-${step.id}`}
                              size="sm"
                              w="90%"
                              min={0}
                              value={step.size.toString()}
                              disabled={step.isClosed}
                              onCommit={(raw) => {
                                const next = Number(raw);
                                if (!Number.isFinite(next)) return;
                                onUpdate((p) => {
                                  p.chaseSteps[idx].size = next;
                                  const setup = setups.find((s) => s.id === p.setupId);
                                  if (setup) {
                                    p.recalculateRiskDriven(setup, accountBalance, {
                                      makerFee,
                                      takerFee,
                                    });
                                  }
                                });
                              }}
                            />
                          </GridItem>
                          <GridItem colSpan={3} color="accent">
                            <Text fontSize="xs">${step.cost.toFixed(4)}</Text>
                          </GridItem>
                          <GridItem colSpan={2}>
                            <Text fontSize="xs">{step.fee ? `$${step.fee.toFixed(4)}` : '-'}</Text>
                          </GridItem>
                          <GridItem colSpan={2}>
                            <Text fontSize="xs" color="danger">
                              {step.predictedBE?.toFixed(4) || '-'}
                            </Text>
                          </GridItem>
                          <GridItem colSpan={2}>
                            <Select.Root
                              size="xs"
                              collection={orderTypeCollection}
                              value={[step.orderType]}
                              onValueChange={(e) =>
                                onUpdate((p) => {
                                  p.chaseSteps[idx].orderType = (e.value[0] ||
                                    'taker') as OrderType;
                                  const setup = setups.find((s) => s.id === p.setupId);
                                  if (setup) {
                                    p.recalculateRiskDriven(setup, accountBalance, {
                                      makerFee,
                                      takerFee,
                                    });
                                  }
                                })
                              }
                            >
                              <Select.Control>
                                <Select.Trigger>
                                  <Select.ValueText />
                                  <Select.Indicator />
                                </Select.Trigger>
                              </Select.Control>
                              <Select.Positioner>
                                <Select.Content
                                  bg="surface"
                                  color="fg"
                                  borderColor="border"
                                  boxShadow="lg"
                                >
                                  {orderTypeCollection.items.map((item) => (
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
                              disabled={step.isClosed}
                              onCheckedChange={(e) =>
                                onUpdate((p) => {
                                  if (p.chaseSteps[idx].isClosed) return;
                                  p.chaseSteps[idx].isFilled = !!e.checked;
                                  if (!e.checked) {
                                    p.chaseSteps[idx].isClosed = false;
                                  }
                                  if (e.checked && p.status === 'planning') {
                                    p.status = 'opened';
                                  }

                                  const setup = setups.find((s) => s.id === p.setupId);
                                  if (setup) {
                                    p.recalculateRiskDriven(setup, accountBalance, {
                                      makerFee,
                                      takerFee,
                                    });
                                  }
                                })
                              }
                            >
                              <Checkbox.HiddenInput />
                              <Checkbox.Control />
                            </Checkbox.Root>
                          </GridItem>
                          <GridItem colSpan={1}>
                            {step.isClosed ? (
                              <Text fontSize="xs" color="muted">
                                Closed
                              </Text>
                            ) : (
                              <IconButton
                                aria-label="Close chase step"
                                size="xs"
                                variant="ghost"
                                disabled={!step.isFilled}
                                onClick={() =>
                                  onUpdate((p) => {
                                    const target = p.chaseSteps[idx];
                                    if (!target.isFilled || target.isClosed) return;
                                    target.isClosed = true;
                                    const setup = setups.find((s) => s.id === p.setupId);
                                    if (setup) {
                                      p.recalculateRiskDriven(setup, accountBalance, {
                                        makerFee,
                                        takerFee,
                                      });
                                    }
                                  })
                                }
                              >
                                <X size={12} />
                              </IconButton>
                            )}
                          </GridItem>
                          <GridItem colSpan={1}>
                            <IconButton
                              aria-label="Remove chase step"
                              size="xs"
                              variant="ghost"
                              onClick={() =>
                                onUpdate((p) => {
                                  p.chaseSteps.splice(idx, 1);
                                  const setup = setups.find((s) => s.id === p.setupId);
                                  if (setup) {
                                    p.recalculateRiskDriven(setup, accountBalance, {
                                      makerFee,
                                      takerFee,
                                    });
                                  }
                                })
                              }
                            >
                              <Trash size={12} />
                            </IconButton>
                          </GridItem>
                        </Grid>
                      ))
                    )}
                  </GridItem>

                  <GridItem colSpan={12}>
                    <Separator my={3} borderColor="borderSubtle" />
                    <HStack justify="space-between">
                      <HStack>
                        <Text fontSize="sm" color="muted">
                          Realized PnL (Net)
                        </Text>
                        <NumberInput
                          key={`pnl-${position.id}-${position.pnl ?? ''}`}
                          size="sm"
                          w="140px"
                          value={position.pnl?.toString() ?? ''}
                          onCommit={(raw) =>
                            onUpdate((p) => {
                              const trimmed = raw.trim();
                              if (
                                trimmed === '' ||
                                trimmed === '-' ||
                                trimmed === '.' ||
                                trimmed === '-.'
                              ) {
                                p.pnl = undefined;
                                return;
                              }
                              const next = Number(trimmed);
                              if (Number.isFinite(next)) {
                                p.pnl = next;
                              }
                            })
                          }
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
                        onClick={() =>
                          onUpdate((p) => {
                            p.status = 'closed';
                            p.closedAt = Date.now();
                          })
                        }
                      >
                        Close Position
                      </Button>
                    </HStack>
                  </GridItem>
                </Grid>
              </Card.Body>
            </Card.Root>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.ActionTrigger asChild>
              <Button variant="outline">Close</Button>
            </Dialog.ActionTrigger>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
