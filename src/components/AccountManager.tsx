import { useState } from 'react';
import { Button, Table, Input, VStack, HStack, Card, Heading, IconButton, Flex, Dialog, Text } from '@chakra-ui/react';
import { Trash, Plus, Save, Edit } from 'lucide-react';
import { usePlanner } from '../hooks/usePlanner';
import { AccountModel } from '../models/AccountModel';
import { NumberInput } from './ui/NumberInput';

export function AccountManager () {
  const { accounts, positions, addAccount, updateAccount, deleteAccount } = usePlanner();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [pendingDeleteAccountId, setPendingDeleteAccountId] = useState<string | null>(null);

  // Local state for the account being edited/created
  const [editData, setEditData] = useState<Partial<AccountModel>>({});

  const pendingDeleteAccount = accounts.find(account => account.id === pendingDeleteAccountId) || null;
  const pendingDeletePositionCount = pendingDeleteAccount
    ? positions.filter(position => position.accountId === pendingDeleteAccount.id).length
    : 0;

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
    <Dialog.Root
      open={Boolean(pendingDeleteAccount)}
      onOpenChange={({ open }) => {
        if (!open) setPendingDeleteAccountId(null);
      }}
      role="alertdialog"
    >
      <VStack gap={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="md" color="accent">Manage Accounts</Heading>
          <Button onClick={handleCreate} color="success" bg={{ _hover: "surfaceSubtle" }}>
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
                {accounts.reverse().map(account => (
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
                        <NumberInput
                          key={`initial-${editData.initialBalance ?? account.initialBalance}`}
                          value={editData.initialBalance?.toString() ?? account.initialBalance.toString()}
                          onCommit={(raw) => {
                            const next = Number(raw);
                            if (Number.isFinite(next)) {
                              setEditData({ ...editData, initialBalance: next });
                            }
                          }}
                        />
                      ) : account.initialBalance.toFixed(2)}
                    </Table.Cell>
                    <Table.Cell textAlign="end" color={account.currentBalance >= account.initialBalance ? 'success' : 'danger'}>
                      {account.currentBalance.toFixed(2)}
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      {isEditing === account.id ? (
                        <NumberInput
                          key={`taker-${editData.takerFee ?? account.takerFee}`}
                          value={editData.takerFee?.toString() ?? account.takerFee.toString()}
                          step={0.0001}
                          onCommit={(raw) => {
                            const next = Number(raw);
                            if (Number.isFinite(next)) {
                              setEditData({ ...editData, takerFee: next });
                            }
                          }}
                        />
                      ) : (account.takerFee * 100).toFixed(4) + '%'}
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      {isEditing === account.id ? (
                        <NumberInput
                          key={`maker-${editData.makerFee ?? account.makerFee}`}
                          value={editData.makerFee?.toString() ?? account.makerFee.toString()}
                          step={0.0001}
                          onCommit={(raw) => {
                            const next = Number(raw);
                            if (Number.isFinite(next)) {
                              setEditData({ ...editData, makerFee: next });
                            }
                          }}
                        />
                      ) : (account.makerFee * 100).toFixed(4) + '%'}
                    </Table.Cell>
                    <Table.Cell>
                      <HStack gap={2}>
                        {isEditing === account.id ? (
                          <Button size="sm" variant="ghost" color="success" onClick={saveEdit}>
                            <Save size={14} />
                            Save
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" color="info" bg={{ _hover: "surfaceSubtle" }}
                            onClick={() => startEdit(account)}><Edit size={14} />Edit</Button>
                        )}
                        <IconButton
                          aria-label="Delete"
                          size="sm"
                          px="3"
                          color="danger"
                          variant="ghost"
                          onClick={() => setPendingDeleteAccountId(account.id)}
                          disabled={accounts.length === 1} // Prevent deleting last account
                        >
                          <Trash size={14} /> Delete
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

      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content bg="surface" color="fg" borderColor="border">
          <Dialog.Header>
            <Dialog.Title>Delete Account</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <VStack align="start" gap={2}>
              <Text>
                This will delete the account{pendingDeleteAccount ? ` "${pendingDeleteAccount.name}"` : ''} and all positions of this account.
              </Text>
              <Text color="danger">
                Related positions to be deleted: {pendingDeletePositionCount}
              </Text>
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.ActionTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </Dialog.ActionTrigger>
            <Button
              colorPalette="red"
              onClick={() => {
                if (!pendingDeleteAccount) return;
                deleteAccount(pendingDeleteAccount.id);
                setPendingDeleteAccountId(null);
              }}
            >
              Delete Account
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
