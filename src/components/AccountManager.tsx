import { Button, Card, Dialog, Flex, Heading, HStack, IconButton, Table, Text, VStack } from '@chakra-ui/react';
import { Edit, Plus, Trash } from 'lucide-react';
import { useMemo, useState } from 'react';
import { usePlanner } from '../hooks/usePlanner';
import { AccountModel } from '../models/AccountModel';
import { AccountEditor } from './AccountEditor';
import dayjs from 'dayjs';
import { DATETIME_FORMAT } from '../const';

export function AccountManager () {
  const { accounts, positions, accountChanges, addAccount, deleteAccount } = usePlanner();
  const [pendingDeleteAccountId, setPendingDeleteAccountId] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const pendingDeleteAccount =
    accounts.find((account) => account.id === pendingDeleteAccountId) || null;
  const pendingDeletePositionCount = pendingDeleteAccount
    ? positions.filter((position) => position.accountId === pendingDeleteAccount.id).length
    : 0;

  const accountChangeTotals = useMemo(() => {
    const totals = new Map<string, { wins: number; losses: number }>();
    accountChanges.forEach((change) => {
      const entry = totals.get(change.accountId) || { wins: 0, losses: 0 };
      if (change.type === 'win') entry.wins += Number(change.amount) || 0;
      if (change.type === 'loss') entry.losses += Number(change.amount) || 0;
      totals.set(change.accountId, entry);
    });
    return totals;
  }, [accountChanges]);

  const handleCreate = () => {
    const newAccount = new AccountModel({ name: 'New Account', initialBalance: 10000 });
    addAccount(newAccount);
    setEditingAccountId(newAccount.id);
  };

  const now = Date.now();
  const oneDayCutoff = now - 24 * 60 * 60 * 1000;
  const sevenDayCutoff = now - 7 * 24 * 60 * 60 * 1000;

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
          <Heading size="md" color="accent">
            Manage Accounts
          </Heading>
          <Button onClick={handleCreate} color="success" bg={{ _hover: 'surfaceSubtle' }}>
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
                  <Table.ColumnHeader color="muted" textAlign="end">
                    Initial Balance
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="muted" textAlign="end">
                    Current Balance
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="muted" textAlign="end">
                    Win Rate
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="muted" textAlign="end">
                    1d Δ (pos)
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="muted" textAlign="end">
                    7d Δ (pos)
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="muted" textAlign="end">
                    Manual Wins
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="muted" textAlign="end">
                    Manual Losses
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="muted" textAlign="end">
                    Taker Fee %
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="muted" textAlign="end">
                    Maker Fee %
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="muted">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {[...accounts].reverse().map((account) => {
                  console.groupCollapsed(`Summary for ${account.name}`);

                  const accountPositions = positions.filter(
                    (position) =>
                      position.accountId === account.id &&
                      position.status === 'closed' &&
                      position.pnl !== undefined
                  );
                  const wins = accountPositions.filter((position) => (position.pnl || 0) > 0).length;
                  const total = accountPositions.length;
                  const winRate = total > 0 ? (wins / total) * 100 : 0;
                  console.log(`winRate: ${winRate} = ${wins} / ${total}`);

                  const oneDayDelta = accountPositions.reduce((sum, position) => {
                    if (!position.closedAt || position.closedAt < oneDayCutoff) return sum;

                    console.log(`  Add position ${position.closedAt} with pnl ${position.pnl}`);
                    return sum + (position.pnl || 0);
                  }, 0);
                  console.log(`oneDayDelta: ${oneDayDelta}`);

                  const sevenDayDelta = accountPositions.reduce((sum, position) => {
                    if (!position.closedAt || position.closedAt < sevenDayCutoff) return sum;

                    console.log(`  Add position ${dayjs(position.closedAt).format(DATETIME_FORMAT)} with pnl ${position.pnl}`);
                    return sum + (position.pnl || 0);
                  }, 0);
                  console.log(`sevenDayDelta: ${sevenDayDelta}`);

                  const manualTotals = accountChangeTotals.get(account.id) || {
                    wins: 0,
                    losses: 0,
                  };

                  console.groupEnd();

                  return (
                    <Table.Row key={account.id}>
                      <Table.Cell>
                        {account.name}
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        {account.initialBalance.toFixed(2)}
                      </Table.Cell>
                      <Table.Cell
                        textAlign="end"
                        color={
                          account.currentBalance >= account.initialBalance ? 'success' : 'danger'
                        }
                      >
                        {account.currentBalance.toFixed(2)}
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        {winRate.toFixed(1)}%
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        {oneDayDelta.toFixed(2)}
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        {sevenDayDelta.toFixed(2)}
                      </Table.Cell>
                      <Table.Cell textAlign="end">{manualTotals.wins.toFixed(2)}</Table.Cell>
                      <Table.Cell textAlign="end">{manualTotals.losses.toFixed(2)}</Table.Cell>
                      <Table.Cell textAlign="end">
                        {(account.takerFee * 100).toFixed(4)}%
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        {(account.makerFee * 100).toFixed(4)}%
                      </Table.Cell>
                      <Table.Cell>
                        <HStack gap={2}>
                          <Button
                            size="sm"
                            variant="ghost"
                            color="info"
                            bg={{ _hover: 'surfaceSubtle' }}
                            onClick={() => setEditingAccountId(account.id)}
                          >
                            <Edit size={14} />
                            Edit
                          </Button>
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
                  );
                })}
              </Table.Body>
            </Table.Root>
            <Text color="muted" fontSize="sm" mt={4}>
              1d/7d deltas and win rate are based on closed positions only (using closedAt).
            </Text>
          </Card.Body>
        </Card.Root>
      </VStack>

      <AccountEditor
        accountId={editingAccountId}
        open={Boolean(editingAccountId)}
        onClose={() => setEditingAccountId(null)}
      />

      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content bg="surface" color="fg" borderColor="border">
          <Dialog.Header>
            <Dialog.Title>Delete Account</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <VStack align="start" gap={2}>
              <Text>
                This will delete the account
                {pendingDeleteAccount ? ` "${pendingDeleteAccount.name}"` : ''} and all positions of
                this account.
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
