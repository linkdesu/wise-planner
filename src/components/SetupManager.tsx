import {
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Heading,
  HStack,
  IconButton,
  Input,
  Table,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import { Edit, Info, Plus, Save, Trash } from 'lucide-react';
import { useState } from 'react';
import { usePlanner } from '../hooks/usePlanner';
import { SetupModel } from '../models/SetupModel';

export function SetupManager() {
  const { setups, addSetup, updateSetup, deleteSetup } = usePlanner();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    id: string;
    name: string;
    resizingTimes: number;
    ratiosStr: string;
  } | null>(null);
  const [pendingDeleteSetupId, setPendingDeleteSetupId] = useState<string | null>(null);

  const activeSetups = setups.filter((setup) => !setup.isDeleted);
  const pendingDeleteSetup = setups.find((setup) => setup.id === pendingDeleteSetupId) || null;

  const handleCreate = () => {
    const newSetup = new SetupModel({
      name: 'New Strategy',
      resizingTimes: 2,
      resizingRatios: [1, 1],
    });
    addSetup(newSetup);
    startEdit(newSetup);
  };

  const startEdit = (setup: SetupModel) => {
    setIsEditing(setup.id);
    setEditData({
      id: setup.id,
      name: setup.name,
      resizingTimes: setup.resizingTimes,
      ratiosStr: setup.resizingRatios.join(', '),
    });
  };

  const saveEdit = () => {
    if (isEditing && editData) {
      const ratios = editData.ratiosStr
        .split(',')
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);

      // Validation handled by model somewhat, but let's enforce times match logic
      // If user typed 3 ratios but kept times at 2, we update times?
      // Or strictly strictly follow times?
      // Let's autosync times to ratios length if ratios are provided validly.
      const times = ratios.length > 0 ? ratios.length : editData.resizingTimes;

      const updated = new SetupModel({
        id: editData.id,
        name: editData.name,
        resizingTimes: times,
        resizingRatios: ratios,
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
    <Dialog.Root
      open={Boolean(pendingDeleteSetup)}
      onOpenChange={({ open }) => {
        if (!open) setPendingDeleteSetupId(null);
      }}
      role="alertdialog"
    >
      <VStack gap={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="md" color="accent">
            Resizing Setups
          </Heading>
          <Button onClick={handleCreate} color="success">
            <Plus size={16} />
            New Setup
          </Button>
        </Flex>

        <Box
          p={4}
          bg="surface"
          borderRadius="md"
          fontSize="sm"
          color="muted"
          borderColor="border"
          borderWidth="1px"
        >
          <Text fontWeight="bold" mb={2} color="accentAlt">
            Tip: Understanding Cost Ratios
          </Text>
          <Text>Ratios determine how your total notional cost is distributed across entries.</Text>
          <Text>
            Example: <b>1 : 1 : 2</b> means the first entry uses 1/4 of cost, second uses 1/4, and
            third uses 2/4 (50%).
          </Text>
        </Box>

        <Card.Root bg="surface" color="fg" borderColor="border">
          <Card.Body>
            <Table.Root variant="outline">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader color="muted">Strategy Name</Table.ColumnHeader>
                  <Table.ColumnHeader color="muted" textAlign="center">
                    Steps
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="muted">
                    <HStack gap={2} justify="center">
                      <Text>Cost Ratios</Text>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <Box as="span" display="inline-flex">
                            <Info size={14} />
                          </Box>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          Comma separated values relative to each other (e.g. '1, 1, 2' means 25%,
                          25%, 50% of notional cost)
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </HStack>
                  </Table.ColumnHeader>
                  <Table.ColumnHeader color="muted">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {activeSetups.reverse().map((setup) => (
                  <Table.Row key={setup.id}>
                    <Table.Cell>
                      {isEditing === setup.id ? (
                        <Input
                          value={editData?.name}
                          onChange={(e) =>
                            setEditData((prev) => (prev ? { ...prev, name: e.target.value } : null))
                          }
                        />
                      ) : (
                        setup.name
                      )}
                    </Table.Cell>
                    <Table.Cell textAlign="center">{setup.resizingTimes}</Table.Cell>
                    <Table.Cell textAlign="center">
                      {isEditing === setup.id ? (
                        <Input
                          value={editData?.ratiosStr}
                          onChange={(e) =>
                            setEditData((prev) =>
                              prev ? { ...prev, ratiosStr: e.target.value } : null
                            )
                          }
                          placeholder="e.g. 1, 1, 2"
                        />
                      ) : (
                        setup.resizingRatios.join(' : ')
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <HStack gap={2}>
                        {isEditing === setup.id ? (
                          <Button size="sm" variant="ghost" color="success" onClick={saveEdit}>
                            <Save size={14} />
                            Save
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            color="info"
                            onClick={() => startEdit(setup)}
                          >
                            <Edit size={14} />
                            Edit
                          </Button>
                        )}
                        <IconButton
                          aria-label="Delete"
                          size="sm"
                          px="3"
                          variant="ghost"
                          color="danger"
                          onClick={() => setPendingDeleteSetupId(setup.id)}
                          disabled={activeSetups.length === 1}
                        >
                          <Trash size={14} />
                          Delete
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
            <Dialog.Title>Delete Setup</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <VStack align="start" gap={2}>
              <Text>
                This will remove the setup
                {pendingDeleteSetup ? ` "${pendingDeleteSetup.name}"` : ''} from active use.
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
                if (!pendingDeleteSetup) return;
                deleteSetup(pendingDeleteSetup.id);
                setPendingDeleteSetupId(null);
              }}
            >
              Delete Setup
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
