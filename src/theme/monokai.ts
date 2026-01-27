import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const fontFamily = "'JetBrains Mono', 'Fira Code', monospace";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        monokai: {
          bg: { value: '#2D2A2E' },
          fg: { value: '#FCFCFA' },
          yellow: { value: '#FFD866' },
          green: { value: '#A9DC76' },
          pink: { value: '#FF6188' },
          blue: { value: '#78DCE8' },
          orange: { value: '#FC9867' },
          purple: { value: '#AB9DF2' },
          gray: {
            100: { value: '#C1C0C0' },
            200: { value: '#939293' },
            300: { value: '#727072' },
            400: { value: '#5B595C' },
            500: { value: '#403E41' },
            800: { value: '#221F22' },
            900: { value: '#19181A' },
          },
        },
      },
      fonts: {
        heading: { value: fontFamily },
        body: { value: fontFamily },
      },
      radii: {
        sm: { value: '0px' },
        md: { value: '0px' },
        lg: { value: '0px' },
      },
    },
    semanticTokens: {
      colors: {
        bg: { value: '{colors.monokai.bg}' },
        fg: { value: '{colors.monokai.fg}' },
        surface: { value: '{colors.monokai.gray.900}' },
        surfaceSubtle: { value: '{colors.monokai.gray.800}' },
        surfaceAlt: { value: '{colors.monokai.gray.900}' },
        subtle: { value: '{colors.monokai.gray.500}' },
        border: { value: '{colors.monokai.gray.400}' },
        borderSubtle: { value: '{colors.monokai.gray.500}' },
        muted: { value: '{colors.monokai.gray.300}' },
        accent: { value: '{colors.monokai.orange}' },
        accentAlt: { value: '{colors.monokai.yellow}' },
        info: { value: '{colors.monokai.blue}' },
        success: { value: '{colors.monokai.green}' },
        warning: { value: '{colors.monokai.yellow}' },
        danger: { value: '{colors.monokai.pink}' },
        brand: { value: '{colors.monokai.purple}' },
        colorPalette: {
          solid: { value: '{colors.monokai.gray.500}' },
          contrast: { value: '{colors.monokai.bg}' },
          fg: { value: '{colors.monokai.fg}' },
          subtle: { value: '{colors.monokai.gray.800}' },
          muted: { value: '{colors.monokai.gray.500}' },
          border: { value: '{colors.monokai.gray.400}' },
        },
      },
    },
  },
  globalCss: {
    'html, body': {
      backgroundColor: 'bg',
      color: 'fg',
      fontFamily,
    },
  },
});

const system = createSystem(defaultConfig, config);

export default system;
