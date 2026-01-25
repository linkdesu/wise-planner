import { useState } from 'react';
import { Button, Table, Thead, Tbody, Tr, Th, Td, Input, VStack, HStack, Card, CardBody, Heading, IconButton, Text, Tooltip, Flex, Box } from '@chakra-ui/react';
import { Trash, Plus, Save, Info } from 'lucide-react';
import { usePlanner } from '../hooks/usePlanner';
import { SetupModel } from '../models/SetupModel';

export function SetupManager () {
  const { setups, addSetup, updateSetup, deleteSetup } = usePlanner();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ id: string, name: string, resizingTimes: number, ratiosStr: string } | null>(null);

  const handleCreate = () => {
    const newSetup = new SetupModel({ name: 'New Strategy', resizingTimes: 2, resizingRatios: [1, 1] });
    addSetup(newSetup);
    startEdit(newSetup);
  };

  const startEdit = (setup: SetupModel) => {
    setIsEditing(setup.id);
    setEditData({
      id: setup.id,
      name: setup.name,
      resizingTimes: setup.resizingTimes,
      ratiosStr: setup.resizingRatios.join(', ')
    });
  };

  const saveEdit = () => {
    if (isEditing && editData) {
      const ratios = editData.ratiosStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);

      // Validation handled by model somewhat, but let's enforce times match logic
      // If user typed 3 ratios but kept times at 2, we update times?
      // Or strictly strictly follow times?
      // Let's autosync times to ratios length if ratios are provided validly.
      const times = ratios.length > 0 ? ratios.length : editData.resizingTimes;

      const updated = new SetupModel({
        id: editData.id,
        name: editData.name,
        resizingTimes: times,
        resizingRatios: ratios
      });

      // Ensure valid state
      if (updated.validate()) {
        updateSetup(updated);
        setIsEditing(null);
        setEditData(null);
      } else {
        alert('Invalid Setup: Ensure ratios count matches times and all are positive numbers.');
      }
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="md" color="monokai.purple">Resizing Setups</Heading>
        <Button leftIcon={<Plus size={16} />} onClick={handleCreate}>New Setup</Button>
      </Flex>

      <Card>
        <CardBody>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th color="monokai.gray.300">Strategy Name</Th>
                <Th color="monokai.gray.300" isNumeric>Steps</Th>
                <Th color="monokai.gray.300">
                  <HStack>
                    <Text>Ratios</Text>
                    <Tooltip label="Comma separated values relative to each other (e.g. '1, 1, 2' means 25%, 25%, 50% risk)">
                      <Info size={14} />
                    </Tooltip>
                  </HStack>
                </Th>
                <Th color="monokai.gray.300">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {setups.map(setup => (
                <Tr key={setup.id}>
                  <Td>
                    {isEditing === setup.id ? (
                      <Input
                        value={editData?.name}
                        onChange={e => setEditData(prev => prev ? { ...prev, name: e.target.value } : null)}
                      />
                    ) : setup.name}
                  </Td>
                  <Td isNumeric>
                    {setup.resizingTimes}
                  </Td>
                  <Td>
                    {isEditing === setup.id ? (
                      <Input
                        value={editData?.ratiosStr}
                        onChange={e => setEditData(prev => prev ? { ...prev, ratiosStr: e.target.value } : null)}
                        placeholder="e.g. 1, 1, 2"
                      />
                    ) : setup.resizingRatios.join(' : ')}
                  </Td>
                  <Td>
                    <HStack>
                      {isEditing === setup.id ? (
                        <Button size="sm" leftIcon={<Save size={14} />} onClick={saveEdit}>Save</Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => startEdit(setup)}>Edit</Button>
                      )}
                      <IconButton
                        aria-label="Delete"
                        icon={<Trash size={14} />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => deleteSetup(setup.id)}
                        isDisabled={setups.length === 1}
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>

      <Box p={4} bg="monokai.gray.100" borderRadius="md" fontSize="sm" color="monokai.gray.300">
        <Text fontWeight="bold" mb={2} color="monokai.yellow">Tip: Understanding Ratios</Text>
        <Text>Ratios determine how your total risk is distributed across entries.</Text>
        <Text>Example: <b>1 : 1 : 2</b> means the first entry takes 1/4 of risk, second takes 1/4, and third takes 2/4 (50%).</Text>
      </Box>
    </VStack>
  );
}

