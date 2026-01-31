import {
  Button,
  Card,
  Dialog,
  Field,
  Flex,
  HStack,
  IconButton,
  Input,
  Popover,
  Pagination,
  Select,
  Table,
  Text,
  Textarea,
  VStack,
  createListCollection,
} from '@chakra-ui/react';
import { ChevronLeft, ChevronRight, Plus, Trash } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePlanner } from '../hooks/usePlanner';
import { AccountChangeModel } from '../models/AccountChangeModel';
import { NumberInput, type NumberInputHandle } from './ui/NumberInput';
import dayjs from 'dayjs';
import { DATETIME_FORMAT } from '../const';

const changeTypeCollection = createListCollection({
  items: [
    { label: 'Deposit', value: 'deposit' },
    { label: 'Withdraw', value: 'withdraw' },
    { label: 'Win', value: 'win' },
    { label: 'Loss', value: 'loss' },
  ],
});

type AccountEditorProps = {
  accountId: string | null;
  open: boolean;
  onClose: () => void;
};

export function AccountEditor ({ accountId, open, onClose }: AccountEditorProps) {
  const {
    accounts,
    positions,
    accountChanges,
    updateAccount,
    addAccountChange,
    deleteAccountChange,
  } = usePlanner();
  const account = accounts.find((item) => item.id === accountId) || null;
  const [error, setError] = useState<string>('');
  const [editName, setEditName] = useState('');
  const [editInitialBalance, setEditInitialBalance] = useState<number>(0);
  const [editTakerFee, setEditTakerFee] = useState<number>(0);
  const [editMakerFee, setEditMakerFee] = useState<number>(0);

  const [newType, setNewType] = useState<string>('deposit');
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newNote, setNewNote] = useState<string>('');
  const [newCreatedAt, setNewCreatedAt] = useState<string>('');
  const newAmountRef = useRef<NumberInputHandle>(null);
  const [changePage, setChangePage] = useState(1);
  const changePageSize = 5;

  const accountChangeRows = useMemo(() => {
    if (!accountId) return [] as AccountChangeModel[];
    return accountChanges
      .filter((change) => change.accountId === accountId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [accountChanges, accountId]);
  const pagedAccountChanges = useMemo(() => {
    const start = (changePage - 1) * changePageSize;
    return accountChangeRows.slice(start, start + changePageSize);
  }, [accountChangeRows, changePage]);

  useEffect(() => {
    if (!account || !open) return;
    setEditName(account.name);
    setEditInitialBalance(account.initialBalance);
    setEditTakerFee(account.takerFee);
    setEditMakerFee(account.makerFee);
    setError('');
  }, [account, open]);

  useEffect(() => {
    if (!open) return;
    setNewType('deposit');
    setNewAmount(0);
    setNewNote('');
    setNewCreatedAt(dayjs().format(DATETIME_FORMAT));
    newAmountRef.current?.resetValue(0);
  }, [open]);
  useEffect(() => {
    setChangePage(1);
  }, [accountId, accountChangeRows.length]);

  const handleSaveAccount = () => {
    if (!account) return;
    const nextInitial = Number(editInitialBalance);
    const nextTaker = Number(editTakerFee);
    const nextMaker = Number(editMakerFee);
    if (!Number.isFinite(nextInitial) || !Number.isFinite(nextTaker) || !Number.isFinite(nextMaker)) {
      setError('Please enter valid numbers for account fields.');
      return;
    }
    account.name = editName || 'Unnamed Account';
    account.initialBalance = nextInitial;
    account.takerFee = nextTaker;
    account.makerFee = nextMaker;
    account.calculateStats(positions, accountChanges);
    if (account.currentBalance < 0) {
      setError('Account balance cannot be below 0.');
      return;
    }
    updateAccount(account);
    onClose();
  };

  const handleAddChange = () => {
    if (!account) return;
    const amount = Number(newAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Change amount must be greater than 0.');
      return;
    }
    const parsedDate = Date.parse(newCreatedAt);
    if (Number.isNaN(parsedDate)) {
      setError('Please enter a valid date/time.');
      return;
    }
    const change = new AccountChangeModel({
      accountId: account.id,
      type: newType as AccountChangeModel['type'],
      amount,
      note: newNote,
      createdAt: parsedDate,
    });
    const ok = addAccountChange(change);
    if (!ok) {
      setError('This change would drop the account balance below 0.');
      return;
    }
    setError('');
    setNewAmount(0);
    setNewNote('');
    setNewType('deposit');
    setNewCreatedAt(dayjs().format(DATETIME_FORMAT));
    newAmountRef.current?.resetValue(0);
  };

  const handleDeleteChange = (change: AccountChangeModel) => {
    const ok = deleteAccountChange(change.id);
    if (!ok) {
      setError('This change would drop the account balance below 0.');
      return;
    }
    setError('');
  };

  return (
    <Dialog.Root open={open} onOpenChange={({ open: nextOpen }) => !nextOpen && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content bg="surface" color="fg" borderColor="border" minW={{ base: 'auto', md: '720px' }}>
          <Dialog.Header>
            <Dialog.Title>Edit Account</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            {!account ? (
              <Text color="muted">No account selected.</Text>
            ) : (
              <VStack align="stretch" gap={6}>
                <Card.Root bg="surfaceSubtle" borderColor="border">
                  <Card.Body>
                    <VStack align="flex-start">
                      <Field.Root>
                        <Field.Label>Name</Field.Label>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>Initial Balance</Field.Label>
                        <NumberInput
                          value={editInitialBalance.toString()}
                          onCommit={(raw) => setEditInitialBalance(Number(raw))}
                        />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>Taker Fee</Field.Label>
                        <NumberInput
                          value={editTakerFee.toString()}
                          step={0.0001}
                          onCommit={(raw) => setEditTakerFee(Number(raw))}
                        />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label>Maker Fee</Field.Label>
                        <NumberInput
                          value={editMakerFee.toString()}
                          step={0.0001}
                          onCommit={(raw) => setEditMakerFee(Number(raw))}
                        />
                      </Field.Root>
                      <Button colorPalette="green" onClick={handleSaveAccount} disabled={!account}>
                        Save Account
                      </Button>
                    </VStack>
                  </Card.Body>
                </Card.Root>

                <Card.Root bg="surface" borderColor="border">
                  <Card.Body>
                    <VStack gap={4} maxW="100%" w="100%">
                      <Flex alignSelf={"flex-start"}>
                        <Text fontWeight="semibold">Account Changes</Text>
                      </Flex>
                      <VStack gap={3} align="flex-start" w="100%">
                        <Field.Root>
                          <Field.Label>Type</Field.Label>
                          <Select.Root
                            size="sm"
                            w="240px"
                            collection={changeTypeCollection}
                            value={[newType]}
                            onValueChange={(e) => setNewType(e.value[0] || 'deposit')}
                          >
                            <Select.Control>
                              <Select.Trigger>
                                <Select.ValueText placeholder="Select type" />
                                <Select.Indicator />
                              </Select.Trigger>
                            </Select.Control>
                            <Select.Positioner>
                              <Select.Content bg="surface" color="fg" borderColor="border">
                                {changeTypeCollection.items.map((item) => (
                                  <Select.Item item={item} key={item.value}>
                                    <Select.ItemText>{item.label}</Select.ItemText>
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Positioner>
                          </Select.Root>
                        </Field.Root>
                        <Field.Root>
                          <Field.Label>Amount</Field.Label>
                          <NumberInput
                            ref={newAmountRef}
                            w="240px"
                            value={newAmount.toString()}
                            onCommit={(raw) => setNewAmount(Number(raw))}
                          />
                        </Field.Root>
                        <Field.Root>
                          <Field.Label>Date</Field.Label>
                          <Input
                            w="240px"
                            value={newCreatedAt}
                            onChange={(e) => setNewCreatedAt(e.target.value)}
                          />
                        </Field.Root>
                        <Field.Root flex="1">
                          <Field.Label>Note</Field.Label>
                          <Textarea
                            value={newNote}
                            maxLength={200}
                            onChange={(e) => setNewNote(e.target.value)}
                          />
                        </Field.Root>
                        <Button onClick={handleAddChange} color="success" minW="120px">
                          <Plus size={14} />
                          Add Change
                        </Button>
                      </VStack>

                      <Card.Root bg="transparent" borderWidth="0">
                        <Card.Body p={0}>
                          <Flex maxW="100%" overflowX="auto">
                            <Table.Root variant="outline" w="100%" tableLayout="fixed" minW="640px">
                              <Table.Header bg="surface">
                                <Table.Row>
                                  <Table.ColumnHeader color="muted" width="120px">
                                    Type
                                  </Table.ColumnHeader>
                                  <Table.ColumnHeader color="muted" textAlign="end" width="120px">
                                    Amount
                                  </Table.ColumnHeader>
                                  <Table.ColumnHeader color="muted" textAlign="end" width="140px">
                                    Date
                                  </Table.ColumnHeader>
                                  <Table.ColumnHeader color="muted" width="200px">
                                    Actions
                                  </Table.ColumnHeader>
                                </Table.Row>
                              </Table.Header>
                              <Table.Body>
                                {accountChangeRows.length === 0 && (
                                  <Table.Row>
                                    <Table.Cell colSpan={4}>
                                      <Text color="muted">No manual changes yet.</Text>
                                    </Table.Cell>
                                  </Table.Row>
                                )}
                                {pagedAccountChanges.map((change) => (
                                  <Table.Row key={change.id}>
                                    <Table.Cell>
                                      <Popover.Root>
                                        <Popover.Trigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            color="info"
                                            disabled={!change.note}
                                          >
                                            {change.type}
                                          </Button>
                                        </Popover.Trigger>
                                        {change.note ? (
                                          <Popover.Positioner>
                                            <Popover.Content bg="surface" color="fg" borderColor="border">
                                              <Popover.Arrow />
                                              <Popover.Body>
                                                <Text whiteSpace="pre-wrap">{change.note}</Text>
                                              </Popover.Body>
                                            </Popover.Content>
                                          </Popover.Positioner>
                                        ) : null}
                                      </Popover.Root>
                                    </Table.Cell>
                                    <Table.Cell textAlign="end">{change.amount.toFixed(2)}</Table.Cell>
                                    <Table.Cell textAlign="end">
                                      {dayjs(change.createdAt).format(DATETIME_FORMAT)}
                                    </Table.Cell>
                                    <Table.Cell>
                                      <HStack gap={2}>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          color="danger"
                                          onClick={() => handleDeleteChange(change)}
                                        >
                                          <Trash size={14} />
                                          Delete
                                        </Button>
                                      </HStack>
                                    </Table.Cell>
                                  </Table.Row>
                                ))}
                              </Table.Body>
                            </Table.Root>
                          </Flex>
                        </Card.Body>
                      </Card.Root>

                      {accountChangeRows.length > changePageSize && (
                        <Pagination.Root
                          count={accountChangeRows.length}
                          pageSize={changePageSize}
                          page={changePage}
                          onPageChange={(details) => setChangePage(details.page)}
                        >
                          <HStack justify="space-between" align="center">
                            <Text as="div" fontSize="sm" color="muted">
                              <Pagination.PageText format="short" color="monokai.gray.300" />
                            </Text>
                            <HStack>
                              <Pagination.PrevTrigger asChild>
                                <IconButton variant="ghost" color="muted" aria-label="Previous page">
                                  <ChevronLeft />
                                </IconButton>
                              </Pagination.PrevTrigger>
                              <Pagination.Items
                                render={(page) => (
                                  <Button
                                    variant="ghost"
                                    key={`account-changes-page-${page.value}`}
                                    size="sm"
                                    color={page.value === changePage ? 'accentAlt' : 'muted'}
                                  >
                                    {page.value}
                                  </Button>
                                )}
                              />
                              <Pagination.NextTrigger asChild>
                                <IconButton variant="ghost" color="muted" aria-label="Next page">
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

                {error ? <Text color="danger">{error}</Text> : null}
              </VStack>
            )}
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
