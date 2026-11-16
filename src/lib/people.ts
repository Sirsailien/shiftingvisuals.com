import type { CollectionEntry } from 'astro:content';

// Resolve a crew entry's `person` to a display name, and a link when it's a team member.
// Something that looks like a slug (lowercase-with-hyphens) must match a team member,
// so a typo fails the build instead of silently showing "placeholder-x".
export function resolvePerson(person: string, team: CollectionEntry<'team'>[]) {
  const member = team.find((t) => t.data.slug === person);
  if (member) return { name: member.data.name, href: '#team', slug: member.data.slug };
  if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(person)) {
    throw new Error(`Crew member "${person}" looks like a team slug, but no team member has that slug.`);
  }
  return { name: person, href: null, slug: null };
}
