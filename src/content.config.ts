import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: file('src/data/projects.yaml'),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    description: z.string(),
    tech: z.array(z.string()),
    links: z.object({
      live: z.url().optional(),
      playstore: z.url().optional(),
      repo: z.url().optional(),
    }),
    status: z.enum(['featured', 'listed', 'hidden']),
    source_soon: z.boolean().default(false),
    order: z.number(),
  }),
});

export const collections = { projects };
