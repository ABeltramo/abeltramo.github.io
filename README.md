# abeltra.me

Source of [abeltra.me](https://abeltra.me). The site is a Hugo site with a
local theme, `themes/descent`.

## Run it

```sh
hugo server
```

The build needs Hugo extended 0.169.0 or later and asciidoctor for the
`.adoc` pages.

```sh
brew install hugo asciidoctor
```

## Add content

| Entry | Where |
| --- | --- |
| Post | `content/writing/<slug>/index.md` |
| Note | `content/writing/<slug>.md`, with `kind: note` |
| Book | `data/books.yaml` |
| Slides | `data/presentations.yaml` |

A post and a note need `title`, `date` and `description`. The description
becomes the line under the entry on the timeline. A note also needs
`kind: note`.

A book needs `date`, `title`, `author` and `isbn`. A month is enough:
`date: "2026-11"`. The cover links to the Open Library page for that ISBN.
Set `cover` or `url` to override either one. See `themes/descent/README.md`.

The build does not load covers from Open Library in the browser. Run the
fetch script once to keep them on this site:

```sh
node scripts/fetch-covers.mjs
```

The script writes `assets/covers/`, which is in `.gitignore`. CI keeps that
folder in the Actions cache and downloads only the new covers.

A deck is an external link to the presentations site. Run the sync script
after you add a deck to the presentations repository:

```sh
node scripts/sync-presentations.mjs --repo ../presentations
```

The script writes `data/presentations.yaml`. Commit the result. The build
needs no access to the presentations repository.

## Theme

The theme lives in `themes/descent`. Its README covers the configuration, the
data files, the layouts and the cable:

```sh
less themes/descent/README.md
```

## Deploy

A push to `master` builds the site on GitHub Pages. The workflow is
`.github/workflows/hugo.yaml`.
