import type { CollectionEntry } from 'astro:content';

// A team member's roles, derived from the crew lists of every film and project,
// so roles are never entered twice. Grouped per film, films first.
export function rolesFor(
  slug: string,
  films: CollectionEntry<'films'>[],
  inTheWorks: CollectionEntry<'inTheWorks'>[],
) {
  const sources = [
    ...[...films].sort((a, b) => a.data.order - b.data.order).map((e) => ({ data: e.data, route: 'portfolio' })),
    ...[...inTheWorks].sort((a, b) => a.data.order - b.data.order).map((e) => ({ data: e.data, route: 'in-the-works' })),
  ];
  return sources
    .map(({ data, route }) => ({
      title: data.title,
      href: `#${route}/${data.slug}`,
      inTheWorks: route === 'in-the-works',
      roles: data.crew
        .filter((c) => c.person === slug)
        .map((c) => (c.character ? `${c.role} (${c.character})` : c.role)),
    }))
    .filter((w) => w.roles.length > 0);
}
