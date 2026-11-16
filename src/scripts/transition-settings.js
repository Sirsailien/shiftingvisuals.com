// Options we're still deciding on. The dev-only lab can override these.
//   home:    transition going home            ('lens' | 'centre' | 'black')
//   between: transition page → page           ('via-home' | 'direct' | 'black')
export const settings = {
  home: 'lens',
  between: 'via-home',
};

if (import.meta.env.DEV) {
  try {
    const saved = JSON.parse(localStorage.getItem('sv-transition-lab') || '{}');
    for (const key of Object.keys(settings)) if (saved[key]) settings[key] = saved[key];
  } catch {}
}
