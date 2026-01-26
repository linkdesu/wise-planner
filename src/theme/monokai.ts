import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const fontFamily = "'JetBrains Mono', 'Fira Code', monospace";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        monokai: {
          bg: { value: '#272822' },
          fg: { value: '#F8F8F2' },
          yellow: { value: '#E6DB74' },
          green: { value: '#A6E22E' },
          pink: { value: '#F92672' },
          blue: { value: '#66D9EF' },
          orange: { value: '#FD971F' },
          purple: { value: '#AE81FF' },
          gray: {
            100: { value: '#3E3D32' },
            200: { value: '#49483E' },
            300: { value: '#75715E' },
            800: { value: '#272822' },
            900: { value: '#1e1f1c' },
          },
        },
      },
      fonts: {
        heading: { value: fontFamily },
        body: { value: fontFamily },
      },
    },
    semanticTokens: {
      colors: {
        bg: { value: '{colors.monokai.bg}' },
        fg: { value: '{colors.monokai.fg}' },
        surface: { value: '{colors.monokai.gray.100}' },
        surfaceSubtle: { value: '{colors.monokai.gray.200}' },
        surfaceAlt: { value: '{colors.monokai.gray.900}' },
        border: { value: '{colors.monokai.gray.300}' },
        borderSubtle: { value: '{colors.monokai.gray.200}' },
        muted: { value: '{colors.monokai.gray.300}' },
        accent: { value: '{colors.monokai.orange}' },
        accentAlt: { value: '{colors.monokai.yellow}' },
        info: { value: '{colors.monokai.blue}' },
        success: { value: '{colors.monokai.green}' },
        warning: { value: '{colors.monokai.yellow}' },
        danger: { value: '{colors.monokai.pink}' },
        brand: { value: '{colors.monokai.purple}' },
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
