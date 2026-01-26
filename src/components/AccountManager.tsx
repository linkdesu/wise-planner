import { useState } from 'react';
import { Button, Table, Input, NumberInput, VStack, HStack, Card, Heading, IconButton, Flex } from '@chakra-ui/react';
import { Trash, Plus, Save } from 'lucide-react';
import { usePlanner } from '../hooks/usePlanner';
import { AccountModel } from '../models/AccountModel';

export function AccountManager () {
  const { accounts, positions, addAccount, updateAccount, deleteAccount } = usePlanner();
  const [isEditing, setIsEditing] = useState<string | null>(null);

  // Local state for the account being edited/created
  const [editData, setEditData] = useState<Partial<AccountModel>>({});

  const handleCreate = () => {
    const newAccount = new AccountModel({ name: 'New Account', initialBalance: 10000 });
    addAccount(newAccount);
    startEdit(newAccount);
  };

  const startEdit = (account: AccountModel) => {
    setIsEditing(account.id);
    setEditData({ ...account });
  };

  const saveEdit = () => {
    if (isEditing && editData) {
      // Reconstruct the full object to keep methods (or just update fields if using a specific update pattern,
      // but here we are replacing the object in store, so we should ensure it remains an AccountModel instance
      // or the store handles reconstruction. Our store expects AccountModel.
      // Let's create a new instance to be safe or mutate the existing one via store logic.

      // Better: We should probably fetch the original and update it.
      // For simplicity, re-instantiating works if constructor handles it.
      const original = accounts.find(a => a.id === isEditing);
      if (original) {
        original.name = editData.name!;
        original.initialBalance = Number(editData.initialBalance);
        original.takerFee = Number(editData.takerFee);
        original.makerFee = Number(editData.makerFee);
        // Re-calc stats in case balance changed manually?
        // Usually initialBalance changes, currentBalance should recalc from positions + initial.
        original.calculateStats(positions);
        updateAccount(original);
      }
      setIsEditing(null);
    }
  };

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="md" color="accent">Manage Accounts</Heading>
        <Button onClick={handleCreate}>
          <Plus size={16} />
          New Account
        </Button>
      </Flex>

      <Card.Root bg="surface" color="fg" borderColor="border">
        <Card.Body>
          <Table.Root variant="outline">
            <Table.Header bg="surface">
              <Table.Row>
                <Table.ColumnHeader color="muted">Name</Table.ColumnHeader>
                <Table.ColumnHeader color="muted" textAlign="end">Initial Balance</Table.ColumnHeader>
                <Table.ColumnHeader color="muted" textAlign="end">Current Balance</Table.ColumnHeader>
                <Table.ColumnHeader color="muted" textAlign="end">Taker Fee %</Table.ColumnHeader>
                <Table.ColumnHeader color="muted" textAlign="end">Maker Fee %</Table.ColumnHeader>
                <Table.ColumnHeader color="muted">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {accounts.map(account => (
                <Table.Row key={account.id}>
                  <Table.Cell>
                    {isEditing === account.id ? (
                      <Input
                        value={editData.name}
                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                      />
                    ) : account.name}
                  </Table.Cell>
                  <Table.Cell textAlign="end">
                    {isEditing === account.id ? (
                      <NumberInput.Root
                        value={editData.initialBalance?.toString() ?? ''}
                        onValueChange={(e) => setEditData({ ...editData, initialBalance: Number(e.value) })}
                      >
                        <NumberInput.Control />
                        <NumberInput.Input />
                      </NumberInput.Root>
                    ) : account.initialBalance.toFixed(2)}
                  </Table.Cell>
                  <Table.Cell textAlign="end" color={account.currentBalance >= account.initialBalance ? 'success' : 'danger'}>
                    {account.currentBalance.toFixed(2)}
                  </Table.Cell>
                  <Table.Cell textAlign="end">
                    {isEditing === account.id ? (
                      <NumberInput.Root
                        value={editData.takerFee?.toString() ?? ''}
                        step={0.0001}
                        onValueChange={(e) => setEditData({ ...editData, takerFee: Number(e.value) })}
                      >
                        <NumberInput.Control />
                        <NumberInput.Input />
                      </NumberInput.Root>
                    ) : (account.takerFee * 100).toFixed(4) + '%'}
                  </Table.Cell>
                  <Table.Cell textAlign="end">
                    {isEditing === account.id ? (
                      <NumberInput.Root
                        value={editData.makerFee?.toString() ?? ''}
                        step={0.0001}
                        onValueChange={(e) => setEditData({ ...editData, makerFee: Number(e.value) })}
                      >
                        <NumberInput.Control />
                        <NumberInput.Input />
                      </NumberInput.Root>
                    ) : (account.makerFee * 100).toFixed(4) + '%'}
                  </Table.Cell>
                  <Table.Cell>
                    <HStack gap={2}>
                      {isEditing === account.id ? (
                        <Button size="sm" onClick={saveEdit}>
                          <Save size={14} />
                          Save
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" color="accent"
                          onClick={() => startEdit(account)}>Edit</Button>
                      )}
                      <IconButton
                        aria-label="Delete"
                        size="sm"
                        color="danger"
                        variant="ghost"
                        onClick={() => deleteAccount(account.id)}
                        disabled={accounts.length === 1} // Prevent deleting last account
                      >
                        <Trash size={14} />
                      </IconButton>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card.Body>
      </Card.Root>
    </VStack>
  );
}
