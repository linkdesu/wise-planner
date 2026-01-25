import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const colors = {
  monokai: {
    bg: '#272822',
    fg: '#F8F8F2',
    yellow: '#E6DB74',
    green: '#A6E22E',
    pink: '#F92672',
    blue: '#66D9EF',
    orange: '#FD971F',
    purple: '#AE81FF',
    gray: {
      100: '#3E3D32',
      200: '#49483E',
      300: '#75715E',
      800: '#272822', // Main BG
      900: '#1e1f1c', // Darker BG
    },
  },
};

const theme = extendTheme({
  config,
  colors,
  styles: {
    global: {
      body: {
        bg: 'monokai.bg',
        color: 'monokai.fg',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontWeight: 'bold',
      },
      variants: {
        solid: {
          bg: 'monokai.green',
          color: 'monokai.bg',
          _hover: {
            bg: 'monokai.yellow',
          },
        },
        ghost: {
          color: 'monokai.blue',
          _hover: {
            bg: 'monokai.gray.200',
          },
        },
        outline: {
          borderColor: 'monokai.purple',
          color: 'monokai.purple',
          _hover: {
            bg: 'monokai.gray.100',
          },
        },
      },
    },
    Input: {
      variants: {
        filled: {
          field: {
            bg: 'monokai.gray.100',
            color: 'monokai.fg',
            _hover: {
              bg: 'monokai.gray.200',
            },
            _focus: {
              bg: 'monokai.gray.200',
              borderColor: 'monokai.pink',
            },
          },
        },
      },
      defaultProps: {
        variant: 'filled',
      },
    },
    Select: {
      variants: {
        filled: {
          field: {
            bg: 'monokai.gray.100',
            color: 'monokai.fg',
            _hover: {
              bg: 'monokai.gray.200',
            },
            _focus: {
              bg: 'monokai.gray.200',
              borderColor: 'monokai.pink',
            },
          },
        },
      },
      defaultProps: {
        variant: 'filled',
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'monokai.gray.100',
          color: 'monokai.fg',
          borderColor: 'monokai.gray.300',
          borderWidth: '1px',
        },
      },
    },
  },
});

export default theme;
