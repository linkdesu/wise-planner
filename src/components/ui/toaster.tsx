import { createToaster, Toaster as ChakraToaster, Toast, Stack } from '@chakra-ui/react';

export const toaster = createToaster({
  placement: 'top-end',
});

export function Toaster () {
  return (
    <ChakraToaster toaster={toaster}>
      {(toast) => (
        <Toast.Root>
          <Toast.Indicator />
          <Stack gap="1" flex="1">
            {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
            {toast.description && (
              <Toast.Description>{toast.description}</Toast.Description>
            )}
          </Stack>
          <Toast.CloseTrigger />
        </Toast.Root>
      )}
    </ChakraToaster>
  );
}
