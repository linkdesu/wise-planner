import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ChakraProvider, createListCollection } from '@chakra-ui/react';
import system from '../../theme/monokai';
import { MultiSelect } from './MultiSelect';

let capturedOnValueChange: ((details: { value: string[] }) => void) | undefined;

vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual<typeof import('@chakra-ui/react')>('@chakra-ui/react');
  const passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;

  return {
    ...actual,
    Portal: ({ children }: { children?: ReactNode }) => <>{children}</>,
    Select: {
      ...actual.Select,
      Root: ({ onValueChange, children }: { onValueChange?: typeof capturedOnValueChange; children?: ReactNode }) => {
        capturedOnValueChange = onValueChange;
        return <div>{children}</div>;
      },
      HiddenSelect: passthrough,
      Control: passthrough,
      Trigger: passthrough,
      ValueText: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
      Indicator: passthrough,
      Positioner: passthrough,
      Content: passthrough,
      Item: passthrough,
      ItemText: passthrough,
      ItemIndicator: passthrough,
    },
  };
});

describe('ui/MultiSelect', () => {
  it('commits selected values via onValueChange', () => {
    const onCommit = vi.fn();
    const collection = createListCollection({
      items: [
        { label: 'All', value: '__all' },
        { label: 'Account A', value: 'acc-a' },
      ],
    });

    render(
      <ChakraProvider value={system}>
        <MultiSelect collection={collection} value={['__all']} onCommit={onCommit} />
      </ChakraProvider>
    );

    capturedOnValueChange?.({ value: ['acc-a'] });
    expect(onCommit).toHaveBeenCalledWith(['acc-a']);
  });
});
