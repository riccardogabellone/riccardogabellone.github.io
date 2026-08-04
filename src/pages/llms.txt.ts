/* /llms.txt — generated from site.yaml + the projects collection at build,
   so it can never drift from the page content. Format: llmstxt.org. */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../lib/site';

export const GET: APIRoute = async (context) => {
  const base = (context.site ?? new URL('https://riccardogabellone.github.io/')).href;
  const projects = (await getCollection('projects'))
    .filter((p) => p.data.status !== 'hidden')
    .sort((a, b) => a.data.order - b.data.order);

  const availability = site.availability.show
    ? ` Currently ${site.availability.label.toLowerCase()}.`
    : '';

  const projectLines = projects.map((p) => {
    const link = p.data.links.live ?? p.data.links.repo ?? p.data.links.playstore;
    const name = link ? `[${p.data.title}](${link})` : p.data.title;
    return `- ${name}: ${p.data.tagline}`;
  });

  const skillLines = site.skills.map((g) => `- ${g.group}: ${g.items.join(', ')}`);

  const text = [
    `# ${site.name}`,
    '',
    `> ${site.headline}.${availability}`,
    `> ${site.tagline}`,
    '',
    site.about,
    '',
    `Portfolio: ${base}`,
    `GitHub: ${site.socials.github}`,
    `LinkedIn: ${site.socials.linkedin}`,
    `Email: ${site.socials.email}`,
    '',
    '## Projects',
    '',
    ...projectLines,
    '',
    '## Skills',
    '',
    ...skillLines,
    '',
    '## Experience',
    '',
    ...site.timeline.map(
      (t) => `- ${t.title} — ${t.org} (${t.start} — ${t.end})${t.note ? `: ${t.note}` : ''}`,
    ),
    '',
  ].join('\n');

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
