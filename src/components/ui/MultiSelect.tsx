import { Select as ChakraSelect, Portal } from '@chakra-ui/react';

type RootProps<T extends object> = ChakraSelect.RootProps<T>;

export interface MultiSelectProps<T extends { label: string; value: string }> extends Omit<
  RootProps<T>,
  'collection' | 'onValueChange' | 'value'
> {
  collection: RootProps<T>['collection'];
  value?: string[];
  placeholder?: string;
  onCommit?: (values: string[]) => void;
}

export function MultiSelect<T extends { label: string; value: string }>({
  collection,
  value,
  placeholder,
  onCommit,
  ...rootProps
}: MultiSelectProps<T>) {
  return (
    <ChakraSelect.Root
      {...rootProps}
      multiple
      collection={collection}
      value={value}
      onValueChange={(e) => onCommit?.(e.value || [])}
    >
      <ChakraSelect.HiddenSelect />
      <ChakraSelect.Control>
        <ChakraSelect.Trigger>
          <ChakraSelect.ValueText placeholder={placeholder} />
          <ChakraSelect.Indicator />
        </ChakraSelect.Trigger>
      </ChakraSelect.Control>
      <Portal>
        <ChakraSelect.Positioner>
          <ChakraSelect.Content
            bg="surface"
            color="fg"
            borderColor="border"
            boxShadow="lg"
            zIndex="dropdown"
          >
            {collection.items.map((item) => (
              <ChakraSelect.Item item={item} key={item.value}>
                <ChakraSelect.ItemText>{item.label}</ChakraSelect.ItemText>
                <ChakraSelect.ItemIndicator />
              </ChakraSelect.Item>
            ))}
          </ChakraSelect.Content>
        </ChakraSelect.Positioner>
      </Portal>
    </ChakraSelect.Root>
  );
}
