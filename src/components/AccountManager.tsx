import { useState } from 'react';
import { Button, Table, Thead, Tbody, Tr, Th, Td, Input, NumberInput, NumberInputField, VStack, HStack, Card, CardBody, Heading, IconButton } from '@chakra-ui/react';
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
    <VStack spacing={6} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="md" color="monokai.orange">Manage Accounts</Heading>
        <Button leftIcon={<Plus size={16} />} onClick={handleCreate}>New Account</Button>
      </Flex>

      <Card>
        <CardBody>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th color="monokai.gray.300">Name</Th>
                <Th color="monokai.gray.300" isNumeric>Initial Balance</Th>
                <Th color="monokai.gray.300" isNumeric>Current Balance</Th>
                <Th color="monokai.gray.300" isNumeric>Taker Fee %</Th>
                <Th color="monokai.gray.300" isNumeric>Maker Fee %</Th>
                <Th color="monokai.gray.300">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {accounts.map(account => (
                <Tr key={account.id}>
                  <Td>
                    {isEditing === account.id ? (
                      <Input
                        value={editData.name}
                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                      />
                    ) : account.name}
                  </Td>
                  <Td isNumeric>
                    {isEditing === account.id ? (
                      <NumberInput value={editData.initialBalance} onChange={(_, v) => setEditData({ ...editData, initialBalance: v })}>
                        <NumberInputField />
                      </NumberInput>
                    ) : account.initialBalance.toFixed(2)}
                  </Td>
                  <Td isNumeric color={account.currentBalance >= account.initialBalance ? 'monokai.green' : 'monokai.pink'}>
                    {account.currentBalance.toFixed(2)}
                  </Td>
                  <Td isNumeric>
                    {isEditing === account.id ? (
                      <NumberInput value={editData.takerFee} step={0.0001} onChange={(_, v) => setEditData({ ...editData, takerFee: v })}>
                        <NumberInputField />
                      </NumberInput>
                    ) : (account.takerFee * 100).toFixed(4) + '%'}
                  </Td>
                  <Td isNumeric>
                    {isEditing === account.id ? (
                      <NumberInput value={editData.makerFee} step={0.0001} onChange={(_, v) => setEditData({ ...editData, makerFee: v })}>
                        <NumberInputField />
                      </NumberInput>
                    ) : (account.makerFee * 100).toFixed(4) + '%'}
                  </Td>
                  <Td>
                    <HStack>
                      {isEditing === account.id ? (
                        <Button size="sm" leftIcon={<Save size={14} />} onClick={saveEdit}>Save</Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => startEdit(account)}>Edit</Button>
                      )}
                      <IconButton
                        aria-label="Delete"
                        icon={<Trash size={14} />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => deleteAccount(account.id)}
                        isDisabled={accounts.length === 1} // Prevent deleting last account
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </VStack>
  );
}

import { Flex } from '@chakra-ui/react';
