import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import system from '../theme/monokai';
import { TagsManager } from './TagsManager';

const plannerState = {
  tagFields: [
    {
      id: 'field-entry',
      name: 'Entry Strategy',
      isCore: true,
      isActive: true,
      createdAt: 1,
    },
  ],
  tagValues: [
    { id: 'value-breakout', fieldId: 'field-entry', label: 'Breakout', createdAt: 2 },
    { id: 'value-pullback', fieldId: 'field-entry', label: 'Pullback', createdAt: 3 },
  ],
  addTagField: vi.fn(),
  updateTagField: vi.fn(),
  deleteTagField: vi.fn(),
  addTagValue: vi.fn(),
  updateTagValue: vi.fn(),
  deleteTagValue: vi.fn(),
};

vi.mock('../hooks/usePlanner', () => ({
  usePlanner: () => plannerState,
}));

describe('TagsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new field', () => {
    render(
      <ChakraProvider value={system}>
        <TagsManager />
      </ChakraProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /new field/i }));
    expect(plannerState.addTagField).toHaveBeenCalledTimes(1);
  });

  it('creates a new value for selected field', () => {
    render(
      <ChakraProvider value={system}>
        <TagsManager />
      </ChakraProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('e.g. Breakout'), {
      target: { value: 'Trend Continuation' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(plannerState.addTagValue).toHaveBeenCalledTimes(1);
  });

  it('deletes a value', () => {
    render(
      <ChakraProvider value={system}>
        <TagsManager />
      </ChakraProvider>
    );

    fireEvent.click(screen.getAllByRole('button', { name: /delete value/i })[0]);
    expect(plannerState.deleteTagValue).toHaveBeenCalledWith('value-breakout');
  });
});
