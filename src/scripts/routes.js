// Hash routes: #/ (home), #portfolio, #portfolio/<slug>, #team,
//              #in-the-works, #in-the-works/<slug>, #contact

const KNOWN = new Set(['portfolio', 'team', 'in-the-works', 'contact']);
const WITH_PARAM = new Set(['portfolio', 'in-the-works']); // pages with one film per URL

/** @returns {{page: string, param: string|null} | null} null for unknown routes */
export function parse(hash) {
  const path = decodeURIComponent(hash.replace(/^#\/?/, '')).replace(/\/+$/, '');
  if (path === '') return { page: 'home', param: null };
  const [page, param = null, ...rest] = path.split('/');
  if (!KNOWN.has(page) || rest.length) return null;
  if (param && !WITH_PARAM.has(page)) return null;
  return { page, param };
}

export function toHash({ page, param }) {
  if (page === 'home') return '#/';
  return param ? `#${page}/${param}` : `#${page}`;
}
