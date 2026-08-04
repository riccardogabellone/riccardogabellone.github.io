import fs from 'node:fs';
import { parse } from 'yaml';
import { z } from 'astro/zod';

const schema = z.object({
  name: z.string(),
  headline: z.string(),
  availability: z.object({ show: z.boolean(), label: z.string() }),
  tagline: z.string(),
  about: z.string(),
  socials: z.object({
    github: z.string().url(),
    linkedin: z.string().url(),
    x: z.string().url(),
    telegram: z.string().url(),
    email: z.string().email(),
  }),
  cv_pdf: z.string().nullable(),
  skills: z.array(z.object({ group: z.string(), items: z.array(z.string()) })),
  timeline: z.array(
    z.object({
      kind: z.enum(['work', 'education']),
      title: z.string(),
      org: z.string(),
      org_url: z.string().url().nullable(),
      start: z.string(),
      end: z.string(),
      bullets: z.array(z.string()).default([]),
      note: z.string().optional(),
    }),
  ),
  stats_section: z.object({ show: z.boolean() }),
});

export type SiteConfig = z.infer<typeof schema>;

export function parseSiteConfig(yamlText: string): SiteConfig {
  return schema.parse(parse(yamlText));
}

export function getSiteConfig(): SiteConfig {
  return parseSiteConfig(fs.readFileSync(new URL('../data/site.yaml', import.meta.url), 'utf8'));
}
