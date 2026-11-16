// The five full-screen pages. `route` is the part after "#".
export const PAGES = [
  { route: '', key: 'home', name: 'Home' },
  { route: 'portfolio', key: 'portfolio', name: 'Portfolio' },
  { route: 'team', key: 'team', name: 'Meet the team' },
  { route: 'in-the-works', key: 'in-the-works', name: 'In the works' },
  { route: 'contact', key: 'contact', name: 'Contact' },
] as const;

export type PageKey = (typeof PAGES)[number]['key'];

export const NAV_PAGES = PAGES.filter((p) => p.key !== 'home');

export const href = (route: string) => (route ? `#${route}` : '#/');
