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
  },
  globalCss: {
    'html, body': {
      backgroundColor: 'monokai.bg',
      color: 'monokai.fg',
      fontFamily,
    },
  },
});

const system = createSystem(defaultConfig, config);

export default system;
