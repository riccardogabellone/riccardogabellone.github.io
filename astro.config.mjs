// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/** @param {string} file @param {string} weight */
const fv = (file, weight) => ({ src: [`./src/assets/fonts/${file}`], weight, style: 'normal' });

export default defineConfig({
  site: 'https://riccardogabellone.github.io',
  integrations: [sitemap()],
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Space Grotesk',
      cssVariable: '--font-display',
      options: {
        variants: [
          fv('space-grotesk-latin-500-normal.woff2', '500'),
          fv('space-grotesk-latin-600-normal.woff2', '600'),
          fv('space-grotesk-latin-700-normal.woff2', '700'),
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Inter',
      cssVariable: '--font-body',
      options: {
        variants: [
          fv('inter-latin-400-normal.woff2', '400'),
          fv('inter-latin-500-normal.woff2', '500'),
          fv('inter-latin-600-normal.woff2', '600'),
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      options: {
        variants: [
          fv('jetbrains-mono-latin-400-normal.woff2', '400'),
          fv('jetbrains-mono-latin-500-normal.woff2', '500'),
          fv('jetbrains-mono-latin-700-normal.woff2', '700'),
        ],
      },
    },
  ],
});
