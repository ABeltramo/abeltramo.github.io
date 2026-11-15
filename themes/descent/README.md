# Descent

A dark Hugo theme built as a climbing descent. The top of the page is the
summit: night sky, stars and three ridgelines. Scrolling down goes down the
rock face. A steel cable runs through anchor bolts and carabiners, and every
entry hangs from the cable. Year breaks are camps.

Four kinds of entry share one timeline:

- posts and notes from the main content sections
- books from `data/books.yaml`
- slides from `data/presentations.yaml`

## Install

Add the theme to your site:

```sh
git submodule add <theme-repo-url> themes/descent
```

Set the theme in `hugo.toml`:

```toml
theme = "descent"
```

The theme needs Hugo 0.137.0 or later. It has no JavaScript build step.

## Configuration

```toml
[params]
  tagline = "Software, open source, and other things I find interesting."
  description = "Posts, notes, slides and books, newest first."
  brand = "abeltra.me"
  copyright = "© ABeltramo"

[params.author]
  name = "ABeltramo"
  email = "you@example.com"

[markup.highlight]
  noClasses = false
```

| Key | Meaning |
| --- | --- |
| `params.tagline` | The sentence on the summit. |
| `params.description` | The meta description of the home page. The theme does not print it. |
| `params.brand` | The header brand. The theme turns the first dot into an amber dot. |
| `params.copyright` | The footer line. |
| `params.author` | Name and email for the footer and the RSS feed. |
| `markup.highlight.noClasses` | Set it to `false`. The theme carries its own token colours. |

The header menu comes from the main menu:

```toml
[[menus.main]]
  name = "Blog"
  url = "/blog/"
  weight = 10
```

## Content

### Posts and notes

Posts and notes share one section. Set the section names once:

```toml
[params]
  mainSections = ["writing"]
```

A page is a post until it sets another kind. Add `kind: "note"` for a note.
The label and the colour of the dot follow the key.

```yaml
---
title: "A short note"
date: 2025-06-12
description: "Short line for the timeline."
kind: "note"
url: "/notes/a-short-note/"
---
```

`description` becomes the line under the entry on the timeline and the meta
description of the page. Without it the theme uses the first 130 characters of
the summary for the timeline. The hero shows the title only.

The `url` key keeps a page on its old path after you move the file. A section
page can carry `aliases` for the paths it replaces:

```yaml
---
title: "Writing"
aliases: ["/blog/", "/notes/"]
---
```

### Home page

Content in `content/_index.md` renders at the bottom of the home page, under
the last camp. A site without that file shows the timeline only.

### Books

Books live in `data/books.yaml`. There is no page per book.

```yaml
- date: "2026-11"
  title: Wool
  author: Hugh Howey
  isbn: "9781804940822"
```

| Key | Meaning |
| --- | --- |
| `date` | `YYYY-MM` is enough. The entry lands on the first day of that month, and the cover shows `Nov 2026`. |
| `title`, `author` | Shown under the cover and used for the alt text. |
| `isbn` | The theme takes the cover from Open Library and links the entry to `https://openlibrary.org/isbn/<isbn>`. |
| `cover` | Optional image override under `static/`. Without it the theme draws a gradient cover from `c1` and `c2` when the book has no ISBN. |
| `url` | Optional link override. |

The ISBN is the last part of most shop URLs. A book with an ISBN needs no
file in the repository: the browser asks `covers.openlibrary.org` for the
cover and the cover links to the Open Library page for that edition.

Open Library answers with a small grey placeholder when it has no cover for
the ISBN. Set `cover` to your own image in that case, or drop the `isbn` and
use the gradient keys `c1` and `c2`.

The `/books/` page shows every cover in a grid.

### Slides

Slides live in `data/presentations.yaml`. A deck is an external link, so the
site keeps no slides of its own.

```yaml
- date: 2026-11-04
  title: "Asago Tech Recap"
  description: "Weekly engineering recap."
  url: /presentations/rh/asago/tech-meeting-26-11-04/slides.html
```

The repository `abeltramo.github.io` carries `scripts/sync-presentations.mjs`.
The script reads a Marp source tree and writes the file. Run it after you add
a deck:

```sh
node scripts/sync-presentations.mjs --repo ../presentations
```

The script takes the date from the deck folder when the name ends in `-YY-MM-DD`,
then from the `date` key in the deck, then from the last git commit. It keeps
the descriptions that are already in the file. The build itself needs no
access to the other repository.

## Layouts

| File | Page |
| --- | --- |
| `layouts/_default/baseof.html` | Frame for every page: sky, hero, rock face, footer. |
| `layouts/_default/index.html` | Home timeline. Books left, everything else right. |
| `layouts/_default/list.html` | Section and tag pages. Date left, entry right. |
| `layouts/_default/single.html` | A post or a note. |
| `layouts/_default/terms.html` | The list of tags. |
| `layouts/books/list.html` | The reading list. |
| `layouts/404.html` | Off route. |

The timeline markup comes from Hugo, so a page renders without JavaScript.
The cable is the only part that needs the browser.

## The cable

`assets/js/timeline.js` finds every element with the `data-timeline`
attribute, measures the centre of each `.tl-node`, and threads one Catmull-Rom
curve through those points. Later it samples the curve and weaves two sine
waves around it. The waves are the twisted strands.

The engine reads the layout, so the cable follows the content. Change the
`--left-w` and `--cable-gap` custom properties and the cable moves with the
rows.

## Icon and share image

`static/favicon.svg` is the source of the icon: a dark tile, a pale ridge and
an amber summit with the cable below it. `favicon.png` (64 px) and
`apple-touch-icon.png` (180 px) come from it:

```sh
rsvg-convert -w 64 -h 64 static/favicon.svg -o static/favicon.png
rsvg-convert -w 180 -h 180 static/favicon.svg -o static/apple-touch-icon.png
```

`static/og-image.png` is a 1200x630 render of the home page look: sky, stars,
ridgelines, the brand and the tagline. Render it again when the tagline
changes.

## Colours

The palette lives at the top of `assets/css/descent.css`:

| Group | Variables |
| --- | --- |
| Text | `--ink`, `--ink-dim`, `--ink-faint` |
| Cable | `--cable`, `--cable-hi`, `--cable-lo`, `--cable-dark` |
| Metal | `--metal-1` to `--metal-4`, `--sleeve-1` to `--sleeve-3` |
| Entry kinds | `--kind-post`, `--kind-note`, `--kind-slides`, `--kind-book` |

The rock face gradient and the ridgeline colours sit in the same file.

## Preview the example site

```sh
cd exampleSite
hugo server --themesDir ../..
```

## Licence

MIT.
