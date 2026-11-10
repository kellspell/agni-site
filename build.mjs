// Builds the landing page in every language from src/page.html and src/locales/*.json.
// English is index.html; the others go in their own folders (pt-br/index.html, …),
// so each language has its own address that search engines can index.
//
// Usage: node build.mjs        (no dependencies)
// It stops without writing anything if a language is missing a text, or if its
// markup (<strong>, <em>, <code>) or placeholders ({os}) differ from English.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = dirname(new URL(import.meta.url).pathname);
const SITE = "https://agniappstudio.com/";

const LANGS = [
  { code: "en", file: "en", path: "", name: "English", short: "EN", og: "en_US" },
  { code: "pt-BR", file: "pt-BR", path: "pt-br/", name: "Português (Brasil)", short: "PT", og: "pt_BR" },
  { code: "es", file: "es", path: "es/", name: "Español", short: "ES", og: "es_ES" },
  { code: "fr", file: "fr", path: "fr/", name: "Français", short: "FR", og: "fr_FR" },
  { code: "de", file: "de", path: "de/", name: "Deutsch", short: "DE", og: "de_DE" },
  { code: "ar", file: "ar", path: "ar/", name: "العربية", short: "ع", og: "ar_AR", rtl: true, font: "Noto Sans Arabic" },
  { code: "hi", file: "hi", path: "hi/", name: "हिन्दी", short: "हि", og: "hi_IN", font: "Noto Sans Devanagari" },
];

const template = readFileSync(join(ROOT, "src/page.html"), "utf8");
const load = (file) => JSON.parse(readFileSync(join(ROOT, `src/locales/${file}.json`), "utf8"));
const en = load("en");

const tags = (s) => [...s.matchAll(/<\/?(\w+)[^>]*>/g)].map((m) => m[0].replace(/\s.*>/, ">")).sort().join(" ");
const slots = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(" ");

let problems = 0;
const pages = [];
for (const lang of LANGS) {
  const t = load(lang.file);
  for (const key of Object.keys(en)) {
    if (typeof t[key] !== "string" || !t[key].trim()) {
      console.log(`${lang.file}: missing ${key}`);
      problems++;
    } else if (tags(t[key]) !== tags(en[key]) || slots(t[key]) !== slots(en[key])) {
      console.log(`${lang.file}: ${key} has different markup or placeholders from English`);
      problems++;
    }
  }
  for (const key of Object.keys(t)) {
    if (!(key in en)) {
      console.log(`${lang.file}: extra key ${key}`);
      problems++;
    }
  }
  pages.push({ lang, t });
}
const usedKeys = new Set([...template.matchAll(/\{\{([\w.]+)\}\}/g)].map((m) => m[1]));
for (const key of Object.keys(en)) {
  if (!usedKeys.has(key) && !key.startsWith("script.") && key !== "header.language") {
    console.log(`en: ${key} isn't used in src/page.html`);
    problems++;
  }
}
if (problems) {
  console.log(`\n${problems} problem(s); nothing was written.`);
  process.exit(1);
}

const alternates = [
  ...LANGS.map((l) => `<link rel="alternate" hreflang="${l.code}" href="${SITE}${l.path}">`),
  `<link rel="alternate" hreflang="x-default" href="${SITE}">`,
].join("\n");

/** On the English home page only: first-time visitors go to their browser's language. */
const autoRedirect = `const saved = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
  if (!saved && (location.pathname === "/" || location.pathname === "/index.html")) {
    const PAGES = ${JSON.stringify(Object.fromEntries(LANGS.map((l) => [l.code.toLowerCase(), l.path])))};
    for (const wanted of navigator.languages || [navigator.language]) {
      const w = wanted.toLowerCase();
      const code = w in PAGES ? w : Object.keys(PAGES).find((c) => c.split("-")[0] === w.split("-")[0]);
      if (code) {
        if (PAGES[code]) location.replace("/" + PAGES[code] + location.hash);
        break;
      }
    }
  }`;

for (const { lang, t } of pages) {
  const switcher = `<details class="lang">
        <summary aria-label="${t["header.language"]}" title="${t["header.language"]}">🌐 ${lang.short}</summary>
        <ul>
${LANGS.map((l) => `          <li><a href="/${l.path}" hreflang="${l.code}" lang="${l.code}"${l === lang ? ' aria-current="true"' : ""}>${l.name}</a></li>`).join("\n")}
        </ul>
      </details>`;
  const fontFamily = lang.font?.replace(/ /g, "+");
  const special = {
    lang: lang.code,
    dir: lang.rtl ? "rtl" : "ltr",
    url: SITE + lang.path,
    ogLocale: lang.og,
    alternates,
    switcher,
    fonts: lang.font
      ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fontFamily}:wght@400;500;600;700;800&display=swap">`
      : "",
    // Latin text keeps the page's fonts; the language's own letters come from its Noto font.
    fontVars: lang.font
      ? `:root {
  --font-display: "Bricolage Grotesque", "${lang.font}", "Segoe UI", sans-serif;
  --font-body: "Figtree", "${lang.font}", "Segoe UI", system-ui, sans-serif;
}`
      : "",
    scriptStrings: JSON.stringify(
      Object.fromEntries(Object.entries(t).filter(([k]) => k.startsWith("script.")).map(([k, v]) => [k.slice(7), v])),
    ),
    autoRedirect: lang.code === "en" ? autoRedirect : "",
  };
  let html = template
    .replace(/\{\{@(\w+)\}\}/g, (_, k) => special[k])
    .replace(/\{\{([\w.]+)\}\}/g, (_, k) => t[k].replace(/"/g, "&quot;"));
  const left = html.match(/\{\{[^}]*\}\}/);
  if (left) throw new Error(`${lang.file}: unfilled ${left[0]}`);
  // The escaped quotes are only needed inside attributes; text reads the same either way.
  const out = join(ROOT, lang.path, "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log(`wrote ${lang.path || ""}index.html (${lang.name})`);
}
