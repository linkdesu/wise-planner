import { NumberInput as ChakraNumberInput } from '@chakra-ui/react';
import { forwardRef, useImperativeHandle, useState } from 'react';

type RootProps = ChakraNumberInput.RootProps;
type InputProps = ChakraNumberInput.InputProps;

export interface NumberInputProps extends Omit<RootProps, 'onValueChange' | 'value'> {
  value?: string;
  onCommit?: (value: string) => void;
  inputProps?: InputProps;
  control?: boolean;
}

export type NumberInputHandle = {
  resetValue: (value: number) => void;
};

export const NumberInput = forwardRef<NumberInputHandle, NumberInputProps>(function NumberInput(
  { value, onCommit, inputProps, control = false, children, ...rootProps },
  ref
) {
  const [draft, setDraft] = useState(value ?? '');
  const sanitize = (raw: string) => raw.replace(/[,_]/g, '');
  const parsed = Number(sanitize(draft));
  const defaultColor = Number.isFinite(parsed) && parsed < 0 ? 'danger' : 'success';

  const commit = () => {
    const sanitized = sanitize(draft);
    setDraft(sanitized);
    onCommit?.(sanitized);
  };

  useImperativeHandle(ref, () => ({
    resetValue: (newValue: number) => setDraft(newValue.toString() ?? ''),
  }));

  return (
    <ChakraNumberInput.Root {...rootProps} value={draft} onValueChange={(e) => setDraft(e.value)}>
      {control && <ChakraNumberInput.Control />}
      {children}
      <ChakraNumberInput.Input
        {...inputProps}
        color={inputProps?.color ?? defaultColor}
        onBlur={(e) => {
          inputProps?.onBlur?.(e);
          commit();
        }}
        onKeyDown={(e) => {
          inputProps?.onKeyDown?.(e);
          if (!e.defaultPrevented && e.key === 'Enter') {
            commit();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
      />
    </ChakraNumberInput.Root>
  );
});
