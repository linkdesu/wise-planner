import { createToaster, Toaster as ChakraToaster } from '@chakra-ui/react';

export const toaster = createToaster({
  placement: 'top-end',
});

export function Toaster () {
  return <ChakraToaster toaster={toaster} />;
}
