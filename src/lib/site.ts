// Vite inlines the YAML source at build time (?raw) — no runtime fs, bundling-safe.
// Parsing at module scope means an invalid site.yaml fails the build.
import rawSiteYaml from '../data/site.yaml?raw';
import { parseSiteConfig } from './site-config';

export const site = parseSiteConfig(rawSiteYaml);
