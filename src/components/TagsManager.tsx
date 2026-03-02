import {
  Badge,
  Box,
  Button,
  Card,
  createListCollection,
  Field,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  IconButton,
  Input,
  Select,
  Switch,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react';
import { ArrowDown, ArrowUp, Edit, Plus, Save, Trash } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { usePlanner } from '../hooks/usePlanner';
import { TagFieldModel } from '../models/TagFieldModel';
import { TagValueModel } from '../models/TagValueModel';

export function TagsManager() {
  const {
    tagFields,
    tagValues,
    addTagField,
    updateTagField,
    deleteTagField,
    addTagValue,
    updateTagValue,
    deleteTagValue,
  } = usePlanner();
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldName, setEditingFieldName] = useState('');
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [editingValueLabel, setEditingValueLabel] = useState('');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(tagFields[0]?.id || null);
  const [newValueLabel, setNewValueLabel] = useState('');
  const [valueError, setValueError] = useState<string | null>(null);

  const sortedFields = useMemo(
    () =>
      [...tagFields].sort(
        (a, b) =>
          (a.sortOrder ?? a.createdAt) - (b.sortOrder ?? b.createdAt) || a.createdAt - b.createdAt
      ),
    [tagFields]
  );
  const effectiveSelectedFieldId = useMemo(() => {
    if (!selectedFieldId) return sortedFields[0]?.id || null;
    const exists = sortedFields.some((field) => field.id === selectedFieldId);
    return exists ? selectedFieldId : sortedFields[0]?.id || null;
  }, [selectedFieldId, sortedFields]);
  const selectedField = sortedFields.find((field) => field.id === effectiveSelectedFieldId) || null;
  const isBooleanField = selectedField?.type === 'boolean';
  const isNumberField = selectedField?.type === 'number';
  const selectedValues = useMemo(
    () =>
      tagValues
        .filter((value) => value.fieldId === effectiveSelectedFieldId)
        .sort((a, b) => a.createdAt - b.createdAt),
    [effectiveSelectedFieldId, tagValues]
  );
  const fieldTypeCollection = createListCollection({
    items: [
      { label: 'single', value: 'single' },
      { label: 'multi', value: 'multi' },
      { label: 'boolean', value: 'boolean' },
      { label: 'number', value: 'number' },
    ],
  });

  useEffect(() => {
    if (!selectedField || selectedField.type !== 'boolean') return;
    const values = tagValues.filter((value) => value.fieldId === selectedField.id);
    const normalized = values.map((value) => value.label.trim().toLowerCase());
    const hasTrue = normalized.includes('true');
    const hasFalse = normalized.includes('false');
    if (!hasTrue) {
      addTagValue(new TagValueModel({ fieldId: selectedField.id, label: 'true' }));
    }
    if (!hasFalse) {
      addTagValue(new TagValueModel({ fieldId: selectedField.id, label: 'false' }));
    }
    values
      .filter((value) => {
        const lowered = value.label.trim().toLowerCase();
        return lowered !== 'true' && lowered !== 'false';
      })
      .forEach((value) => {
        deleteTagValue(value.id);
      });
  }, [addTagValue, deleteTagValue, selectedField, tagValues]);

  const handleCreateField = () => {
    const maxSortOrder = sortedFields.reduce((max, field) => {
      const order = field.sortOrder ?? field.createdAt;
      return Math.max(max, order);
    }, 0);
    const field = new TagFieldModel({
      name: 'New Tag Field',
      type: 'single',
      sortOrder: maxSortOrder + 1,
      isCore: false,
      isActive: true,
    });
    addTagField(field);
    setSelectedFieldId(field.id);
    setEditingFieldId(field.id);
    setEditingFieldName(field.name);
  };

  const handleSaveField = () => {
    if (!editingFieldId) return;
    const field = sortedFields.find((item) => item.id === editingFieldId);
    if (!field) return;
    const nextName = editingFieldName.trim();
    if (!nextName) return;
    updateTagField(new TagFieldModel({ ...field, name: nextName }));
    setEditingFieldId(null);
    setEditingFieldName('');
  };

  const handleCreateValue = () => {
    if (!effectiveSelectedFieldId) return;
    const nextLabel = newValueLabel.trim();
    if (!nextLabel) return;
    if (isBooleanField) return;
    if (isNumberField && !Number.isFinite(Number(nextLabel))) {
      setValueError('Number fields accept numeric values only.');
      return;
    }
    setValueError(null);
    addTagValue(new TagValueModel({ fieldId: effectiveSelectedFieldId, label: nextLabel }));
    setNewValueLabel('');
  };

  const handleSaveValue = () => {
    if (!editingValueId) return;
    const tagValue = tagValues.find((value) => value.id === editingValueId);
    if (!tagValue) return;
    const nextLabel = editingValueLabel.trim();
    if (!nextLabel) return;
    const field = sortedFields.find((item) => item.id === tagValue.fieldId);
    if (field?.type === 'boolean') {
      setEditingValueId(null);
      setEditingValueLabel('');
      return;
    }
    if (field?.type === 'number' && !Number.isFinite(Number(nextLabel))) {
      setValueError('Number fields accept numeric values only.');
      return;
    }
    setValueError(null);
    updateTagValue(new TagValueModel({ ...tagValue, label: nextLabel }));
    setEditingValueId(null);
    setEditingValueLabel('');
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = sortedFields.findIndex((field) => field.id === fieldId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedFields.length) return;

    const currentField = sortedFields[currentIndex];
    const targetField = sortedFields[targetIndex];
    const currentOrder = currentField.sortOrder ?? currentField.createdAt;
    const targetOrder = targetField.sortOrder ?? targetField.createdAt;

    updateTagField(new TagFieldModel({ ...currentField, sortOrder: targetOrder }));
    updateTagField(new TagFieldModel({ ...targetField, sortOrder: currentOrder }));
  };

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="md" color="accent">
          Position Tags
        </Heading>
        <Button onClick={handleCreateField} color="success">
          <Plus size={16} />
          New Field
        </Button>
      </Flex>

      <Grid templateColumns={{ base: '1fr', lg: '1.2fr 1fr' }} gap={4}>
        <GridItem>
          <Card.Root bg="surface" color="fg" borderColor="border">
            <Card.Body>
              <Table.Root variant="outline" size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader color="muted">Field</Table.ColumnHeader>
                    <Table.ColumnHeader color="muted">Type</Table.ColumnHeader>
                    <Table.ColumnHeader color="muted" textAlign="center">
                      Status
                    </Table.ColumnHeader>
                    <Table.ColumnHeader color="muted" textAlign="end">
                      Actions
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {sortedFields.map((field, index) => (
                    <Table.Row
                      key={field.id}
                      bg={effectiveSelectedFieldId === field.id ? 'subtle' : undefined}
                      onClick={() => setSelectedFieldId(field.id)}
                      cursor="pointer"
                    >
                      <Table.Cell>
                        {editingFieldId === field.id ? (
                          <Input
                            size="sm"
                            value={editingFieldName}
                            onChange={(e) => setEditingFieldName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveField();
                              }
                            }}
                            onBlur={handleSaveField}
                          />
                        ) : (
                          <HStack>
                            <Text>{field.name}</Text>
                            {field.isCore && (
                              <Badge size="sm" bg="brand" color="bg">
                                Core
                              </Badge>
                            )}
                          </HStack>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Select.Root
                          size="sm"
                          collection={fieldTypeCollection}
                          value={[field.type]}
                          onValueChange={(e) => {
                            const nextType = e.value[0];
                            if (!nextType) return;
                            updateTagField(
                              new TagFieldModel({
                                ...field,
                                type: nextType as TagFieldModel['type'],
                              })
                            );
                          }}
                        >
                          <Select.Control>
                            <Select.Trigger>
                              <Select.ValueText />
                              <Select.Indicator />
                            </Select.Trigger>
                          </Select.Control>
                          <Select.Positioner>
                            <Select.Content bg="surface" color="fg" borderColor="border">
                              {fieldTypeCollection.items.map((item) => (
                                <Select.Item item={item} key={item.value}>
                                  <Select.ItemText>{item.label}</Select.ItemText>
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Positioner>
                        </Select.Root>
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        <HStack justify="center" gap={2}>
                          <Badge
                            size="sm"
                            bg={field.isActive ? 'success' : 'surface'}
                            color={field.isActive ? 'bg' : 'muted'}
                          >
                            {field.isActive ? 'Active' : 'Deactive'}
                          </Badge>
                          <Switch.Root
                            checked={field.isActive}
                            colorPalette={field.isActive ? 'green' : 'gray'}
                            onCheckedChange={(e) => {
                              updateTagField(
                                new TagFieldModel({ ...field, isActive: !!e.checked })
                              );
                            }}
                            size="sm"
                          >
                            <Switch.HiddenInput />
                            <Switch.Control />
                          </Switch.Root>
                        </HStack>
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        <HStack justify="end">
                          {editingFieldId === field.id ? (
                            <IconButton
                              aria-label="Save field"
                              size="sm"
                              variant="ghost"
                              color="success"
                              onClick={handleSaveField}
                            >
                              <Save size={14} />
                            </IconButton>
                          ) : (
                            <IconButton
                              aria-label="Edit field"
                              size="sm"
                              variant="ghost"
                              color="info"
                              onClick={() => {
                                setEditingFieldId(field.id);
                                setEditingFieldName(field.name);
                              }}
                            >
                              <Edit size={14} />
                            </IconButton>
                          )}
                          <IconButton
                            aria-label="Move field up"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveField(field.id, 'up');
                            }}
                            disabled={index === 0}
                          >
                            <ArrowUp size={14} />
                          </IconButton>
                          <IconButton
                            aria-label="Move field down"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveField(field.id, 'down');
                            }}
                            disabled={index === sortedFields.length - 1}
                          >
                            <ArrowDown size={14} />
                          </IconButton>
                          <IconButton
                            aria-label="Delete field"
                            size="sm"
                            variant="ghost"
                            color="danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTagField(field.id);
                              if (selectedFieldId === field.id) {
                                setSelectedFieldId(null);
                              }
                            }}
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
        </GridItem>

        <GridItem>
          <Card.Root bg="surface" color="fg" borderColor="border">
            <Card.Body>
              <VStack align="stretch" gap={3}>
                <Heading size="sm" color="accentAlt">
                  {selectedField ? `${selectedField.name} Values` : 'Select a Field'}
                </Heading>
                {selectedField ? (
                  <>
                    <Field.Root>
                      <Field.Label fontSize="xs" color="muted">
                        Add Value
                      </Field.Label>
                      {isBooleanField ? (
                        <Text fontSize="sm" color="muted">
                          Boolean fields are fixed to `true` and `false`.
                        </Text>
                      ) : (
                        <HStack>
                          <Input
                            size="sm"
                            placeholder={isNumberField ? 'e.g. 2.5' : 'e.g. Breakout'}
                            value={newValueLabel}
                            onChange={(e) => setNewValueLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateValue();
                              }
                            }}
                          />
                          <Button size="sm" color="success" onClick={handleCreateValue}>
                            <Plus size={14} />
                            Add
                          </Button>
                        </HStack>
                      )}
                      {valueError && (
                        <Text fontSize="xs" color="danger">
                          {valueError}
                        </Text>
                      )}
                    </Field.Root>
                    <Box borderWidth="1px" borderColor="border" borderRadius="md" p={2}>
                      <VStack align="stretch" gap={2}>
                        {selectedValues.length === 0 ? (
                          <Text color="muted" fontSize="sm">
                            No values yet.
                          </Text>
                        ) : (
                          selectedValues.map((value) => (
                            <HStack key={value.id} justify="space-between">
                              {editingValueId === value.id ? (
                                <Input
                                  size="sm"
                                  value={editingValueLabel}
                                  onChange={(e) => setEditingValueLabel(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveValue();
                                    }
                                  }}
                                  onBlur={handleSaveValue}
                                />
                              ) : (
                                <Text fontSize="sm">{value.label}</Text>
                              )}
                              {!isBooleanField && (
                                <HStack>
                                  {editingValueId === value.id ? (
                                    <IconButton
                                      aria-label="Save value"
                                      size="xs"
                                      variant="ghost"
                                      color="success"
                                      onClick={handleSaveValue}
                                    >
                                      <Save size={12} />
                                    </IconButton>
                                  ) : (
                                    <IconButton
                                      aria-label="Edit value"
                                      size="xs"
                                      variant="ghost"
                                      color="info"
                                      onClick={() => {
                                        setEditingValueId(value.id);
                                        setEditingValueLabel(value.label);
                                      }}
                                    >
                                      <Edit size={12} />
                                    </IconButton>
                                  )}
                                  <IconButton
                                    aria-label="Delete value"
                                    size="xs"
                                    variant="ghost"
                                    color="danger"
                                    onClick={() => deleteTagValue(value.id)}
                                  >
                                    <Trash size={12} />
                                  </IconButton>
                                </HStack>
                              )}
                            </HStack>
                          ))
                        )}
                      </VStack>
                    </Box>
                  </>
                ) : (
                  <Text color="muted" fontSize="sm">
                    Create or select a tag field to manage values.
                  </Text>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        </GridItem>
      </Grid>
    </VStack>
  );
}
