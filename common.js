// common.js – code partagé par les pages : config, données des séries, couvertures, progression de lecture

const PROD_CONFIG = {
  URL_CDN: "https://cdn.teamscanr.fr/",
  URL_API_IMGCHEST: "https://api.teamscanr.fr/imgchest",
};

// En local uniquement, un config-dev.json (ignoré par git) peut surcharger la config de prod
const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
let configPromise;
export const loadConfig = () =>
  (configPromise ??= isLocal
    ? fetch("/config-dev.json")
        .then((res) => (res.ok ? res.json() : PROD_CONFIG))
        .catch(() => PROD_CONFIG)
    : Promise.resolve(PROD_CONFIG));

const fetchJSON = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} en récupérant ${url}`);
  return res.json();
};

/* ===== Données des séries ======================================== */

// catalog.json (généré par le dépôt cub à chaque synchro R2) regroupe toutes les séries en une requête.
// S'il est absent, on retombe sur index.json + une requête par série.
async function fetchAllSeries() {
  const { URL_CDN } = await loadConfig();
  const catalog = await fetchJSON(`${URL_CDN}catalog.json`).catch(() => null);
  const entries = catalog?.series
    ? Object.entries(catalog.series)
    : await Promise.all(
        Object.entries(await fetchJSON(`${URL_CDN}index.json`)).map(
          async ([slug, fileName]) => [slug, await fetchJSON(`${URL_CDN}${fileName}`)]
        )
      );
  return entries.map(([slug, serie]) => ({
    ...serie,
    slug: serie.slug || slug,
    urlSerie: `/${slug}`,
  }));
}

// Partagé entre l'accueil et la recherche : les séries ne sont chargées qu'une fois par page
let seriesPromise;
export const loadAllSeries = () =>
  (seriesPromise ??= fetchAllSeries().catch((err) => {
    seriesPromise = null;
    throw err;
  }));

// Renvoie null si le slug n'existe pas
export async function loadSerie(slug) {
  const { URL_CDN } = await loadConfig();
  const index = await fetchJSON(`${URL_CDN}index.json`);
  if (!index[slug]) return null;
  return fetchJSON(`${URL_CDN}${index[slug]}`);
}

export const getStatusLabel = (serie) => {
  if (serie.os) return "One-shot";
  return serie.completed ? "Terminée" : "En cours";
};

/* ===== Couvertures =============================================== */

// Les couvertures imgchest sont en taille originale (jusqu'à 15 Mo) : on passe par wsrv.nl
// pour servir des miniatures WebP redimensionnées, avec repli sur l'original en cas d'erreur.
export const thumbUrl = (url, width) =>
  `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp`;

export const escapeAttr = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");

export function coverImg(url, alt, { width, sizes, eager = false }) {
  return `<img
    src="${thumbUrl(url, width)}"
    srcset="${thumbUrl(url, width)} ${width}w, ${thumbUrl(url, width * 2)} ${width * 2}w"
    sizes="${sizes}"
    data-original="${escapeAttr(url)}"
    onerror="this.onerror=null;this.removeAttribute('srcset');this.src=this.dataset.original"
    loading="${eager ? "eager" : "lazy"}"
    decoding="async"
    alt="${escapeAttr(alt)}">`;
}

/* ===== Progression de lecture ==================================== */

// Écrite par cubari/override.js dans le lecteur (même origine) :
// { [slug]: { chapter: "12", page: 3, read: ["1", "2", ...], at: <timestamp> } }
const PROGRESS_KEY = "scanr-progress";

export function readProgress(slug) {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}")[slug] || null;
  } catch {
    return null;
  }
}
