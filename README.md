# Shifting Visuals

The website for [shiftingvisuals.com](https://shiftingvisuals.com): a one-page site built with
[Astro](https://astro.build), plain CSS and vanilla JavaScript. Every "page" (Home, Portfolio,
Meet the team, In the works, Contact) is a full screen in a single `index.html`, switched with an
iris transition and hash links (`#portfolio`, `#team`, …).

## Working on it locally

You need [Node.js](https://nodejs.org) 24 or newer.

```sh
npm install        # once
npm run dev        # http://localhost:4321
npm run dev:phone  # same, plus an address you can open on your phone (same Wi-Fi)
npm run build      # builds the finished site into dist/
```

`npm run dev` keeps running in the background. Stop it with `npx astro dev stop`.

**If the dev server shows old content** (for example after renaming or deleting a file):

```sh
npx astro dev stop
rm -rf node_modules/.astro .astro/data-store.json
npm run dev
```

## Adding and editing content

All content lives in `src/content/`, one Markdown file per film, project or person. Only the part
between the `---` lines is used. Save the file and the site updates.

### Films: `src/content/films/`

```yaml
title: The Observers
slug: the-observers        # used in the link: #portfolio/the-observers
order: 1                   # lower comes first
year: 2022
type: Short film
runtime: 21 min
logline: One or two sentences.
youtubeId: UmaVZIo4UKM     # the part after watch?v= in the YouTube link
crew:                      # everyone's roles; also feeds the team page
  - { person: django, role: Producer }            # a team member's slug: links to the team page
  - { person: Enrico Pischedda, role: Director }  # anyone else: just their name
  - { person: Yuusuf van der Heide, role: Actor, character: Jim Davis }
credits:                   # the rotating credit on the video (optional)
  - { label: Jim Davis played by, person: Yuusuf van der Heide }
  - { label: Produced by, person: django }
```

- **Rotating credit:** written out under `credits`. It plays in a random order, every credit once
  before reshuffling. Leave `credits` out and it's built from `crew` (Director, Writer,
  Cinematographer, Editor, Composer, Producer, and actors with a `character`).
- **Thumbnail:** taken from YouTube automatically. To use your own, put an image in
  `src/assets/stills/` and add `still: ../../assets/stills/the-observers.jpg`.
- **Team links:** a `person` written like a slug (lowercase-with-hyphens) must match a team member,
  otherwise the build stops with an error. This catches typos.

### In the works: `src/content/in-the-works/`

The same as a film, plus `status: Development`, `In post` or `Shooting`. There is no `year`, `type` or
`runtime`, and `logline` and `youtubeId` (a teaser or trailer) are optional.

### Team: `src/content/team/`

```yaml
name: Django van den Busken
slug: django
order: 0                   # lower comes first
photo: ../../assets/crew/Django-11.jpg
photoFocus: 68% 30%        # which part of the photo stays in frame (0% 0% = top left)
bio: One short paragraph.
links:
  - { label: Instagram, url: "https://www.instagram.com/…" }
```

- **Photos:** go in `src/assets/crew/`. Any size works; the site makes small versions itself.
- **Roles:** each person's roles per film are collected from the `crew` lists automatically.
- **Bio:** if it contains a colon (`:`), wrap the whole bio in double quotes.
- **New person:** copy `django.md`, change the details, then use their slug in the films' `crew`
  and `credits` to link them.

### Other text

- **Meet the team intro:** `src/components/Team.astro`
- **Contact page:** `src/components/Contact.astro`
- **Site description** (shown by search engines and link previews): `src/layouts/Base.astro`

## Publishing (GitHub Pages)

The site is built and published by GitHub itself, using `.github/workflows/deploy.yml`, every time
you push to the `main` branch.

### One-time setup

1. Push this folder to a GitHub repository. On a free account the repository must be **public**
   for Pages to work.
2. In the repository, go to **Settings → Pages**, and under **Build and deployment → Source**,
   choose **GitHub Actions**.
3. Under **Settings → Pages → Custom domain**, enter `shiftingvisuals.com` and save. (The
   `public/CNAME` file holds the same domain.)
4. Set up DNS (below). Once GitHub shows the domain as verified, tick **Enforce HTTPS**. The
   certificate can take up to an hour to appear.

Check a deploy under the repository's **Actions** tab. A green tick means it's live; a red cross
shows the error, usually a typo in a content file.

### DNS

At the company where shiftingvisuals.com is registered, set these records (remove any other
`A` or `AAAA` records for the bare domain):

| Type  | Name  | Value                   |
| ----- | ----- | ----------------------- |
| A     | @     | 185.199.108.153         |
| A     | @     | 185.199.109.153         |
| A     | @     | 185.199.110.153         |
| A     | @     | 185.199.111.153         |
| CNAME | www   | `<username>.github.io`  |

`<username>` is the GitHub account (or organisation) that owns the repository. DNS changes can
take a few hours to spread.

Optionally, also add these `AAAA` records for IPv6: `2606:50c0:8000::153`,
`2606:50c0:8001::153`, `2606:50c0:8002::153` and `2606:50c0:8003::153`.

### Moving the repository later

If the repository moves to another account or organisation, re-enter the custom domain under
**Settings → Pages**, and point the `www` CNAME at the new `<username>.github.io`.

## Project layout

```
src/
  content/       films, in-the-works and team (the Markdown files above)
  assets/        crew photos, film stills, logos
  components/    one file per page section (HomeLens, FilmReel, Team, Contact, …)
  scripts/       router, iris transition, home lens, film reel, team paging
  styles/        colours, fonts and base styles
  lib/           helpers for credits, roles and YouTube thumbnails
public/          copied as-is: CNAME, favicon
reference/       the original design concepts (not part of the site)
```
