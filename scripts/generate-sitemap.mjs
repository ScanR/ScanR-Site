// Régénère sitemap.xml à partir des séries publiées sur le CDN (lancé par .github/workflows/sitemap.yml)
// Usage : node scripts/generate-sitemap.mjs
import { writeFileSync } from "node:fs";

const SITE = "https://teamscanr.fr";
const CDN = "https://cdn.teamscanr.fr/";

const fetchJSON = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} en récupérant ${url}`);
  return res.json();
};

const index = await fetchJSON(`${CDN}index.json`);
const series = await Promise.all(
  Object.entries(index).map(async ([slug, fileName]) => [slug, await fetchJSON(`${CDN}${fileName}`)])
);

// Les séries cachées (Konami code) ne sont pas référencées
const slugs = series
  .filter(([, serie]) => !serie.konami)
  .map(([slug]) => slug)
  .sort();

const urls = ["", ...slugs]
  .map((path) => `  <url>\n    <loc>${SITE}/${path}</loc>\n  </url>`)
  .join("\n");

writeFileSync(
  "sitemap.xml",
  `<?xml version="1.0" encoding="utf-8" standalone="yes" ?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
);
console.log(`sitemap.xml : ${slugs.length} séries`);
