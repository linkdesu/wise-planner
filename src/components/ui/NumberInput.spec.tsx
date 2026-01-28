import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import system from '../../theme/monokai';
import { NumberInput } from './NumberInput';

describe('ui/NumberInput', () => {
  it('commits only on blur or Enter', () => {
    const onCommit = vi.fn();

    render(
      <ChakraProvider value={system}>
        <NumberInput value="5" onCommit={onCommit} />
      </ChakraProvider>
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith('5');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('5');
  });

  it('uses danger color for negative values and success otherwise', () => {
    render(
      <ChakraProvider value={system}>
        <NumberInput value="-1" />
        <NumberInput value="1" />
      </ChakraProvider>
    );

    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs[0]).toHaveStyle({ color: 'var(--chakra-colors-danger)' });
    expect(inputs[1]).toHaveStyle({ color: 'var(--chakra-colors-success)' });
  });

  it('sanitizes commas and underscores on commit', () => {
    const onCommit = vi.fn();

    render(
      <ChakraProvider value={system}>
        <NumberInput value="1,000_000" onCommit={onCommit} />
      </ChakraProvider>
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.blur(input);

    expect(onCommit).toHaveBeenCalledWith('1000000');
  });
});
