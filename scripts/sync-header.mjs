// Recopie _partials/header.html dans chaque page, entre <!-- header:start --> et <!-- header:end -->.
// Le site est statique (sans build) : on garde le header en dur dans les pages pour qu'il s'affiche
// sans attendre le JavaScript, mais on ne le modifie qu'à un seul endroit.
//   node scripts/sync-header.mjs           → met les pages à jour
//   node scripts/sync-header.mjs --check   → échoue si une page n'est pas à jour (vérifié par la CI)
import { readFile, writeFile } from "node:fs/promises";

const PAGES = ["index.html", "serie.html", "404.html"];
const START = "<!-- header:start -->";
const END = "<!-- header:end -->";
const check = process.argv.includes("--check");

const partial = (await readFile(new URL("../_partials/header.html", import.meta.url), "utf8"))
  .replace(/\r\n/g, "\n")
  .trimEnd();

const stale = [];
for (const page of PAGES) {
  const url = new URL(`../${page}`, import.meta.url);
  const html = await readFile(url, "utf8");
  const start = html.indexOf(START);
  const end = html.indexOf(END);
  if (start < 0 || end < start) throw new Error(`${page} : marqueurs ${START} / ${END} introuvables`);

  // Garde les fins de ligne de la page (certaines sont en CRLF)
  const eol = html.includes("\r\n") ? "\r\n" : "\n";
  const updated =
    html.slice(0, start + START.length) + eol + partial.replace(/\n/g, eol) + eol + "    " + html.slice(end);
  if (updated === html) continue;
  stale.push(page);
  if (!check) await writeFile(url, updated);
}

if (check && stale.length) {
  console.error(`Header pas à jour dans : ${stale.join(", ")}. Lancez « node scripts/sync-header.mjs ».`);
  process.exit(1);
}
console.log(stale.length ? `Header mis à jour : ${stale.join(", ")}` : "Header déjà à jour partout.");
