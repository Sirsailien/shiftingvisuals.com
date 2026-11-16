import type { CollectionEntry } from 'astro:content';
import { resolvePerson } from './people';

// Crew roles as they appear in opening-title credits, in this order.
// Used when a film has no hand-written `credits` list.
export const CREDIT_ROLES: Record<string, string> = {
  Director: 'Directed by',
  Writer: 'Written by',
  Cinematographer: 'Shot by',
  Editor: 'Edited by',
  Composer: 'Music by',
  Producer: 'Produced by',
};

type CrewEntry = { person: string; role: string; character?: string };
type CreditEntry = { label: string; person: string };

// Automatic credit: the main roles, with leading actors right after the director.
function fromCrew(crew: CrewEntry[]): CreditEntry[] {
  const order = Object.keys(CREDIT_ROLES);
  const main = crew
    .filter((c) => c.role in CREDIT_ROLES)
    .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role))
    .map((c) => ({ label: CREDIT_ROLES[c.role], person: c.person }));
  const actors = crew
    .filter((c) => c.role === 'Actor' && c.character)
    .map((c) => ({ label: `${c.character} played by`, person: c.person }));
  return [...main.slice(0, 1), ...actors, ...main.slice(1)];
}

/** The rotating credit for a film or project: hand-written if given, else from the crew. */
export function rotatingCredits(
  data: { crew: CrewEntry[]; credits?: CreditEntry[] },
  team: CollectionEntry<'team'>[],
) {
  const list = data.credits?.length ? data.credits : fromCrew(data.crew);
  return list.map((c) => {
    const p = resolvePerson(c.person, team);
    return { label: c.label, name: p.name, href: p.href };
  });
}
