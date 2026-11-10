# Agni AI App Studio website

The landing page for Agni AI App Studio, served by GitHub Pages at <https://agniappstudio.com/>.

It's built in seven languages from one template:

- `src/page.html`: the page, with `{{keys}}` where text goes
- `src/locales/*.json`: the text for each language (`en.json` is the reference)
- `build.mjs`: writes `index.html` (English) and `pt-br/`, `es/`, `fr/`, `de/`, `ar/`, `hi/`

To change the page, edit those files, then run `node build.mjs` and push to `main`.
The build stops without writing anything if a language is missing a text, or if its
markup or placeholders differ from English. Don't edit the generated `index.html`
files directly; the next build overwrites them.

First-time visitors to the home page are sent to their browser's language; choosing
a language in the 🌐 menu is remembered.
