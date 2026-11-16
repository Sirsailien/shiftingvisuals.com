import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// A crew entry. `person` is a team member's slug (links to the team page)
// or, for someone outside the collective, just their name as plain text.
// Actors: role "Actor" plus the `character` they play.
// The crew list is the source for everyone's roles on the team page.
const crew = z
  .array(z.object({ person: z.string(), role: z.string(), character: z.string().optional() }))
  .default([]);

// Optional: the rotating credit written out by hand, in order. Use it to combine
// roles ("Written & directed by") or credit actors ("Jim played by").
// Leave it out and the credit is built from the crew automatically.
const credits = z.array(z.object({ label: z.string(), person: z.string() })).optional();

const films = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/films' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      slug: z.string(),
      order: z.number().default(0), // lower comes first in the portfolio
      year: z.number().int(),
      type: z.string(), // "Short film", "Trailer", "Teaser", …
      runtime: z.string(), // free text: "21 min", "33 sec"
      logline: z.string(),
      youtubeId: z.string(),
      still: image().optional(), // falls back to the YouTube thumbnail
      crew,
      credits,
    }),
});

const team = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/team' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      slug: z.string(),
      order: z.number().default(0),
      photo: image().optional(),
      photoFocus: z.string().default('50% 50%'), // CSS object-position: what stays in frame when cropped
      bio: z.string(),
      links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
    }),
});

const inTheWorks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/in-the-works' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      slug: z.string(),
      order: z.number().default(0),
      status: z.enum(['Shooting', 'In post', 'Development']),
      logline: z.string().optional(),
      youtubeId: z.string().optional(), // teaser/trailer: plays like a portfolio film
      still: image().optional(), // falls back to the YouTube thumbnail
      crew,
      credits,
    }),
});

export const collections = { films, team, inTheWorks };
