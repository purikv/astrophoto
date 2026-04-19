import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://purikv.github.io',
  base: '/astrophoto',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [sitemap()]
});
